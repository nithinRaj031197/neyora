import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { QrLanding } from '@/components/public/QrLanding'
import { getSiteSettings } from '@/lib/content/site'
import {
  DEFAULT_QR_DESTINATION,
  isSafeDestination,
  registerScan,
  resolveRedirect,
} from '@/lib/content/redirects'
import { recordEvent } from '@/lib/analytics/server'

/**
 * Namespaced QR codes: /go/200g, /go/spring, /go/wholesale.
 *
 * Lets a pack size, a batch or a campaign have its own re-pointable link
 * without inventing a new URL scheme. An unknown key falls back to whatever
 * plain /go currently points at, so a mis-printed or retired code still lands
 * somewhere sensible.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'NEYORA',
  robots: { index: false, follow: false },
}

export default async function GoPathPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params

  // Normalise, and refuse anything that is not a plain key — the value goes
  // into a database lookup and must not be able to carry a traversal attempt.
  const key = path
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => /^[a-z0-9-]+$/.test(segment))
    .join('/')

  const source = key ? `go/${key}` : 'go'
  const settings = await getSiteSettings()

  let row = await resolveRedirect(source)
  let matchedSource = source

  if (!row && source !== 'go') {
    row = await resolveRedirect('go')
    matchedSource = 'go'
  }

  await Promise.all([
    registerScan(matchedSource),
    recordEvent({
      eventName: 'qr_scan',
      path: `/${source}`,
      props: {
        source: matchedSource,
        requested: source,
        destination: row?.destination ?? DEFAULT_QR_DESTINATION,
      },
    }),
  ])

  if (!row || !isSafeDestination(row.destination)) {
    redirect(DEFAULT_QR_DESTINATION)
  }

  if (row.landing_title) {
    return <QrLanding redirect={row} settings={settings} />
  }

  redirect(row.destination)
}

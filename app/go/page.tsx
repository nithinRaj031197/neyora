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
 * /go — the URL printed on every NEYORA pack.
 *
 * Never cached: the whole point is that an admin can change where it leads,
 * and a cached response would keep sending scanners to last season's page.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'NEYORA',
  // A QR landing has no business in search results; it is a doorway.
  robots: { index: false, follow: false },
}

export default async function GoPage() {
  const [settings, row] = await Promise.all([getSiteSettings(), resolveRedirect('go')])

  // Count the scan before doing anything that throws (redirect() throws).
  await Promise.all([
    registerScan('go'),
    recordEvent({
      eventName: 'qr_scan',
      path: '/go',
      props: { source: 'go', destination: row?.destination ?? DEFAULT_QR_DESTINATION },
    }),
  ])

  // No row, disabled, or an unsafe destination that slipped past the DB
  // constraint: send them somewhere useful rather than showing an error.
  if (!row || !isSafeDestination(row.destination)) {
    redirect(DEFAULT_QR_DESTINATION)
  }

  if (row.landing_title) {
    return <QrLanding redirect={row} settings={settings} />
  }

  redirect(row.destination)
}

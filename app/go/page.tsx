import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { QrLanding } from '@/components/public/QrLanding'
import { getQrDestination, getSiteSettings } from '@/lib/content'

/**
 * /go — the URL printed on every NEYORA pack.
 *
 * The printed code never changes. Where it *leads* is content, and can be
 * changed two ways:
 *
 *   • edit `qr.destination` in content/site.yml and deploy, or
 *   • set NEYORA_QR_DESTINATION in the Cloudflare dashboard, which takes
 *     effect immediately with no redeploy at all.
 *
 * That second route is what preserves the promise the packaging makes: a
 * seasonal campaign, a new recipe collection or a product swap costs a
 * dashboard edit, never a print run.
 *
 * Never cached — a cached QR redirect would keep sending scanners to last
 * season's page, defeating the entire point.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'NEYORA',
  // A doorway has no business in search results.
  robots: { index: false, follow: false },
}

export default function GoPage() {
  const settings = getSiteSettings()
  const destination = getQrDestination()

  // Optional interstitial: useful for a seasonal note that would otherwise
  // flash past. Blank title means redirect immediately.
  if (settings.qr.landingTitle) {
    return <QrLanding settings={settings} destination={destination} />
  }

  redirect(destination)
}

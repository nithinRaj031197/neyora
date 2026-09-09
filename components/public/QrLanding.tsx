import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon } from '@/components/ui/Icon'
import { ViewTracker } from './ViewTracker'
import type { RedirectRow, SiteSettingsRow } from '@/types/database'

/**
 * The QR landing interstitial.
 *
 * Shown instead of an instant redirect when an admin has filled in a landing
 * title — useful for a seasonal message that would otherwise flash past.
 *
 * Built for one thumb in a kitchen: single column, `min-h-dvh` so it fills a
 * mobile viewport exactly, 56px touch targets, and the primary action within
 * reach of the bottom of the screen. No horizontal scroll at 320px.
 */
export function QrLanding({
  redirect,
  settings,
}: {
  redirect: RedirectRow
  settings: SiteSettingsRow
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-forest px-6 pt-14 pb-10 text-ivory">
      <ViewTracker event="qr_scan" props={{ source: redirect.source, landing: true }} />

      <div className="flex flex-1 flex-col justify-center">
        <Wordmark
          brandName={settings.brand_name}
          tagline={settings.tagline}
          invert
          showTagline
          className="text-3xl"
        />

        <h1 className="mt-12 max-w-[18ch] text-(length:--text-display-md) text-ivory">
          {redirect.landing_title}
        </h1>

        {redirect.landing_body ? (
          <p className="mt-6 max-w-[38ch] text-[1.0625rem] leading-relaxed text-ivory/75">
            {redirect.landing_body}
          </p>
        ) : null}
      </div>

      <div className="mt-12 flex flex-col gap-3">
        <Link
          href={redirect.destination}
          className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xs bg-ivory px-6 text-[0.9375rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:bg-beige-soft"
        >
          Continue
          <Icon name="arrow-right" size={18} />
        </Link>
        <Link
          href="/"
          className="inline-flex h-14 items-center justify-center rounded-xs border border-ivory/30 px-6 text-[0.875rem] font-medium tracking-[0.04em] text-ivory/85 uppercase transition-colors hover:border-ivory/60 hover:text-ivory"
        >
          Explore {settings.brand_name}
        </Link>
      </div>
    </main>
  )
}

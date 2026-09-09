import type { ReactNode } from 'react'
import Script from 'next/script'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { getSiteSettings, getSocialLinks } from '@/lib/content'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonld'
import { publicEnv } from '@/lib/env'

/**
 * Public site shell.
 *
 * Organization and WebSite JSON-LD live here rather than on each page, so
 * every URL carries the entity graph and per-page schemas can reference it by
 * @id instead of repeating it.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const settings = getSiteSettings()
  const socials = getSocialLinks()
  const { analyticsProvider, analyticsScriptUrl, analyticsSiteId } = publicEnv()

  const analyticsEnabled =
    analyticsProvider !== 'none' && Boolean(analyticsScriptUrl && analyticsSiteId)

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col">
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>

      <JsonLd data={[organizationJsonLd(settings, socials), websiteJsonLd(settings)]} />

      {/*
        No third-party JavaScript ships unless a privacy-friendly provider is
        explicitly configured. The default is nothing at all.
      */}
      {analyticsEnabled ? (
        <Script
          src={analyticsScriptUrl}
          strategy="afterInteractive"
          defer
          {...(analyticsProvider === 'umami'
            ? { 'data-website-id': analyticsSiteId }
            : { 'data-domain': analyticsSiteId })}
        />
      ) : null}
    </>
  )
}

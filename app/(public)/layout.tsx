import type { ReactNode } from 'react'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'
import { AnalyticsScript } from '@/components/public/AnalyticsScript'
import { JsonLd } from '@/components/ui/JsonLd'
import { getSiteSettings, getSocialLinks, getMediaByIds } from '@/lib/content/site'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonld'
import { SetupNotice } from '@/components/public/SetupNotice'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * Public site shell.
 *
 * Organization and WebSite JSON-LD live here rather than on each page, so
 * every URL carries the entity graph and per-page schemas can reference it by
 * @id instead of repeating it.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />
  }

  const [settings, socials] = await Promise.all([getSiteSettings(), getSocialLinks()])
  const media = await getMediaByIds([settings.default_og_image_id])
  const logo = settings.default_og_image_id
    ? media.get(settings.default_og_image_id) ?? null
    : null

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
      <JsonLd data={[organizationJsonLd(settings, socials, logo), websiteJsonLd(settings)]} />
      <AnalyticsScript />
    </>
  )
}

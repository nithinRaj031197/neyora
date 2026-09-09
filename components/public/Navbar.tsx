import Link from 'next/link'
import { getSiteSettings, whatsappLink } from '@/lib/content/site'
import { Wordmark } from '@/components/ui/Wordmark'
import { Container } from '@/components/ui/Container'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'
import { PRIMARY_NAV } from './nav-links'

/**
 * Site header. Server component — only the mobile drawer and the active-link
 * highlight ship JavaScript.
 *
 * Deliberately not sticky-and-frosted: guidelines §4 rules out glassmorphism
 * and frosted navbars. It is a plain header on ivory with a hairline rule.
 */
export async function Navbar() {
  const settings = await getSiteSettings()
  const whatsapp = whatsappLink(settings)

  return (
    <>
      {settings.announcement_enabled && settings.announcement_text ? (
        <div className="bg-forest text-ivory">
          <Container className="flex min-h-10 items-center justify-center py-2 text-center">
            {settings.announcement_href ? (
              <Link
                href={settings.announcement_href}
                className="text-[0.8125rem] tracking-wide underline decoration-ivory/40 underline-offset-4 transition-colors hover:decoration-ivory"
              >
                {settings.announcement_text}
              </Link>
            ) : (
              <p className="text-[0.8125rem] tracking-wide">{settings.announcement_text}</p>
            )}
          </Container>
        </div>
      ) : null}

      <header
        className="sticky top-0 z-50 border-b border-beige bg-ivory/98 backdrop-blur-none"
        style={{ ['--nav-height' as string]: '4.25rem' }}
      >
        <Container size="wide" className="flex h-17 items-center justify-between gap-6">
          <Link
            href="/"
            className="shrink-0 rounded-xs py-1"
            aria-label={`${settings.brand_name} — home`}
          >
            <Wordmark
              brandName={settings.brand_name}
              tagline={settings.tagline}
              className="text-[1.375rem] sm:text-2xl"
              showTagline
            />
          </Link>

          <NavLinks links={PRIMARY_NAV} />

          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="hidden h-10 items-center rounded-xs border border-forest/35 px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5 sm:inline-flex"
            >
              Contact
            </Link>
            <MobileNav
              links={PRIMARY_NAV}
              whatsappHref={whatsapp?.href ?? null}
              brandName={settings.brand_name}
            />
          </div>
        </Container>
      </header>
    </>
  )
}

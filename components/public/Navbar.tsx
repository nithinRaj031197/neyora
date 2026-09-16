import Link from 'next/link'
import { getSiteSettings, whatsappLink } from '@/lib/content'
import { Wordmark } from '@/components/ui/Wordmark'
import { Container } from '@/components/ui/Container'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'
import { PRIMARY_NAV } from './nav-links'
import { HeaderFrame } from './HeaderFrame'

/**
 * Site header.
 *
 * Deliberately not sticky-and-frosted: the brand guidelines rule out
 * glassmorphism and frosted navbars. A plain header on ivory with a hairline
 * rule.
 *
 * It does earn one piece of motion. At the top of the page the hairline is
 * absent, so the header sits quietly on the hero photograph; once the reader
 * has scrolled past the hero it fades in and the header reads as attached to
 * the page. That is a tone change, not a backdrop-filter — see globals.css §4.
 * A reading-progress rule runs along the very top on the same timeline.
 */
export function Navbar() {
  const settings = getSiteSettings()
  const whatsapp = whatsappLink()
  const announcement = settings.announcement

  return (
    <>
      {announcement?.enabled && announcement.text ? (
        <div className="bg-forest text-ivory">
          <Container className="flex min-h-10 items-center justify-center py-2 text-center">
            {announcement.href ? (
              <Link
                href={announcement.href}
                className="text-[0.8125rem] tracking-wide underline decoration-ivory/40 underline-offset-4 transition-colors hover:decoration-ivory"
              >
                {announcement.text}
              </Link>
            ) : (
              <p className="text-[0.8125rem] tracking-wide">{announcement.text}</p>
            )}
          </Container>
        </div>
      ) : null}

      <HeaderFrame>
        {/*
          Both of these are decoration and are hidden from assistive tech: the
          progress rule duplicates the scrollbar, and the hairline carries no
          information a sighted reader does not already have from the layout.
          Where scroll-driven animation is unsupported, the hairline is simply
          always present and the progress rule is not rendered at all.
        */}
        <div
          aria-hidden="true"
          className="scroll-progress neyora-rule absolute inset-x-0 top-0 h-0.5"
        />
        <div
          aria-hidden="true"
          className="nav-settle pointer-events-none absolute inset-x-0 bottom-0 h-px bg-beige"
        />
        <Container size="wide" className="flex h-17 items-center justify-between gap-6">
          <Link
            href="/"
            className="shrink-0 rounded-xs py-1"
            aria-label={`${settings.brandName} — home`}
          >
            <Wordmark
              brandName={settings.brandName}
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
              brandName={settings.brandName}
            />
          </div>
        </Container>
      </HeaderFrame>
    </>
  )
}

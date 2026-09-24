import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { FOOTER_NAV } from './nav-links'
import { formattedAddress, getSiteSettings, getSocialLinks, whatsappLink } from '@/lib/content'

/**
 * Footer.
 *
 * Every string here — tagline, contact details, social links, copyright
 * holder — comes from content/site.yml. Changing the Instagram URL is a
 * one-line edit, not a code change.
 */
export async function Footer() {
  const settings = await getSiteSettings()
  const socials = await getSocialLinks()
  const whatsapp = await whatsappLink()
  const address = await formattedAddress()
  const year = new Date().getFullYear()

  const linkClass = 'transition-colors hover:text-ivory'

  return (
    <footer className="mt-auto border-t border-forest-soft bg-forest text-ivory">
      <Container size="wide" className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Wordmark
              brandName={settings.brandName}
              tagline={settings.tagline}
              invert
              showTagline
              className="text-3xl"
            />
            {settings.footerTagline ? (
              <p className="mt-7 max-w-[34ch] font-display text-xl leading-snug text-ivory/90">
                {settings.footerTagline}
              </p>
            ) : null}
            {settings.footerNote ? (
              <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ivory/60">
                {settings.footerNote}
              </p>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-2.5">
                {socials.map((social) => (
                  <li key={social.platform}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${settings.brandName} on ${social.label}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xs border border-ivory/25 text-ivory/80 transition-colors hover:border-ivory/70 hover:text-ivory"
                    >
                      <Icon name={socialIconName(social.platform)} size={19} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {FOOTER_NAV.map((group) => (
              <nav key={group.heading} aria-labelledby={`footer-${group.heading}`}>
                <h2
                  id={`footer-${group.heading}`}
                  className="font-sans text-[0.6875rem] font-semibold tracking-[0.18em] text-leaf uppercase"
                >
                  {group.heading}
                </h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.9375rem] text-ivory/70 transition-colors hover:text-ivory"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div className="sm:col-span-2 lg:col-span-1">
              <h2 className="font-sans text-[0.6875rem] font-semibold tracking-[0.18em] text-leaf uppercase">
                Get in touch
              </h2>
              <ul className="mt-5 flex flex-col gap-3 text-[0.9375rem] text-ivory/70">
                {whatsapp ? (
                  <li>
                    <a
                      href={whatsapp.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 ${linkClass}`}
                    >
                      <Icon name="whatsapp" size={17} />
                      WhatsApp
                    </a>
                  </li>
                ) : null}
                {settings.contactEmail ? (
                  <li>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className={`inline-flex items-center gap-2 break-all ${linkClass}`}
                    >
                      <Icon name="mail" size={17} />
                      {settings.contactEmail}
                    </a>
                  </li>
                ) : null}
                {settings.contactPhone ? (
                  <li>
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}
                      className={`inline-flex items-center gap-2 ${linkClass}`}
                    >
                      <Icon name="phone" size={17} />
                      {settings.contactPhone}
                    </a>
                  </li>
                ) : null}
                {address.length > 0 ? (
                  <li className="flex items-start gap-2">
                    <Icon name="pin" size={17} className="mt-1" />
                    <address className="not-italic">
                      {address.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </li>
                ) : null}
                {settings.businessHours ? (
                  <li className="flex items-start gap-2">
                    <Icon name="clock" size={17} className="mt-1" />
                    <span>{settings.businessHours}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        <hr className="neyora-rule mt-16" />

        <div className="mt-7 flex flex-col gap-3 text-[0.8125rem] text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.copyrightHolder || settings.brandName}. All rights reserved.
          </p>
          <p>{settings.tagline}</p>
        </div>
      </Container>
    </footer>
  )
}

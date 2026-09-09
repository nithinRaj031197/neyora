import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { TrackedLink } from './TrackedLink'
import { FOOTER_NAV } from './nav-links'
import { formattedAddress, getSiteSettings, getSocialLinks, whatsappLink } from '@/lib/content/site'

/**
 * Footer.
 *
 * Every string here — tagline, contact details, social links, copyright
 * holder — is read from `site_settings` and `social_links`. Changing the
 * Instagram URL is an admin edit, not a deploy.
 */
export async function Footer() {
  const [settings, socials] = await Promise.all([getSiteSettings(), getSocialLinks()])
  const whatsapp = whatsappLink(settings)
  const address = formattedAddress(settings)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-forest-soft bg-forest text-ivory">
      <Container size="wide" className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Wordmark
              brandName={settings.brand_name}
              tagline={settings.tagline}
              invert
              showTagline
              className="text-3xl"
            />
            {settings.footer_tagline ? (
              <p className="mt-7 max-w-[34ch] font-display text-xl leading-snug text-ivory/90">
                {settings.footer_tagline}
              </p>
            ) : null}
            {settings.footer_note ? (
              <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ivory/60">
                {settings.footer_note}
              </p>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-2.5">
                {socials.map((social) => (
                  <li key={social.id}>
                    <TrackedLink
                      href={social.url}
                      event="social_click"
                      props={{ platform: social.platform }}
                      ariaLabel={`${settings.brand_name} on ${social.label}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xs border border-ivory/25 text-ivory/80 transition-colors hover:border-ivory/70 hover:text-ivory"
                    >
                      <Icon name={socialIconName(social.platform)} size={19} />
                    </TrackedLink>
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
                    <TrackedLink
                      href={whatsapp.href}
                      event="whatsapp_click"
                      props={{ location: 'footer' }}
                      className="inline-flex items-center gap-2 transition-colors hover:text-ivory"
                    >
                      <Icon name="whatsapp" size={17} />
                      WhatsApp
                    </TrackedLink>
                  </li>
                ) : null}
                {settings.contact_email ? (
                  <li>
                    <TrackedLink
                      href={`mailto:${settings.contact_email}`}
                      event="contact_click"
                      props={{ method: 'email', location: 'footer' }}
                      className="inline-flex items-center gap-2 break-all transition-colors hover:text-ivory"
                    >
                      <Icon name="mail" size={17} />
                      {settings.contact_email}
                    </TrackedLink>
                  </li>
                ) : null}
                {settings.contact_phone ? (
                  <li>
                    <TrackedLink
                      href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}
                      event="contact_click"
                      props={{ method: 'phone', location: 'footer' }}
                      className="inline-flex items-center gap-2 transition-colors hover:text-ivory"
                    >
                      <Icon name="phone" size={17} />
                      {settings.contact_phone}
                    </TrackedLink>
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
                {settings.business_hours ? (
                  <li className="flex items-start gap-2">
                    <Icon name="clock" size={17} className="mt-1" />
                    <span>{settings.business_hours}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        <hr className="neyora-rule mt-16" />

        <div className="mt-7 flex flex-col gap-3 text-[0.8125rem] text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.copyright_holder || settings.brand_name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span>{settings.tagline}</span>
          </p>
        </div>
      </Container>
    </footer>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import {
  formattedAddress,
  getPageBySlug,
  getSiteSettings,
  getSocialLinks,
  whatsappLink,
} from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'

const TRAIL = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

export function generateMetadata(): Metadata {
  const page = getPageBySlug('contact-intro')
  return buildMetadata({
    title: page?.title || 'Contact',
    description:
      page?.subtitle ||
      'Reach NEYORA by WhatsApp, phone or email. Wholesale, kitchen supply and farm visits.',
    path: '/contact',
    seo: page?.seo,
    settings: getSiteSettings(),
  })
}

export default function ContactPage() {
  const settings = getSiteSettings()
  const socials = getSocialLinks()
  const page = getPageBySlug('contact-intro')

  const whatsapp = whatsappLink()
  const address = formattedAddress()

  /*
   * Every channel comes from content/site.yml. An empty setting removes the
   * row entirely rather than rendering a link to nowhere.
   */
  const channels = [
    whatsapp && {
      key: 'whatsapp',
      icon: 'whatsapp' as const,
      label: 'WhatsApp',
      value: whatsapp.display,
      href: whatsapp.href,
      note: 'Fastest for orders and quick questions',
    },
    settings.contactPhone && {
      key: 'phone',
      icon: 'phone' as const,
      label: 'Phone',
      value: settings.contactPhone,
      href: `tel:${settings.contactPhone.replace(/\s/g, '')}`,
      note: settings.businessHours,
    },
    settings.contactEmail && {
      key: 'email',
      icon: 'mail' as const,
      label: 'Email',
      value: settings.contactEmail,
      href: `mailto:${settings.contactEmail}`,
      note: 'Best for anything detailed',
    },
  ].filter((c): c is Exclude<typeof c, null | undefined | false | ''> => Boolean(c))

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-14 lg:pt-14">
          <Breadcrumbs trail={TRAIL} />
          <p className="eyebrow mt-9">{page?.eyebrow ?? 'Get in touch'}</p>
          <h1 className="mt-4 max-w-[22ch] text-(length:--text-display-lg)">
            {page?.title ?? 'Contact'}
          </h1>
          {page?.subtitle ? (
            <p className="mt-6 max-w-[54ch] text-[1.125rem] leading-relaxed text-earth-soft">
              {page.subtitle}
            </p>
          ) : null}
        </Container>
      </header>

      <Container size="wide" className="py-(--spacing-section-sm)">
        <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20">
          <div>
            {page?.body?.trim() ? (
              <MarkdownRenderer content={page.body} variant="compact" className="mb-12 max-w-[62ch]" />
            ) : null}

            {/*
              No form, and deliberately so. A form needs somewhere to send to,
              which would mean a database or a paid form service. WhatsApp and
              email are what customers already use, reach a real person faster,
              and cost nothing to run.
            */}
            <h2 className="text-(length:--text-display-sm)">How to reach us</h2>
            <p className="mt-5 max-w-[58ch] text-[1.0625rem] leading-relaxed text-earth-soft">
              WhatsApp is genuinely the fastest route for orders and quick questions. For anything
              longer — wholesale, a kitchen supply enquiry, a farm visit — email gives us room to
              answer properly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {whatsapp ? (
                <a
                  href={whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xs border border-forest bg-forest px-7 text-[0.9375rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  <Icon name="whatsapp" size={19} />
                  Message on WhatsApp
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xs border border-forest/35 px-7 text-[0.9375rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
                >
                  <Icon name="mail" size={19} />
                  Email us
                </a>
              ) : null}
            </div>

            <p className="mt-6 text-[0.8125rem] leading-relaxed text-earth-muted">
              We read everything and reply within a working day. See our{' '}
              <Link
                href="/privacy"
                className="underline decoration-earth-muted/40 underline-offset-2 hover:decoration-earth-muted"
              >
                privacy policy
              </Link>
              .
            </p>
          </div>

          <aside className="flex flex-col gap-10">
            {channels.length > 0 ? (
              <section aria-labelledby="channels-heading">
                <h2 id="channels-heading" className="eyebrow">
                  Ways to reach us
                </h2>
                <ul className="mt-5 flex flex-col">
                  {channels.map((channel) => (
                    <li key={channel.key} className="border-b border-beige last:border-b-0">
                      <a
                        href={channel.href}
                        className="flex items-start gap-3.5 py-4 transition-colors hover:text-forest"
                      >
                        <Icon name={channel.icon} size={19} className="mt-0.5 text-leaf" />
                        <span className="min-w-0">
                          <span className="block text-[0.75rem] font-medium tracking-[0.12em] text-earth-muted uppercase">
                            {channel.label}
                          </span>
                          <span className="mt-1 block truncate text-[0.9375rem] text-earth">
                            {channel.value}
                          </span>
                          {channel.note ? (
                            <span className="mt-0.5 block text-[0.8125rem] text-earth-muted">
                              {channel.note}
                            </span>
                          ) : null}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {address.length > 0 ? (
              <section aria-labelledby="address-heading">
                <h2 id="address-heading" className="eyebrow">
                  Where we are
                </h2>
                <address className="mt-4 text-[0.9375rem] leading-relaxed text-earth-soft not-italic">
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                {settings.address.googleMapsUrl ? (
                  <a
                    href={settings.address.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-botanical underline decoration-botanical/40 underline-offset-4 transition-colors hover:decoration-botanical"
                  >
                    Open in Maps
                    <Icon name="external" size={14} />
                  </a>
                ) : null}
              </section>
            ) : null}

            {socials.length > 0 ? (
              <section aria-labelledby="social-heading">
                <h2 id="social-heading" className="eyebrow">
                  Follow along
                </h2>
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {socials.map((social) => (
                    <li key={social.platform}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${settings.brandName} on ${social.label}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xs border border-beige text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
                      >
                        <Icon name={socialIconName(social.platform)} size={18} />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      </Container>

      <JsonLd data={breadcrumbJsonLd(TRAIL)} />
    </>
  )
}

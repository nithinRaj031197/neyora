import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import { ContactForm } from '@/components/public/ContactForm'
import { TrackedLink } from '@/components/public/TrackedLink'
import {
  formattedAddress,
  getSiteSettings,
  getSocialLinks,
  whatsappLink,
} from '@/lib/content/site'
import { getPageBySlug } from '@/lib/content/pages'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'

export const revalidate = 600

const TRAIL = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSiteSettings(), getPageBySlug('contact-intro')])
  return buildMetadata({
    title: page?.seo_title || 'Contact',
    description:
      page?.seo_description ||
      page?.subtitle ||
      'Reach NEYORA by WhatsApp, phone or email. Wholesale, kitchen supply and farm visits.',
    path: '/contact',
    settings,
  })
}

export default async function ContactPage() {
  const [settings, socials, page] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getPageBySlug('contact-intro'),
  ])

  const whatsapp = whatsappLink(settings)
  const address = formattedAddress(settings)

  // Every channel below is admin-controlled: an empty setting simply removes
  // the row rather than rendering a dead link.
  const channels = [
    whatsapp
      ? {
          key: 'whatsapp',
          icon: 'whatsapp' as const,
          label: 'WhatsApp',
          value: whatsapp.display,
          href: whatsapp.href,
          event: 'whatsapp_click' as const,
          note: 'Fastest for orders and quick questions',
        }
      : null,
    settings.contact_phone
      ? {
          key: 'phone',
          icon: 'phone' as const,
          label: 'Phone',
          value: settings.contact_phone,
          href: `tel:${settings.contact_phone.replace(/\s/g, '')}`,
          event: 'contact_click' as const,
          note: settings.business_hours ?? undefined,
        }
      : null,
    settings.contact_email
      ? {
          key: 'email',
          icon: 'mail' as const,
          label: 'Email',
          value: settings.contact_email,
          href: `mailto:${settings.contact_email}`,
          event: 'contact_click' as const,
          note: 'Best for anything detailed',
        }
      : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null)

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

            <h2 className="text-(length:--text-display-sm)">Send us a message</h2>
            <div className="mt-8 max-w-2xl">
              <ContactForm />
            </div>
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
                      <TrackedLink
                        href={channel.href}
                        event={channel.event}
                        props={{ method: channel.key, location: 'contact' }}
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
                      </TrackedLink>
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
                {settings.google_maps_url ? (
                  <a
                    href={settings.google_maps_url}
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
                    <li key={social.id}>
                      <TrackedLink
                        href={social.url}
                        event="social_click"
                        props={{ platform: social.platform, location: 'contact' }}
                        ariaLabel={`${settings.brand_name} on ${social.label}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xs border border-beige text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
                      >
                        <Icon name={socialIconName(social.platform)} size={18} />
                      </TrackedLink>
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

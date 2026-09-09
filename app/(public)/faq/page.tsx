import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { getFaqs, getPageBySlug, getSiteSettings, groupFaqs } from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/jsonld'

const TRAIL = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
]

export function generateMetadata(): Metadata {
  const page = getPageBySlug('faq-intro')
  return buildMetadata({
    title: page?.title || 'Frequently Asked Questions',
    description: page?.subtitle || 'Answers about freshness, storage, cooking and how we grow.',
    path: '/faq',
    seo: page?.seo,
    settings: getSiteSettings(),
  })
}

export default function FaqPage() {
  const page = getPageBySlug('faq-intro')
  const faqs = getFaqs()

  const groups = groupFaqs(faqs)

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-14 lg:pt-14">
          <Breadcrumbs trail={TRAIL} />
          <p className="eyebrow mt-9">{page?.eyebrow ?? 'Answers'}</p>
          <h1 className="mt-4 max-w-[24ch] text-(length:--text-display-lg)">
            {page?.title ?? 'Frequently asked questions'}
          </h1>
          {page?.subtitle ? (
            <p className="mt-6 max-w-[56ch] text-[1.125rem] leading-relaxed text-earth-soft">
              {page.subtitle}
            </p>
          ) : null}
        </Container>
      </header>

      <Container size="wide" className="py-(--spacing-section-sm)">
        {faqs.length === 0 ? (
          <EmptyState
            title="No questions published yet"
            description="Add them to content/faqs.yml and they will appear here."
            actionLabel="Contact us instead"
            actionHref="/contact"
          />
        ) : (
          <div className="grid gap-16 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            {/* A plain jump list. Sticky in-page nav, no JavaScript. */}
            <nav aria-label="FAQ categories" className="lg:sticky lg:top-24 lg:self-start">
              <p className="eyebrow">Jump to</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {groups.map((group) => (
                  <li key={group.category}>
                    <a
                      href={`#${encodeURIComponent(group.category.toLowerCase().replace(/\s+/g, '-'))}`}
                      className="text-[0.9375rem] text-earth-soft transition-colors hover:text-forest"
                    >
                      {group.category}
                      <span className="ml-1.5 text-earth-muted">({group.items.length})</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-beige pt-8">
                <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
                  Still unanswered? We would rather reply properly than quickly.
                </p>
                <ButtonLink href="/contact" variant="secondary" size="sm" className="mt-5">
                  Ask us
                </ButtonLink>
              </div>
            </nav>

            <div className="flex flex-col gap-14">
              {page?.body?.trim() ? (
                <MarkdownRenderer content={page.body} variant="compact" />
              ) : null}

              {groups.map((group) => (
                <section
                  key={group.category}
                  id={group.category.toLowerCase().replace(/\s+/g, '-')}
                  aria-labelledby={`heading-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="scroll-mt-28"
                >
                  <h2
                    id={`heading-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-(length:--text-display-sm)"
                  >
                    {group.category}
                  </h2>

                  {/*
                    <details>/<summary>: a native, keyboard-accessible,
                    zero-JavaScript accordion. A hand-rolled one would ship
                    client JS to reimplement what the browser already does.
                  */}
                  <div className="mt-6 border-t border-beige">
                    {group.items.map((faq) => (
                      <details key={faq.question} className="group border-b border-beige">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-5 [&::-webkit-details-marker]:hidden">
                          <h3 className="font-sans text-[1.0625rem] font-medium text-forest">
                            {faq.question}
                          </h3>
                          <span
                            aria-hidden="true"
                            className="mt-1 grid h-5 w-5 shrink-0 place-items-center text-earth-muted transition-transform duration-200 group-open:rotate-45"
                          >
                            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M10 4v12M4 10h12" />
                            </svg>
                          </span>
                        </summary>
                        <div className="pb-6">
                          <MarkdownRenderer
                            content={faq.answer}
                            variant="compact"
                            className="max-w-[64ch] text-earth-soft"
                          />
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </Container>

      <JsonLd
        data={
          faqs.length > 0
            ? [breadcrumbJsonLd(TRAIL), faqJsonLd(faqs)]
            : [breadcrumbJsonLd(TRAIL)]
        }
      />
    </>
  )
}

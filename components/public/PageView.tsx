import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { Picture } from '@/components/ui/Picture'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'
import { getPageBySlug } from '@/lib/content/pages'
import { getSiteSettings } from '@/lib/content/site'
import { buildMetadata } from '@/lib/seo/metadata'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { excerptFromMarkdown } from '@/lib/markdown/plain'

/**
 * Shared renderer for every editorial page (/about, /farm, /quality, /storage
 * and the legal pages).
 *
 * One component rather than seven near-identical route files: each route is a
 * thin wrapper that names its slug and breadcrumb trail, and all the layout,
 * SEO and structured data live here. Adding a page is a CMS row plus a
 * three-line route file.
 */
export async function generatePageMetadata(
  slug: string,
  path: string,
  fallbackTitle: string,
): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSiteSettings(), getPageBySlug(slug)])

  if (!page) {
    return buildMetadata({ title: fallbackTitle, path, settings, noindex: true })
  }

  return buildMetadata({
    title: page.seo_title || page.title,
    description: page.seo_description || page.subtitle,
    descriptionSource: page.body,
    path,
    canonicalOverride: page.canonical_url,
    image: page.og ?? page.hero,
    noindex: page.noindex,
    type: 'article',
    publishedTime: page.published_at,
    modifiedTime: page.updated_at,
    settings,
  })
}

export async function PageView({
  slug,
  path,
  trail,
  children,
}: {
  slug: string
  path: string
  trail: Crumb[]
  /** Extra content rendered after the Markdown body — e.g. the FAQ accordion. */
  children?: React.ReactNode
}) {
  const [settings, page] = await Promise.all([getSiteSettings(), getPageBySlug(slug)])

  // A missing row means the page was unpublished or never seeded. A 404 is the
  // honest response — better than an empty shell that looks broken.
  if (!page) notFound()

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-16 lg:pt-14 lg:pb-20">
          <Breadcrumbs trail={trail} />

          <div className="mt-9 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
            <div>
              {page.eyebrow ? <p className="eyebrow">{page.eyebrow}</p> : null}
              <h1 className="mt-4 text-(length:--text-display-lg)">{page.title}</h1>
              {page.subtitle ? (
                <p className="mt-6 max-w-[54ch] text-[1.125rem] leading-relaxed text-earth-soft">
                  {page.subtitle}
                </p>
              ) : null}
            </div>

            {page.hero ? (
              <Picture
                media={page.hero}
                alt={page.hero.alt ?? page.title}
                aspect="4 / 3"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
                wrapperClassName="rounded-sm"
              />
            ) : null}
          </div>
        </Container>
      </header>

      <Container size="wide" className="py-(--spacing-section)">
        <div className="lg:grid lg:grid-cols-[minmax(0,68ch)_1fr] lg:gap-20">
          <MarkdownRenderer content={page.body} />
          {children ? <div className="mt-16 lg:col-span-2 lg:mt-20">{children}</div> : null}
        </div>
      </Container>

      <JsonLd
        data={[
          breadcrumbJsonLd(trail),
          articleJsonLd({
            title: page.title,
            description: page.seo_description || page.subtitle || excerptFromMarkdown(page.body),
            path,
            image: page.og ?? page.hero,
            publishedAt: page.published_at,
            modifiedAt: page.updated_at,
            settings,
          }),
        ]}
      />
    </>
  )
}

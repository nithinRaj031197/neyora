import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeader } from '@/components/ui/Section'
import { Picture } from '@/components/ui/Picture'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import { NutritionTable } from '@/components/public/NutritionTable'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { RecipeCard } from '@/components/public/RecipeCard'
import { TrackedLink } from '@/components/public/TrackedLink'
import { ViewTracker } from '@/components/public/ViewTracker'
import { availabilityLabel, getProductBySlug } from '@/lib/content/products'
import { listRecipes } from '@/lib/content/recipes'
import { getSiteSettings, whatsappLink } from '@/lib/content/site'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/jsonld'
import { formatPrice } from '@/lib/utils/format'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [settings, product] = await Promise.all([getSiteSettings(), getProductBySlug(slug)])

  if (!product) {
    return buildMetadata({ title: 'Product not found', path: `/products/${slug}`, settings, noindex: true })
  }

  return buildMetadata({
    title: product.seo_title || product.name,
    description: product.seo_description || product.short_description,
    descriptionSource: product.description,
    path: `/products/${product.slug}`,
    canonicalOverride: product.canonical_url,
    image: product.og ?? product.images[0] ?? null,
    settings,
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [settings, product] = await Promise.all([getSiteSettings(), getProductBySlug(slug)])

  if (!product) notFound()

  const whatsapp = whatsappLink(
    settings,
    `Hi ${settings.brand_name}, I would like to order ${product.name}${
      product.weight_label ? ` (${product.weight_label})` : ''
    }.`,
  )

  // Recipes written for this product, so the pack has somewhere to lead.
  const { recipes } = await listRecipes({ limit: 3 })

  const price = formatPrice(product.price, product.currency)
  const mrp =
    product.mrp !== null && product.price !== null && product.mrp > product.price
      ? formatPrice(product.mrp, product.currency)
      : null
  const saving =
    product.mrp !== null && product.price !== null && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: product.name, path: `/products/${product.slug}` },
  ]

  const facts = [
    product.variety ? { label: 'Variety', value: product.variety } : null,
    product.weight_label ? { label: 'Pack size', value: product.weight_label } : null,
    product.shelf_life ? { label: 'Shelf life', value: product.shelf_life } : null,
    product.origin ? { label: 'Grown at', value: product.origin } : null,
  ].filter((f): f is { label: string; value: string } => f !== null)

  return (
    <>
      <ViewTracker event="product_view" props={{ product: product.slug }} />

      <Container size="wide" className="pt-10 lg:pt-14">
        <Breadcrumbs trail={trail} />

        <div className="mt-9 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Gallery. The primary image is the LCP element, hence priority. */}
          <div className="flex flex-col gap-3">
            <Picture
              media={product.images[0] ?? null}
              alt={product.images[0]?.alt ?? product.name}
              aspect="1 / 1"
              sizes="(max-width: 1024px) 100vw, 48vw"
              priority
              wrapperClassName="rounded-sm bg-beige-soft"
            />
            {product.images.length > 1 ? (
              <ul className="grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((image) => (
                  <li key={image.id}>
                    <Picture
                      media={image}
                      alt={image.alt ?? `${product.name} — additional view`}
                      aspect="1 / 1"
                      sizes="14vw"
                      wrapperClassName="rounded-xs bg-beige-soft"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            {product.category ? <p className="eyebrow">{product.category.name}</p> : null}
            <h1 className="mt-4 text-(length:--text-display-md)">{product.name}</h1>

            {product.short_description ? (
              <p className="mt-5 max-w-[50ch] text-[1.0625rem] leading-relaxed text-earth-soft">
                {product.short_description}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {price ? (
                <p className="font-display text-(length:--text-display-sm) text-forest">{price}</p>
              ) : null}
              {mrp ? (
                <p className="text-[0.9375rem] text-earth-muted line-through">{mrp}</p>
              ) : null}
              {saving ? <Badge tone="leaf">{saving}% off</Badge> : null}
              {product.unit_label ? (
                <span className="text-[0.875rem] text-earth-muted">per {product.unit_label}</span>
              ) : null}
            </div>

            <div className="mt-4">
              <Badge tone={product.availability === 'in_stock' ? 'success' : 'golden'}>
                {availabilityLabel(product.availability)}
              </Badge>
            </div>

            {/*
              No cart: NEYORA sells fresh produce through WhatsApp today.
              Ordering is a conversation, so the CTA is a conversation.
            */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {whatsapp ? (
                <TrackedLink
                  href={whatsapp.href}
                  event="whatsapp_click"
                  props={{ location: 'product', product: product.slug }}
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2.5 rounded-xs border border-forest bg-forest px-7 text-[0.9375rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  <Icon name="whatsapp" size={19} />
                  Order on WhatsApp
                </TrackedLink>
              ) : null}
              <Link
                href="/contact"
                className="inline-flex h-13 items-center justify-center rounded-xs border border-forest/35 px-7 text-[0.9375rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
              >
                Enquire
              </Link>
            </div>

            {product.highlights.length > 0 ? (
              <ul className="mt-10 flex flex-col gap-3 border-t border-beige pt-8">
                {product.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3 text-[0.9375rem]">
                    <Icon name="check" size={16} className="mt-1 text-botanical" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {facts.length > 0 ? (
              <dl className="mt-8 grid gap-px border-t border-beige sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-b border-beige py-4 sm:pr-6">
                    <dt className="font-sans text-[0.6875rem] font-medium tracking-[0.14em] text-earth-muted uppercase">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-[0.9375rem] text-earth">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </Container>

      <Container size="wide" className="py-(--spacing-section)">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,68ch)_1fr] lg:gap-20">
          <MarkdownRenderer content={product.description} />

          <aside className="flex flex-col gap-10">
            {product.nutrition?.per?.length ? (
              <NutritionTable nutrition={product.nutrition} />
            ) : null}

            {product.storage_notes ? (
              <section aria-labelledby="storage-heading">
                <h2 id="storage-heading" className="font-display text-xl text-forest">
                  Storing it well
                </h2>
                <MarkdownRenderer
                  content={product.storage_notes}
                  variant="compact"
                  className="mt-4"
                />
                <Link
                  href="/storage"
                  className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] text-botanical underline decoration-botanical/40 underline-offset-4 transition-colors hover:decoration-botanical"
                >
                  Full storage guide
                  <Icon name="arrow-right" size={14} />
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </Container>

      {recipes.length > 0 ? (
        <Section tone="ivory-soft" containerSize="wide" ariaLabelledby="product-recipes-heading">
          <SectionHeader
            id="product-recipes-heading"
            eyebrow="From the kitchen"
            heading="Ways to cook it"
            description="Tested, simple, and written for exactly this pack size."
          />
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </Section>
      ) : null}

      <JsonLd
        data={[
          breadcrumbJsonLd(trail),
          productJsonLd({ product, images: product.images, settings }),
        ]}
      />
    </>
  )
}

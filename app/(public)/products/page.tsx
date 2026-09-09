import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { ProductCard } from '@/components/public/ProductCard'
import { JsonLd } from '@/components/ui/JsonLd'
import { EmptyState } from '@/components/ui/EmptyState'
import { getProductCategories, listProducts } from '@/lib/content/products'
import { getSiteSettings } from '@/lib/content/site'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'

export const revalidate = 300

const TRAIL = [
  { name: 'Home', path: '/' },
  { name: 'Products', path: '/products' },
]

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return buildMetadata({
    title: 'Products',
    description:
      settings.brand_description ??
      'Everything NEYORA is growing right now, harvested to order and graded by hand.',
    path: '/products',
    settings,
  })
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const [products, categories] = await Promise.all([
    listProducts({ categorySlug: category }),
    getProductCategories(),
  ])

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-14 lg:pt-14">
          <Breadcrumbs trail={TRAIL} />
          <p className="eyebrow mt-9">What we grow</p>
          <h1 className="mt-4 max-w-[24ch] text-(length:--text-display-lg)">
            Harvested to order, never to stock
          </h1>
          <p className="mt-6 max-w-[58ch] text-[1.125rem] leading-relaxed text-earth-soft">
            One crop today, more to come. Everything here is picked the morning it ships and graded
            by hand before it goes into a pack.
          </p>
        </Container>
      </header>

      {categories.length > 1 ? (
        <div className="border-b border-beige bg-ivory">
          <Container size="wide" className="py-4">
            <nav aria-label="Filter products by category">
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link
                    href="/products"
                    aria-current={!category ? 'page' : undefined}
                    className={`inline-flex h-9 items-center rounded-xs border px-3.5 text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors ${
                      !category
                        ? 'border-forest bg-forest text-ivory'
                        : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest'
                    }`}
                  >
                    All
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      aria-current={category === cat.slug ? 'page' : undefined}
                      className={`inline-flex h-9 items-center rounded-xs border px-3.5 text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors ${
                        category === cat.slug
                          ? 'border-forest bg-forest text-ivory'
                          : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      ) : null}

      <Container size="wide" className="py-(--spacing-section)">
        {products.length === 0 ? (
          <EmptyState
            title="Nothing in this category yet"
            description="We are growing towards it. In the meantime, everything currently available is on the main products page."
            actionLabel="See all products"
            actionHref="/products"
          />
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 3} />
            ))}
          </div>
        )}
      </Container>

      <JsonLd data={breadcrumbJsonLd(TRAIL)} />
    </>
  )
}

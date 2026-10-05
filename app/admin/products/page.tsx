import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getPublishedProductsFromFiles } from '@/lib/content'
import { readProductOverrides, productLastUpdated } from '@/lib/products/repository'
import { type Availability } from '@/lib/products/schema'
import { ProductForm } from '@/components/admin/ProductForm'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'

/** Short labels and tones for the at-a-glance badge on each card header. */
const AVAILABILITY_BADGE: Record<Availability, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  in_stock: { label: 'In stock', tone: 'success' },
  low_stock: { label: 'Low stock', tone: 'warning' },
  out_of_stock: { label: 'Out of stock', tone: 'danger' },
  seasonal: { label: 'Seasonal', tone: 'neutral' },
  coming_soon: { label: 'Coming soon', tone: 'neutral' },
}

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const files = getPublishedProductsFromFiles()
  const overrides = await readProductOverrides()
  const updated = Object.fromEntries(
    await Promise.all(files.map(async (p) => [p.slug, await productLastUpdated(p.slug)] as const)),
  )

  return (
    <>
      <h1 className="font-display text-[1.75rem] text-forest">Products</h1>
      <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-earth-soft">
        Name, description, prices and availability. Changes are live as soon as
        you save — no deploy. Photographs and pack weight are set in the content
        files, because their dimensions keep the page from jumping as it loads.
      </p>

      <div className="mt-10 grid gap-8">
        {files.map((product) => {
          const o = overrides[product.slug] ?? {}
          const live = {
            price: o.price ?? product.price,
            mrp: o.mrp ?? product.mrp,
            availability: (o.availability ?? product.availability) as Availability,
          }
          const last = updated[product.slug]

          return (
            <section
              key={product.slug}
              className="rounded-sm border border-beige bg-ivory p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-display text-[1.3125rem] text-forest">
                    {o.name ?? product.name}
                  </h2>
                  <p className="mt-1 font-mono text-[0.75rem] text-earth-muted">
                    /products/{product.slug} · {product.weightLabel}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-display text-[1.125rem] text-forest">
                    {formatPrice(live.price ?? null, product.currency)}
                    {live.mrp !== undefined && live.price !== undefined && live.mrp > live.price ? (
                      <span className="ml-2 text-[0.875rem] text-earth-muted line-through">
                        {formatPrice(live.mrp, product.currency)}
                      </span>
                    ) : null}
                  </p>
                  <Badge tone={AVAILABILITY_BADGE[live.availability].tone}>
                    {AVAILABILITY_BADGE[live.availability].label}
                  </Badge>
                </div>
              </div>

              {last ? (
                <p className="mt-3 text-[0.75rem] text-earth-muted">
                  Last changed{' '}
                  {new Date(last.at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Kolkata',
                  })}{' '}
                  by {last.by}
                </p>
              ) : null}

              <ProductForm
                slug={product.slug}
                values={{
                  name: o.name ?? '',
                  shortDescription: o.shortDescription ?? '',
                  price: o.price ?? '',
                  mrp: o.mrp ?? '',
                  availability: o.availability ?? '',
                }}
                fileDefaults={{
                  name: product.name,
                  shortDescription: product.shortDescription ?? '',
                  price: product.price ?? '',
                  mrp: product.mrp ?? '',
                  availability: product.availability,
                }}
              />
            </section>
          )
        })}
      </div>
    </>
  )
}

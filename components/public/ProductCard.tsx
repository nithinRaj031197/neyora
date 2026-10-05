import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'
import { availabilityLabel } from '@/lib/content'
import type { Category, Product } from '@/types/content'

export function ProductCard({
  product,
  category,
  priority = false,
}: {
  product: Product
  category?: Category | null
  priority?: boolean
}) {
  const price = formatPrice(product.price ?? null, product.currency)
  // Only call it a saving when the MRP is genuinely higher.
  const mrp =
    product.mrp !== undefined && product.price !== undefined && product.mrp > product.price
      ? formatPrice(product.mrp, product.currency)
      : null
  const unavailable = product.availability === 'out_of_stock'

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative">
          <Picture
            image={product.images[0]}
            aspect="1 / 1"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            wrapperClassName="rounded-sm bg-beige-soft"
            className="transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.03]"
          />
          {product.availability !== 'in_stock' ? (
            <div className="absolute top-3 left-3">
              <Badge tone={unavailable ? 'neutral' : 'golden'}>
                {availabilityLabel(product.availability)}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            {category ? <p className="eyebrow">{category.name}</p> : null}
            <h3 className="mt-2 font-display text-[1.3125rem] leading-snug transition-colors group-hover:text-botanical">
              {product.name}
            </h3>
            {product.weightLabel ? (
              <p className="mt-1 text-[0.8125rem] text-earth-muted">{product.weightLabel}</p>
            ) : null}
          </div>

          {price ? (
            <div className="shrink-0 text-right">
              <p className="font-display text-lg text-forest">{price}</p>
              {mrp ? (
                <p className="text-[0.8125rem] text-earth-muted line-through">{mrp}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {product.shortDescription ? (
          <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-relaxed text-earth-soft">
            {product.shortDescription}
          </p>
        ) : null}
      </Link>

      {/*
        Outside the <Link> on purpose: an anchor inside an anchor is invalid
        HTML, and browsers resolve it by breaking one of the two.

        This used to be a quantity stepper that opened WhatsApp with the order
        written out. It was removed because those orders never reached the
        database: no reference, no payment state, no admin notification, no
        record that the sale happened. Ordering now has one path, and it is the
        product page.
      */}
      {unavailable ? (
        <p className="mt-4 text-[0.875rem] text-earth-muted">
          Out of stock — the next crop is on its way.
        </p>
      ) : (
        <Link
          href={`/products/${product.slug}`}
          className="press cta-arrow mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xs border border-forest/35 px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
        >
          Order {product.weightLabel ? `· ${product.weightLabel}` : ''}
          <Icon name="arrow-right" size={16} />
        </Link>
      )}
    </article>
  )
}

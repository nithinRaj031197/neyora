import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'
import { availabilityLabel } from '@/lib/content/products'
import type { ProductCardWithMedia } from '@/lib/content/products'

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardWithMedia
  priority?: boolean
}) {
  const price = formatPrice(product.price, product.currency)
  // Only call it a saving when the MRP is genuinely higher.
  const mrp =
    product.mrp !== null && product.price !== null && product.mrp > product.price
      ? formatPrice(product.mrp, product.currency)
      : null
  const unavailable = product.availability === 'out_of_stock'

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative">
          <Picture
            media={product.cover}
            alt={product.cover?.alt ?? `${product.name} — product photograph`}
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
            {product.category ? <p className="eyebrow">{product.category.name}</p> : null}
            <h3 className="mt-2 font-display text-[1.3125rem] leading-snug transition-colors group-hover:text-botanical">
              {product.name}
            </h3>
            {product.weight_label ? (
              <p className="mt-1 text-[0.8125rem] text-earth-muted">{product.weight_label}</p>
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

        {product.short_description ? (
          <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-relaxed text-earth-soft">
            {product.short_description}
          </p>
        ) : null}
      </Link>
    </article>
  )
}

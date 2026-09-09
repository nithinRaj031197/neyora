import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Badge } from '@/components/ui/Badge'
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
    </article>
  )
}

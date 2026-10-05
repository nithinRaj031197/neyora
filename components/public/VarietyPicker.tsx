import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { formatPrice } from '@/lib/utils/format'
import { availabilityLabel } from '@/lib/content'
import { cn } from '@/lib/utils/cn'
import type { Product } from '@/types/content'

/**
 * Choose a variety.
 *
 * NEYORA grows two oyster mushrooms, and a shop that shows one of them on the
 * product page leaves the customer to discover the other by going back to the
 * listing — which most will not do. This makes the choice part of the product
 * page itself.
 *
 * Links between sibling products rather than state within one page. Each
 * variety keeps its own URL, its own photograph, its own description and its
 * own place in the sitemap, which is both the existing content architecture
 * and the thing a search engine can actually index. A client-side switcher
 * would collapse two products into one page and lose all of that.
 *
 * Renders nothing for a single variety: a picker with one option is furniture.
 */
export function VarietyPicker({
  varieties,
  currentSlug,
}: {
  varieties: Product[]
  currentSlug: string
}) {
  if (varieties.length < 2) return null

  return (
    <section aria-labelledby="variety-heading" className="mt-8">
      <h2
        id="variety-heading"
        className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase"
      >
        Choose your variety
      </h2>

      <ul className="mt-3 grid grid-cols-2 gap-3">
        {varieties.map((variety) => {
          const current = variety.slug === currentSlug
          const unavailable = variety.availability !== 'in_stock'

          const body = (
            <>
              <Picture
                image={variety.images[0]}
                alt=""
                aspect="1 / 1"
                sizes="(max-width: 640px) 44vw, 180px"
                wrapperClassName="w-14 shrink-0 overflow-clip rounded-xs bg-beige-soft sm:w-16"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] leading-snug font-medium text-forest">
                  {variety.varietyLabel ?? variety.name}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] text-earth-muted">
                  {variety.weightLabel}
                  {typeof variety.price === 'number'
                    ? ` · ${formatPrice(variety.price, variety.currency)}`
                    : ''}
                </span>
                {/*
                  The unavailable variety stays visible and keeps its price, so
                  the customer learns it exists and what it will cost. Hiding it
                  until it is in stock means nobody ever knows to ask.
                */}
                {unavailable ? (
                  <span className="mt-1 block text-[0.75rem] tracking-[0.06em] text-earth-muted uppercase">
                    {availabilityLabel(variety.availability)}
                  </span>
                ) : null}
              </span>
            </>
          )

          const shared = 'flex items-center gap-3 rounded-sm border p-3 transition-colors duration-200 ease-(--ease-out-soft)'

          return (
            <li key={variety.slug}>
              {current ? (
                <div
                  aria-current="true"
                  className={cn(shared, 'border-forest bg-forest/5')}
                >
                  {body}
                </div>
              ) : (
                <Link
                  href={`/products/${variety.slug}`}
                  className={cn(
                    shared,
                    'press border-beige hover:border-forest/50 hover:bg-forest/[0.03]',
                    unavailable && 'opacity-75',
                  )}
                >
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { Icon } from '@/components/ui/Icon'
import { ingredientShoppingQuery, RETAILERS, shoppingSearchUrl } from '@/lib/shopping/retailers'
import type { Ingredient } from '@/types/content'

export function IngredientShoppingHelper({ ingredients }: { ingredients: Ingredient[] }) {
  const shoppingTerms = ingredients
    .filter((ingredient) => !ingredient.optional)
    .map(ingredientShoppingQuery)
    .filter(Boolean)

  if (shoppingTerms.length === 0) return null

  const query = Array.from(new Set(shoppingTerms)).join(', ')

  return (
    <section aria-labelledby="shopping-heading" className="border-t border-beige pt-8">
      <p className="eyebrow">Need the ingredients?</p>
      <h2 id="shopping-heading" className="mt-3 font-display text-xl text-forest">
        Shopping helper
      </h2>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-earth-soft">
        NEYORA does not currently connect to retailer APIs or claim partnerships. Use the
        ingredient search as a neutral starting point.
      </p>

      <a
        href={shoppingSearchUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xs border border-forest/35 px-4 text-center text-[0.8125rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5 sm:w-auto"
      >
        <Icon name="search" size={16} />
        Search ingredients
      </a>

      <div className="mt-6">
        <h3 className="font-sans text-[0.75rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
          Retailer links
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {RETAILERS.map((retailer) => (
            <li
              key={retailer.id}
              className="flex items-center justify-between gap-3 border-b border-beige/70 py-2.5 last:border-b-0"
            >
              <span className="text-[0.9375rem] text-earth">{retailer.label}</span>
              <span className="text-[0.75rem] tracking-[0.08em] text-earth-muted uppercase">
                {retailer.enabled ? 'Available' : 'Disabled'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

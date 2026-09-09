import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Icon } from '@/components/ui/Icon'
import { formatDuration } from '@/lib/utils/format'
import { packSizeLabel } from '@/lib/utils/scale'
import { cn } from '@/lib/utils/cn'
import type { RecipeCardWithMedia } from '@/lib/content/recipes'

/**
 * Recipe card.
 *
 * No border, no shadow: the photograph is the card, with type sitting beneath
 * it on the page ground. Guidelines §4 rules out the bordered-and-shadowed
 * grid card, and this reads as editorial instead.
 */
export function RecipeCard({
  recipe,
  priority = false,
  size = 'default',
  className,
}: {
  recipe: RecipeCardWithMedia
  priority?: boolean
  size?: 'default' | 'large'
  className?: string
}) {
  const time = recipe.total_time_minutes

  return (
    <article className={cn('group', className)}>
      <Link href={`/recipes/${recipe.slug}`} className="block">
        <Picture
          media={recipe.cover}
          alt={recipe.cover?.alt ?? `${recipe.title} — recipe photograph`}
          aspect={size === 'large' ? '3 / 2' : '4 / 3'}
          sizes={
            size === 'large'
              ? '(max-width: 1024px) 100vw, 60vw'
              : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          }
          priority={priority}
          wrapperClassName="rounded-sm"
          className="transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.02]"
        />

        <div className="mt-5">
          {recipe.category ? <p className="eyebrow">{recipe.category.name}</p> : null}
          <h3
            className={cn(
              'mt-2 transition-colors group-hover:text-botanical',
              size === 'large'
                ? 'text-(length:--text-display-sm)'
                : 'font-display text-[1.3125rem] leading-snug',
            )}
          >
            {recipe.title}
          </h3>
          {recipe.excerpt ? (
            <p className="mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-earth-soft">
              {recipe.excerpt}
            </p>
          ) : null}

          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-earth-muted">
            {time > 0 ? (
              <li className="flex items-center gap-1.5">
                <Icon name="clock" size={15} />
                {formatDuration(time)}
              </li>
            ) : null}
            {recipe.servings ? (
              <li className="flex items-center gap-1.5">
                <Icon name="users" size={15} />
                Serves {recipe.servings}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <Icon name="flame" size={15} />
              {packSizeLabel(recipe.recommended_pack_size)}
            </li>
          </ul>
        </div>
      </Link>
    </article>
  )
}

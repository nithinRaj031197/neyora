import Link from 'next/link'
import { Icon, type IconName } from './Icon'

/**
 * Shared empty state.
 *
 * Every list on both the public site and the admin uses this, so "nothing
 * here" always looks deliberate rather than broken — and always offers the
 * next useful action.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = 'leaf',
  compact = false,
}: {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  icon?: IconName
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center border border-dashed border-beige text-center ${
        compact ? 'px-6 py-10' : 'px-6 py-20'
      }`}
    >
      <Icon name={icon} size={compact ? 24 : 30} className="text-beige" />
      <h2
        className={`mt-5 font-display text-forest ${compact ? 'text-lg' : 'text-(length:--text-display-sm)'}`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-earth-soft">
          {description}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-7 inline-flex h-10 items-center gap-2 rounded-xs border border-forest/35 px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
        >
          {actionLabel}
          <Icon name="arrow-right" size={15} />
        </Link>
      ) : null}
    </div>
  )
}

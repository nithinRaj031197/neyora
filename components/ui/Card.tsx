import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Hairline border, no shadow, 3px radius. Guidelines §4 explicitly rules out
 * the rounded-2xl-with-shadow card that marks out the generic organic template.
 */
export function Card({
  children,
  className,
  href,
  tone = 'ivory',
  interactive,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  href?: string
  tone?: 'ivory' | 'ivory-soft' | 'transparent' | 'forest'
  interactive?: boolean
  /** Use 'section' or 'article' when the card is a landmark, not decoration. */
  as?: 'div' | 'section' | 'article'
}) {
  const tones = {
    ivory: 'bg-ivory border-beige',
    'ivory-soft': 'bg-ivory-soft border-beige',
    transparent: 'bg-transparent border-beige',
    forest: 'bg-forest border-forest-soft text-ivory',
  }

  const classes = cn(
    'group relative flex flex-col overflow-hidden rounded-sm border',
    tones[tone],
    (interactive || href) &&
      'transition-colors duration-300 ease-(--ease-out-soft) hover:border-forest/45',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return <Tag className={classes}>{children}</Tag>
}

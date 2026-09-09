import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Horizontal measure. `wide` is for image grids, `narrow` for prose — 68ch is
 * where a line stops being comfortable (guidelines §3).
 */
export function Container({
  children,
  className,
  size = 'default',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  size?: 'narrow' | 'default' | 'wide' | 'full'
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'main' | 'nav'
}) {
  const width = {
    narrow: 'max-w-3xl',
    default: 'max-w-6xl',
    wide: 'max-w-[88rem]',
    full: 'max-w-none',
  }[size]

  return (
    <Tag className={cn('mx-auto w-full px-5 sm:px-8 lg:px-12', width, className)}>{children}</Tag>
  )
}

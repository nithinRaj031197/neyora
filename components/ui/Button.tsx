import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'inverse-outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/**
 * Flat fills and hairline outlines only. No gradient buttons — the brand
 * gradient is reserved for the wordmark and section rules (guidelines §2).
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-forest text-ivory hover:bg-forest-soft active:bg-forest border border-forest',
  secondary:
    'bg-transparent text-forest border border-forest/35 hover:border-forest hover:bg-forest/5',
  ghost:
    'bg-transparent text-earth-soft border border-transparent hover:text-forest hover:bg-earth/5',
  inverse:
    'bg-ivory text-forest border border-ivory hover:bg-beige-soft',
  'inverse-outline':
    'bg-transparent text-ivory border border-ivory/40 hover:border-ivory hover:bg-ivory/10',
  danger:
    'bg-danger text-ivory border border-danger hover:bg-danger/90',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem] gap-1.5',
  md: 'h-11 px-5 text-[0.875rem] gap-2',
  lg: 'h-13 px-7 text-[0.9375rem] gap-2.5',
}

const BASE = cn(
  'inline-flex items-center justify-center rounded-xs font-sans font-medium',
  'tracking-[0.04em] uppercase whitespace-nowrap',
  'transition-colors duration-200 ease-(--ease-out-soft)',
  'disabled:pointer-events-none disabled:opacity-45',
  'aria-disabled:pointer-events-none aria-disabled:opacity-45',
)

interface Common {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  fullWidth,
  type = 'button',
  ...rest
}: Common & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * External links get rel="noopener noreferrer" automatically — a detail worth
 * enforcing centrally because CTA destinations are admin-authored.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  fullWidth,
  href,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href)
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)

  if (isExternal) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  )
}

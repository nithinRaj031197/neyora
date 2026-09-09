import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Size = 'xl' | 'lg' | 'md' | 'sm'

const SIZES: Record<Size, string> = {
  xl: 'text-(length:--text-display-xl) tracking-[-0.03em] leading-[0.94]',
  lg: 'text-(length:--text-display-lg) tracking-[-0.025em] leading-[1.02]',
  md: 'text-(length:--text-display-md)',
  sm: 'text-(length:--text-display-sm)',
}

export function Heading({
  children,
  level = 2,
  size = 'md',
  className,
  invert,
  id,
}: {
  children: ReactNode
  level?: 1 | 2 | 3 | 4
  size?: Size
  className?: string
  invert?: boolean
  id?: string
}) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
  return (
    <Tag id={id} className={cn(SIZES[size], invert && 'text-ivory', className)}>
      {children}
    </Tag>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Container } from './Container'

type Tone = 'ivory' | 'ivory-soft' | 'forest' | 'earth' | 'beige'

const TONES: Record<Tone, string> = {
  ivory: 'bg-ivory text-earth',
  'ivory-soft': 'bg-ivory-soft text-earth',
  beige: 'bg-beige-soft text-earth',
  forest: 'bg-forest text-ivory',
  earth: 'bg-earth text-ivory',
}

/**
 * A page section with the brand's vertical rhythm.
 *
 * Section padding is deliberately large (`--spacing-section` is 4.5rem→10rem)
 * because whitespace is doing most of the work in this design language.
 */
export function Section({
  children,
  className,
  containerClassName,
  tone = 'ivory',
  size = 'default',
  id,
  containerSize = 'default',
  as: Tag = 'section',
  ariaLabelledby,
}: {
  children: ReactNode
  className?: string
  containerClassName?: string
  tone?: Tone
  size?: 'default' | 'compact' | 'flush'
  id?: string
  containerSize?: 'narrow' | 'default' | 'wide' | 'full'
  as?: 'section' | 'div' | 'article'
  ariaLabelledby?: string
}) {
  const padding = {
    default: 'py-(--spacing-section)',
    compact: 'py-(--spacing-section-sm)',
    flush: 'py-0',
  }[size]

  return (
    <Tag id={id} aria-labelledby={ariaLabelledby} className={cn(TONES[tone], padding, className)}>
      <Container size={containerSize} className={containerClassName}>
        {children}
      </Container>
    </Tag>
  )
}

/** Eyebrow + heading + optional intro. Used at the top of most sections. */
export function SectionHeader({
  eyebrow,
  heading,
  description,
  align = 'left',
  invert = false,
  id,
  className,
  level = 2,
}: {
  eyebrow?: string | null
  heading?: string | null
  description?: string | null
  align?: 'left' | 'center'
  invert?: boolean
  id?: string
  className?: string
  level?: 2 | 3
}) {
  if (!eyebrow && !heading && !description) return null
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn('eyebrow', invert && 'text-leaf')}>{eyebrow}</p>
      ) : null}
      {heading ? (
        <Heading
          id={id}
          className={cn('text-(length:--text-display-md)', invert && 'text-ivory')}
        >
          {heading}
        </Heading>
      ) : null}
      {description ? (
        <p
          className={cn(
            'max-w-[60ch] text-[1.0625rem] leading-relaxed',
            invert ? 'text-ivory/75' : 'text-earth-soft',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

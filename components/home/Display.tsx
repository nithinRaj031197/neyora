import { cn } from '@/lib/utils/cn'

/**
 * Oversized editorial display type, one array entry per rendered line.
 *
 * Line breaks are authored in the content file rather than left to the
 * viewport, because at this size where a line breaks is a composition
 * decision, not a typographic accident.
 *
 * Each line animates on its own slight delay, so a headline assembles itself
 * as it enters rather than arriving all at once.
 */
export function Display({
  lines,
  size = 'lg',
  className,
  as: Tag = 'h2',
  id,
  invert,
  animate = true,
}: {
  lines: string[]
  size?: 'xl' | 'lg' | 'md'
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
  id?: string
  invert?: boolean
  animate?: boolean
}) {
  return (
    <Tag
      id={id}
      className={cn(
        'display',
        size === 'xl' && 'display-xl',
        size === 'lg' && 'display-lg',
        size === 'md' && 'display-md',
        invert ? 'text-ivory' : 'text-forest',
        className,
      )}
    >
      {lines.map((line) => (
        <span key={line} className={cn('scene-line', animate && 'scene-rise')}>
          {line}
        </span>
      ))}
    </Tag>
  )
}

/**
 * The small uppercase kicker that opens a chapter.
 *
 * One per chapter, maximum — it is a wayfinding device, and repeating it
 * within a chapter turns it into decoration.
 */
export function Eyebrow({
  children,
  invert,
  className,
}: {
  children: React.ReactNode
  invert?: boolean
  className?: string
}) {
  return (
    <p className={cn('eyebrow scene-fade', invert && 'text-leaf', className)}>{children}</p>
  )
}

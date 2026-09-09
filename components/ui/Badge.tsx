import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Tone = 'neutral' | 'leaf' | 'forest' | 'golden' | 'success' | 'warning' | 'danger' | 'outline'

const TONES: Record<Tone, string> = {
  neutral: 'bg-beige-soft text-earth-soft',
  leaf: 'bg-leaf/18 text-forest',
  forest: 'bg-forest text-ivory',
  golden: 'bg-golden/22 text-earth',
  success: 'bg-success/14 text-success',
  warning: 'bg-warning/14 text-warning',
  danger: 'bg-danger/12 text-danger',
  outline: 'border border-beige text-earth-soft',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  as: Tag = 'span',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  as?: 'span' | 'div' | 'li'
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-1 rounded-xs px-2 py-0.5',
        'font-sans text-[0.6875rem] font-medium tracking-[0.1em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/**
 * Is a row with this status actually public right now?
 *
 * A scheduled row whose time has passed IS live — the visibility rule in the
 * database is driven by `published_at`, not by flipping `status` on a cron. An
 * editor looking at a list needs to be told the truth about that.
 *
 * A plain function rather than logic inside the component, because reading the
 * clock during render is impure: React may re-render at any moment and produce
 * different output for the same props.
 */
export function isPublicationLive(
  status: 'draft' | 'scheduled' | 'published',
  scheduledAt?: string | null,
  now: number = Date.now(),
): boolean {
  if (status === 'published') return true
  if (status !== 'scheduled' || !scheduledAt) return false
  const when = new Date(scheduledAt).getTime()
  return !Number.isNaN(when) && when <= now
}

/**
 * Status pill shared by every admin list, so state reads the same everywhere.
 *
 * Whether a scheduled row has gone live is decided by the *caller* — a server
 * component, which is where reading the clock belongs — and passed in as
 * `isLive`. Without it, a scheduled row is simply labelled "Scheduled".
 */
export function StatusBadge({
  status,
  isLive,
}: {
  status: 'draft' | 'scheduled' | 'published'
  /** Computed by the caller with isPublicationLive(). */
  isLive?: boolean
}) {
  if (status === 'published') return <Badge tone="success">Published</Badge>

  if (status === 'scheduled') {
    const live = isLive ?? false
    return live ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Scheduled</Badge>
  }

  return <Badge tone="neutral">Draft</Badge>
}

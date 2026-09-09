import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/utils/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, { wrap: string; icon: IconName; iconClass: string; role: 'status' | 'alert' }> = {
  info: {
    wrap: 'border-beige bg-ivory-soft',
    icon: 'alert',
    iconClass: 'text-earth-soft',
    role: 'status',
  },
  success: {
    wrap: 'border-success/35 bg-success/8',
    icon: 'check',
    iconClass: 'text-success',
    role: 'status',
  },
  warning: {
    wrap: 'border-warning/35 bg-warning/8',
    icon: 'alert',
    iconClass: 'text-warning',
    role: 'status',
  },
  danger: {
    wrap: 'border-danger/35 bg-danger/8',
    icon: 'alert',
    iconClass: 'text-danger',
    role: 'alert',
  },
}

/**
 * Inline message.
 *
 * `role="alert"` only for errors — an assertive live region interrupts a
 * screen reader mid-sentence, which is right for a failure and rude for a
 * confirmation.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
}) {
  const config = TONES[tone]

  return (
    <div
      role={config.role}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      className={cn('flex items-start gap-3 rounded-sm border px-4 py-3.5', config.wrap, className)}
    >
      <Icon name={config.icon} size={18} className={cn('mt-0.5', config.iconClass)} />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-[0.875rem] font-semibold text-earth">{title}</p>
        ) : null}
        {children ? (
          <div className={cn('text-[0.875rem] leading-relaxed text-earth-soft', title && 'mt-1')}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

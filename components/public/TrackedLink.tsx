'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { track } from '@/lib/analytics/client'
import type { AnalyticsEventName, AnalyticsProps } from '@/lib/analytics/events'

/**
 * A link that records one analytics event before navigating.
 *
 * `track()` uses `sendBeacon`, which is what makes this work for outbound
 * links — the request survives the page being torn down, so a WhatsApp or
 * Instagram click is actually counted rather than lost.
 */
export function TrackedLink({
  href,
  event,
  props,
  children,
  className,
  external,
  ariaLabel,
}: {
  href: string
  event: AnalyticsEventName
  props?: AnalyticsProps
  children: ReactNode
  className?: string
  external?: boolean
  ariaLabel?: string
}) {
  const isExternal = external ?? /^(?:https?:|mailto:|tel:)/i.test(href)
  const onClick = () => track(event, props)

  if (isExternal) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
        {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}

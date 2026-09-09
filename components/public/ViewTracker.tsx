'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics/client'
import type { AnalyticsEventName, AnalyticsProps } from '@/lib/analytics/events'

/**
 * Fires one analytics event when a page mounts.
 *
 * The ref guard matters: React 19 Strict Mode mounts effects twice in
 * development, which would otherwise double every view count.
 */
export function ViewTracker({
  event,
  props,
}: {
  event: AnalyticsEventName
  props?: AnalyticsProps
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    track(event, props)
  }, [event, props])

  return null
}

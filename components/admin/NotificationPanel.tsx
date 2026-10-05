'use client'

import { useActionState } from 'react'
import { retryOrderNotification, type AdminActionState } from '@/lib/orders/admin-actions'
import { NOTIFY_CHANNELS, type Notifications } from '@/lib/orders/schema'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useActionToast } from './useActionToast'

/**
 * Did the admin alert actually land?
 *
 * One row per channel, never one combined flag — "notified" would claim every
 * channel succeeded when only one did, and the one that failed is exactly the
 * one worth knowing about.
 *
 * `skipped` reads as "not set up" rather than "failed", because a channel with
 * no credentials has not gone wrong. Showing it red would train the admin to
 * ignore red.
 */
const LABELS: Record<(typeof NOTIFY_CHANNELS)[number], string> = {
  email: 'Email',
}

export function NotificationPanel({
  reference,
  notifications,
  configured,
}: {
  reference: string
  notifications: Notifications
  /** Which channels have credentials. Keyed by channel, so adding one here
   *  is the same single change as adding it to NOTIFY_CHANNELS. */
  configured: Record<(typeof NOTIFY_CHANNELS)[number], boolean>
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    retryOrderNotification,
    { status: 'idle' },
  )

  useActionToast(state, {
    title: 'Notification sent',
    description: state.status === 'saved' ? state.message : undefined,
  })

  return (
    <div className="rounded-sm border border-beige bg-ivory p-5">
      <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
        Admin alerts
      </p>

      <ul className="mt-3 grid gap-3">
        {NOTIFY_CHANNELS.map((channel) => {
          const entry = notifications[channel] ?? { status: 'pending' as const, attempts: 0 }
          const notSetUp = !configured[channel]

          return (
            <li key={channel} className="border-b border-beige pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[0.9375rem] text-earth">{LABELS[channel]}</span>
                {notSetUp ? (
                  <Badge tone="outline">Not set up</Badge>
                ) : entry.status === 'sent' ? (
                  <Badge tone="success">Sent</Badge>
                ) : entry.status === 'failed' ? (
                  <Badge tone="danger">Failed</Badge>
                ) : entry.status === 'skipped' ? (
                  <Badge tone="outline">Skipped</Badge>
                ) : (
                  <Badge tone="golden">Pending</Badge>
                )}
              </div>

              <p className="mt-1 text-[0.8125rem] text-earth-muted">
                {entry.sentAt
                  ? new Date(entry.sentAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Kolkata',
                    })
                  : notSetUp
                    ? 'Add the credentials to enable this channel.'
                    : `${entry.attempts} attempt${entry.attempts === 1 ? '' : 's'}`}
              </p>

              {/* The provider's own words, for the admin only — never for a
                  customer, and never in a toast. */}
              {entry.lastError ? (
                <p className="mt-1.5 rounded-xs bg-danger/8 px-2.5 py-1.5 font-mono text-[0.75rem] break-words text-danger">
                  {entry.lastError}
                </p>
              ) : null}

              {!notSetUp && entry.status !== 'sent' ? (
                <form action={action} className="mt-2.5">
                  <input type="hidden" name="reference" value={reference} />
                  <input type="hidden" name="channel" value={channel} />
                  <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                    {pending ? 'Sending…' : `Retry ${LABELS[channel].toLowerCase()}`}
                  </Button>
                </form>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

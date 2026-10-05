import { Badge } from '@/components/ui/Badge'
import {
  NOTIFY_CHANNELS,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  type Notifications,
  type OrderStatus,
  type PaymentStatus,
  type SheetSync,
} from '@/lib/orders/schema'

/**
 * The three things an admin reads at a glance, as badges.
 *
 * Shared between the list and the detail page so a status cannot mean one
 * colour in one place and another colour elsewhere — which is how an admin
 * stops trusting the colours at all.
 */

const STATUS_TONE: Record<OrderStatus, 'leaf' | 'golden' | 'success' | 'neutral' | 'danger'> = {
  new: 'leaf',
  confirmed: 'golden',
  preparing: 'golden',
  out_for_delivery: 'golden',
  delivered: 'success',
  cancelled: 'danger',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABELS[status] ?? status}</Badge>
}

/**
 * Pending is a warning, not a neutral fact: it is money the business is owed.
 * Paid is quiet, because a paid order needs nothing from anyone.
 */
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={status === 'paid' ? 'success' : 'warning'}>
      {status === 'paid' ? '🟢' : '🟠'} {PAYMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

/**
 * Shown ONLY when something needs attention.
 *
 * A green "notified" badge on every row is noise that trains the eye to skip
 * the column — and the one row that failed is then skipped with it.
 */
export function NotificationBadge({ notifications }: { notifications: Notifications }) {
  const failed = NOTIFY_CHANNELS.filter((c) => notifications[c].status === 'failed')
  const pending = NOTIFY_CHANNELS.filter((c) => notifications[c].status === 'pending')

  if (failed.length > 0) {
    return <Badge tone="danger">Alert failed · {failed.join(', ')}</Badge>
  }
  if (pending.length > 0) {
    return <Badge tone="outline">Alert pending</Badge>
  }
  return null
}

/**
 * Shown ONLY when the spreadsheet has fallen behind and stayed behind.
 *
 * `pending` is normal for a few seconds after every change, so badging it
 * would mean the list flickered a warning on every status move. Only a genuine
 * failure is worth the admin's attention; `skipped` means Sheets is not
 * configured, which is a setting, not a fault.
 */
export function SheetBadge({ sync }: { sync?: SheetSync }) {
  if (sync?.status !== 'failed') return null
  return <Badge tone="warning">Sheet sync failed</Badge>
}

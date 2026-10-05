'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import {
  advanceOrder,
  getOrder,
  resetNotificationChannel,
  setPaymentStatus,
} from './repository'
import {
  NOTIFY_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  type NotifyChannel,
  type OrderStatus,
  type PaymentStatus,
} from './schema'
import { deliverOrderNotifications } from '@/lib/notify/dispatch'
import { queueSheetSync } from '@/lib/sheets/sync'

/**
 * The admin's actions on an order.
 *
 * Every one of these checks auth INSIDE the function, not only on the page
 * that renders the button. The Next docs are explicit that Server Functions
 * are reachable by direct POST — hiding a button protects nobody.
 *
 * They all return a result rather than throwing, so a rejected move shows as a
 * toast with a reason. A thrown error here surfaces as the error boundary and
 * takes the order list down with it.
 */

export type AdminActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'saved'; message: string }

async function admin(): Promise<{ email: string } | null> {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}

function refresh(reference: string): void {
  revalidatePath('/admin')
  revalidatePath(`/admin/orders/${reference}`)
}

/**
 * Push the change out to the spreadsheet, in the background.
 *
 * MongoDB has already been written by the time this runs — that ordering is
 * the whole architecture. The projection catches up afterwards, and if it
 * cannot, the order is still correct and the admin sees a failed sync.
 *
 * The order is re-read rather than reusing the one from the update, so the
 * rows written reflect every field as it now stands.
 */
async function reprojectToSheet(reference: string): Promise<void> {
  try {
    const order = await getOrder(reference)
    if (order) await queueSheetSync(order)
  } catch (error) {
    console.error('[sheets] could not queue re-projection', error)
  }
}

// ---------------------------------------------------------------------------

export async function setOrderStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const who = await admin()
  if (!who) return { status: 'error', message: 'Your session has expired. Please sign in again.' }

  const reference = String(formData.get('reference') ?? '')
  const from = String(formData.get('from') ?? '') as OrderStatus
  const to = String(formData.get('to') ?? '') as OrderStatus

  if (!ORDER_STATUSES.includes(from) || !ORDER_STATUSES.includes(to)) {
    return { status: 'error', message: 'Unknown status.' }
  }

  try {
    // advanceOrder matches on the current status, so a stale page cannot apply
    // a move twice: it returns null rather than overwriting someone else's
    // change. That is a conflict to report, not a failure to log.
    const moved = await advanceOrder(reference, from, to, who.email)
    if (!moved) {
      return {
        status: 'error',
        message: `${reference} is no longer ${STATUS_LABELS[from].toLowerCase()}. Reload to see where it is now.`,
      }
    }
  } catch (error) {
    console.error('[orders] status change failed', error)
    return { status: 'error', message: 'Could not update the order. Please try again.' }
  }

  refresh(reference)
  await reprojectToSheet(reference)
  return { status: 'saved', message: `${reference} is now ${STATUS_LABELS[to].toLowerCase()}.` }
}

// ---------------------------------------------------------------------------

/**
 * Record that the rider came back with the money — or undo it.
 *
 * Deliberately NOT tied to delivery. An order can be delivered and unpaid, and
 * a system that cannot say so quietly loses cash.
 */
export async function setOrderPayment(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const who = await admin()
  if (!who) return { status: 'error', message: 'Your session has expired. Please sign in again.' }

  const reference = String(formData.get('reference') ?? '')
  const from = String(formData.get('from') ?? '') as PaymentStatus
  const to = String(formData.get('to') ?? '') as PaymentStatus

  if (!PAYMENT_STATUSES.includes(from) || !PAYMENT_STATUSES.includes(to) || from === to) {
    return { status: 'error', message: 'Unknown payment status.' }
  }

  try {
    const updated = await setPaymentStatus(reference, from, to, who.email)
    if (!updated) {
      return {
        status: 'error',
        message: `${reference} is no longer marked ${from}. Reload to see the current state.`,
      }
    }
  } catch (error) {
    console.error('[orders] payment change failed', error)
    return { status: 'error', message: 'Could not update payment. Please try again.' }
  }

  refresh(reference)
  await reprojectToSheet(reference)
  return {
    status: 'saved',
    message:
      to === 'paid'
        ? `Payment recorded for ${reference}.`
        : `Payment for ${reference} set back to pending.`,
  }
}

// ---------------------------------------------------------------------------

/**
 * Send the admin notification again.
 *
 * Awaited rather than backgrounded: the admin pressed a button and is waiting
 * for an answer, so "did it work this time?" is the whole point. The channel is
 * reset first, so the retry starts from a clean attempt count.
 */
export async function retryOrderNotification(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const who = await admin()
  if (!who) return { status: 'error', message: 'Your session has expired. Please sign in again.' }

  const reference = String(formData.get('reference') ?? '')
  const channelRaw = String(formData.get('channel') ?? '')
  const channel = NOTIFY_CHANNELS.includes(channelRaw as NotifyChannel)
    ? (channelRaw as NotifyChannel)
    : undefined

  const order = await getOrder(reference)
  if (!order) return { status: 'error', message: 'That order no longer exists.' }

  try {
    if (channel) await resetNotificationChannel(reference, channel)
    // `force`: the admin pressed Retry, which means send it again even if the
    // channel is recorded as sent. The automatic sweep never forces.
    await deliverOrderNotifications(order, { ...(channel ? { only: channel } : {}), force: true })
  } catch (error) {
    console.error('[orders] notification retry failed', error)
    return { status: 'error', message: 'Could not send. Check the notification settings.' }
  }

  const after = await getOrder(reference)
  // Only the channels this retry actually attempted. Reporting on a channel
  // that was never tried makes a single-channel retry report the others too.
  const attempted = channel ? [channel] : [...NOTIFY_CHANNELS]
  const failed = attempted.filter((c) => after?.notifications[c].status === 'failed')

  refresh(reference)

  // Report what actually happened, not what was attempted. "Sent" on a channel
  // that has just failed again is the one message that makes this button
  // worse than useless.
  if (failed.length > 0) {
    return {
      status: 'error',
      message: `Still failing: ${failed.join(', ')}. The error is shown on the order.`,
    }
  }
  return {
    status: 'saved',
    message: `${attempted.join(' and ')} sent for ${reference}.`,
  }
}

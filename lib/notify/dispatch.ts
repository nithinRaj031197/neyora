import 'server-only'
import { recordNotification } from '@/lib/orders/repository'
import type { NotifyChannel, Order } from '@/lib/orders/schema'
import { absoluteUrl } from '@/lib/env'
import { runAfterResponse } from '@/lib/background'
import { buildOrderMessage } from './message'
import { PROVIDERS, type DeliveryResult, type Provider } from './providers'

/**
 * Tell the admin an order arrived.
 *
 * The contract this module exists to keep: **a notification failure must never
 * reach the customer**. `notifyNewOrder` resolves successfully whatever the
 * providers do; the only record of a failure is on the order document, where
 * the dashboard can show it and an admin can retry.
 */

export function adminOrderUrl(reference: string): string {
  return absoluteUrl(`/admin/orders/${encodeURIComponent(reference)}`)
}

/**
 * Deliver one order to every channel and record each outcome.
 *
 * Channels run in parallel and are settled independently: one being down must
 * not stop another, because the point of having more than one is that one of
 * them gets through.
 */
export async function deliverOrderNotifications(
  order: Order,
  options: { only?: NotifyChannel; force?: boolean } = {},
): Promise<void> {
  const message = buildOrderMessage(order, adminOrderUrl(order.reference))

  /*
   * A channel that has already been SENT is never sent again.
   *
   * This is what stops the retry sweep from spamming. An order where one
   * channel landed and another failed is still "needs attention", so the sweep
   * picks it up — and without this guard every pass would re-deliver the
   * message the admin already read. After five sweeps that is five copies of
   * one order.
   *
   * `force` exists for the admin's explicit per-channel Retry button, which
   * resets the channel first and genuinely means "send it again".
   */
  const providers: readonly Provider[] = PROVIDERS.filter((provider) => {
    if (options.only && provider.name !== options.only) return false
    if (options.force) return true
    return order.notifications[provider.name]?.status !== 'sent'
  })

  if (providers.length === 0) return

  await Promise.all(
    providers.map(async (provider) => {
      const result: DeliveryResult = await provider.send(message).catch(
        (error: unknown): DeliveryResult => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )

      try {
        await recordNotification(order.reference, provider.name, result)
      } catch (error) {
        // The message may well have been delivered; we just cannot say so.
        // Logged rather than thrown — this runs after the customer has gone.
        console.error(`[notify] could not record ${provider.name} result`, error)
      }

      if (!result.ok && !result.skipped) {
        console.error(`[notify] ${provider.name} failed for ${order.reference}:`, result.error)
      }
    }),
  )
}

/**
 * Fire-and-forget, for the order action.
 *
 * Returns immediately. The customer's confirmation does not wait on an email
 * provider, and nothing this does can turn a stored order into an error on
 * their screen.
 */
export async function notifyNewOrder(order: Order): Promise<void> {
  await runAfterResponse(deliverOrderNotifications(order), 'notify')
}

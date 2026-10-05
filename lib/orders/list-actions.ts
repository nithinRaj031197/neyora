'use server'

import { requireAdmin } from '@/lib/auth/session'
import { listOrders } from './repository'
import type { Order, OrderStatus, PaymentStatus } from './schema'

/**
 * Loading the next page of orders.
 *
 * Auth is checked INSIDE the function. A Server Function is reachable by
 * direct POST, so the page that renders the button protects nothing.
 */

export interface LoadMoreResult {
  orders: Order[]
  nextCursor: string | null
  error?: string
}

/** The next page. The cursor comes from the previous one and is opaque. */
export async function loadMoreOrders(input: {
  cursor: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  search?: string
}): Promise<LoadMoreResult> {
  try {
    await requireAdmin()
  } catch {
    return { orders: [], nextCursor: null, error: 'Your session has expired. Please sign in again.' }
  }

  try {
    const page = await listOrders({
      cursor: input.cursor,
      status: input.status,
      paymentStatus: input.paymentStatus,
      search: input.search,
      limit: 20,
    })
    return { orders: page.orders, nextCursor: page.nextCursor }
  } catch (error) {
    console.error('[orders] could not load more', error)
    return { orders: [], nextCursor: null, error: 'Could not load more orders.' }
  }
}

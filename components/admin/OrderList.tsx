'use client'

import { useState, useTransition } from 'react'
import { loadMoreOrders } from '@/lib/orders/list-actions'
import type { Order, OrderStatus, PaymentStatus } from '@/lib/orders/schema'
import { OrderRow } from './OrderRow'
import { Button } from '@/components/ui/Button'

/**
 * The order list, one page at a time.
 *
 * The first page is rendered on the server and handed in — so the dashboard is
 * useful before any JavaScript runs, and "load more" is an enhancement rather
 * than the only way to see anything.
 *
 * An explicit button, not infinite scroll. The admin is working through a list
 * of jobs, and a list that grows as you look for the bottom of it is hostile to
 * that: there is no "I have seen everything" moment, and the page gets slower
 * the longer it is open.
 */
export function OrderList({
  initialOrders,
  initialCursor,
  filters,
}: {
  initialOrders: Order[]
  initialCursor: string | null
  /** Carried into every "load more" so the next page matches the first. */
  filters: { status?: OrderStatus; paymentStatus?: PaymentStatus; search?: string }
}) {
  const [orders, setOrders] = useState(initialOrders)
  const [cursor, setCursor] = useState(initialCursor)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const loadMore = () => {
    if (!cursor) return
    setError(null)
    startTransition(async () => {
      const result = await loadMoreOrders({ cursor, ...filters })
      if (result.error) {
        setError(result.error)
        return
      }
      /*
       * Appended, and de-duplicated by reference.
       *
       * The cursor makes a duplicate impossible server-side, but a double
       * click fires two requests with the same cursor and both return the same
       * page. Keying by reference means the second is a no-op instead of
       * printing every order twice.
       */
      setOrders((current) => {
        const seen = new Set(current.map((order) => order.reference))
        return [...current, ...result.orders.filter((order) => !seen.has(order.reference))]
      })
      setCursor(result.nextCursor)
    })
  }

  return (
    <>
      <ul className="mt-6 grid gap-3">
        {orders.map((order) => (
          <OrderRow key={order.reference} order={order} />
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-4 rounded-xs bg-danger/10 px-3.5 py-2.5 text-[0.875rem] text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-2">
        {cursor ? (
          <Button type="button" variant="secondary" onClick={loadMore} disabled={pending}>
            {pending ? 'Loading…' : 'Load more orders'}
          </Button>
        ) : orders.length > 0 ? (
          <p className="text-[0.8125rem] text-earth-muted">That is every order.</p>
        ) : null}

        {/* The count is a live region: after "load more" the only thing that
            changed is further down the page, out of view. */}
        <p aria-live="polite" className="text-[0.75rem] text-earth-muted">
          Showing {orders.length} order{orders.length === 1 ? '' : 's'}
        </p>
      </div>
    </>
  )
}

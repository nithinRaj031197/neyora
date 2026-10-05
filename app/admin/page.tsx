import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import {
  countByStatus,
  countUnpaid,
  lastSheetSync,
  listOrders,
  listUnsynced,
} from '@/lib/orders/repository'
import {
  NOTIFY_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/orders/schema'
import { OrderList } from '@/components/admin/OrderList'
import { OrderFilters } from '@/components/admin/OrderFilters'
import { SheetSyncPanel } from '@/components/admin/SheetSyncPanel'
import { sheetsReadiness } from '@/lib/sheets/config'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

/**
 * The summary strip. Only the statuses that represent work — delivered and
 * cancelled are history, and a dashboard that counts finished things as
 * prominently as pending ones gives you nothing to act on.
 */
const SUMMARY: OrderStatus[] = ['new', 'confirmed', 'out_for_delivery']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; q?: string }>
}) {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const params = await searchParams
  /*
   * Validated against the enums before they reach a query. A status that does
   * not exist should return "no orders", not an error page — and must never be
   * interpolated into a filter unchecked.
   */
  const status = ORDER_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined
  const paymentStatus = PAYMENT_STATUSES.includes(params.payment as PaymentStatus)
    ? (params.payment as PaymentStatus)
    : undefined
  const search = params.q?.trim() || undefined

  const [page, counts, unpaid, unsynced, lastSyncedAt] = await Promise.all([
    // One page. The collection is never loaded into the browser, and this
    // query is served entirely by the (createdAt, reference) index.
    listOrders({ status, paymentStatus, search, limit: 20 }),
    countByStatus(),
    countUnpaid(),
    listUnsynced({ limit: 50 }),
    lastSheetSync(),
  ])

  const orders = page.orders
  const filtered = Boolean(status || paymentStatus || search)

  // Only the page in hand: an alert that failed on an order further down the
  // list is surfaced by the badge on that row when it is loaded.
  const needsAlert = orders.filter((order) =>
    NOTIFY_CHANNELS.some((c) => order.notifications[c]?.status === 'failed'),
  )

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.75rem] text-forest">Orders</h1>
        <p className="text-[0.8125rem] text-earth-muted">
          {Object.values(counts).reduce((sum, n) => sum + n, 0)} orders in total
        </p>
      </div>

      {/*
        Four cards, not a sentence of counts. The number an admin wants at a
        glance is "how many are waiting on me", and a count you have to read a
        comma-separated list to find is not at a glance.
      */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY.map((status) => (
          <div key={status} className="rounded-sm border border-beige bg-ivory p-4">
            <dt className="text-[0.75rem] tracking-[0.08em] text-earth-muted uppercase">
              {STATUS_LABELS[status]}
            </dt>
            <dd className="mt-1.5 font-display text-[1.75rem] leading-none text-forest">
              {counts[status] ?? 0}
            </dd>
          </div>
        ))}
        {/* Money owed, not money taken: the number that actually needs chasing. */}
        <div className="rounded-sm border border-beige bg-ivory p-4">
          <dt className="text-[0.75rem] tracking-[0.08em] text-earth-muted uppercase">
            Unpaid
          </dt>
          <dd className="mt-1.5 font-display text-[1.75rem] leading-none text-forest">
            {formatPrice(unpaid.value, 'INR')}
          </dd>
          <dd className="mt-0.5 text-[0.75rem] text-earth-muted">
            {unpaid.orders} order{unpaid.orders === 1 ? '' : 's'}
          </dd>
        </div>
      </dl>

      {/* Only when something is wrong. A permanent banner is wallpaper. */}
      {needsAlert.length > 0 ? (
        <p
          role="status"
          className="mt-6 flex items-start gap-2.5 rounded-sm border border-danger/35 bg-danger/8 px-4 py-3 text-[0.875rem] text-danger"
        >
          <Icon name="alert" size={17} className="mt-0.5 shrink-0" />
          <span>
            {needsAlert.length} order{needsAlert.length === 1 ? '' : 's'} did not reach you by
            email. Open{' '}
            {needsAlert.slice(0, 3).map((order, index) => (
              <span key={order.reference}>
                {index > 0 ? ', ' : ''}
                <Link
                  href={`/admin/orders/${order.reference}`}
                  className="font-mono underline underline-offset-4"
                >
                  {order.reference}
                </Link>
              </span>
            ))}
            {needsAlert.length > 3 ? ' and others' : ''} to retry.
          </span>
        </p>
      ) : null}

      <OrderFilters status={status} paymentStatus={paymentStatus} search={search} />

      <SheetSyncPanel
        configured={sheetsReadiness()}
        behind={unsynced.length}
        lastSyncedAt={lastSyncedAt}
      />

      {orders.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-beige bg-ivory p-12 text-center">
          <Icon name="clock" size={24} className="mx-auto text-earth-muted/60" />
          <p className="mt-4 text-[1rem] text-earth-soft">
            {filtered ? 'No orders match these filters' : 'No orders yet'}
          </p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.875rem] leading-relaxed text-earth-muted">
            {filtered
              ? 'Clear the filters above to see everything.'
              : 'They appear here the moment a customer places one, and an email lands in your inbox at the same time.'}
          </p>
        </div>
      ) : (
        <OrderList
          // Remounts when the filters change, so a page from the previous
          // query can never be appended under a new one.
          key={`${status ?? ''}|${paymentStatus ?? ''}|${search ?? ''}`}
          initialOrders={orders}
          initialCursor={page.nextCursor}
          filters={{ status, paymentStatus, search }}
        />
      )}
    </>
  )
}

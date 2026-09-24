import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { countByStatus, listOrders } from '@/lib/orders/repository'
import { setOrderStatus } from '@/lib/orders/admin-actions'
import { STATUS_LABELS, STATUS_TRANSITIONS, type OrderStatus } from '@/lib/orders/schema'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

const TONE: Record<OrderStatus, string> = {
  new: 'bg-leaf/20 text-forest',
  called: 'bg-golden/20 text-earth',
  confirmed: 'bg-botanical/20 text-forest',
  delivered: 'bg-beige text-earth-soft',
  cancelled: 'bg-danger/15 text-danger',
}

export default async function AdminOrdersPage() {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const [orders, counts] = await Promise.all([listOrders({ limit: 200 }), countByStatus()])

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.75rem] text-forest">Orders</h1>
        <p className="text-[0.875rem] text-earth-muted">
          {Object.entries(counts).map(([k, n]) => `${STATUS_LABELS[k as OrderStatus] ?? k}: ${n}`).join(' · ') || 'No orders yet'}
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 rounded-sm border border-beige bg-ivory p-8 text-center text-[0.9375rem] text-earth-muted">
          No orders yet. They appear here the moment a customer places one.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {orders.map((order) => (
            <li key={order.reference} className="rounded-sm border border-beige bg-ivory p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[0.9375rem] text-forest">{order.reference}</span>
                    <span className={`rounded-xs px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.1em] uppercase ${TONE[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-[1rem] text-earth">
                    {order.customer.name} ·{' '}
                    <a href={`tel:+91${order.customer.phone}`} className="font-mono text-forest underline underline-offset-4">
                      {order.customer.phone}
                    </a>
                  </p>
                  <p className="text-[0.875rem] text-earth-muted">{order.customer.area}</p>
                  {order.customer.note ? (
                    <p className="mt-1 text-[0.875rem] text-earth-soft italic">“{order.customer.note}”</p>
                  ) : null}
                  <ul className="mt-3 text-[0.875rem] text-earth-soft">
                    {order.items.map((item) => (
                      <li key={item.productSlug}>
                        {item.quantity} × {item.name} ({item.packLabel})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-right">
                  <p className="font-display text-[1.375rem] text-forest">
                    {formatPrice(order.total, 'INR')}
                  </p>
                  <p className="text-[0.75rem] text-earth-muted">
                    {new Date(order.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {STATUS_TRANSITIONS[order.status].map((next) => (
                      <form key={next} action={setOrderStatus}>
                        <input type="hidden" name="reference" value={order.reference} />
                        <input type="hidden" name="from" value={order.status} />
                        <input type="hidden" name="to" value={next} />
                        <button
                          type="submit"
                          className={`press h-9 rounded-xs border px-3 text-[0.8125rem] ${
                            next === 'cancelled'
                              ? 'border-danger/40 text-danger hover:bg-danger/5'
                              : 'border-forest/30 text-forest hover:bg-forest/5'
                          }`}
                        >
                          Mark {STATUS_LABELS[next].toLowerCase()}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

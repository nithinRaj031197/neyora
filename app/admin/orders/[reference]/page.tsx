import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getOrder } from '@/lib/orders/repository'
import { STATUS_LABELS, addressLines } from '@/lib/orders/schema'
import { notifyReadiness } from '@/lib/notify/config'
import { OrderStatusActions } from '@/components/admin/OrderStatusActions'
import { PaymentControl } from '@/components/admin/PaymentControl'
import { NotificationPanel } from '@/components/admin/NotificationPanel'
import { PaymentBadge, StatusBadge } from '@/components/admin/OrderBadges'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

const ist = (date: Date | string) =>
  new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

/**
 * One order, in full.
 *
 * Everything needed to fulfil it on one screen: who, where, what, how much,
 * whether the money arrived, whether the alert reached anyone, and what was
 * done to it so far. The list is for triage; this is for doing the work.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const { reference } = await params
  const order = await getOrder(decodeURIComponent(reference))
  if (!order) notFound()

  const configured = notifyReadiness()

  return (
    <>
      <Link
        href="/admin"
        className="press inline-flex items-center gap-1.5 text-[0.875rem] text-earth-muted hover:text-forest"
      >
        <Icon name="chevron-right" size={15} className="rotate-180" />
        All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-[1.5rem] text-forest">{order.reference}</h1>
          <p className="mt-1.5 text-[0.875rem] text-earth-muted">
            Placed {ist(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.payment.status} />
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* Left: what to do and where to take it ------------------------- */}
        <div className="grid gap-5">
          <section className="rounded-sm border border-beige bg-ivory p-5">
            <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
              Customer
            </p>
            <p className="mt-3 text-[1.0625rem] text-earth">{order.customer.name}</p>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
              <a
                href={`tel:+91${order.customer.phone}`}
                className="press inline-flex items-center gap-1.5 font-mono text-forest underline underline-offset-4 hover:text-botanical"
              >
                <Icon name="phone" size={15} />
                +91 {order.customer.phone}
              </a>
              <a
                href={`https://wa.me/91${order.customer.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1.5 text-forest underline underline-offset-4 hover:text-botanical"
              >
                <Icon name="whatsapp" size={15} />
                WhatsApp
              </a>
            </div>

            <p className="mt-5 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
              Delivery address
            </p>
            <address className="mt-2 grid gap-0.5 text-[0.9375rem] not-italic text-earth">
              {addressLines(order.customer.address).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>

            {order.customer.note ? (
              <>
                <p className="mt-5 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
                  Customer note
                </p>
                <p className="mt-2 border-l-2 border-beige pl-3 text-[0.9375rem] text-earth-soft italic">
                  {order.customer.note}
                </p>
              </>
            ) : null}
          </section>

          <section className="rounded-sm border border-beige bg-ivory p-5">
            <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
              Items
            </p>
            <ul className="mt-3 grid gap-2.5">
              {order.items.map((item) => (
                <li
                  key={item.productSlug}
                  className="flex flex-wrap items-baseline justify-between gap-3 text-[0.9375rem]"
                >
                  <span className="text-earth">
                    <span className="font-medium text-forest">{item.quantity} ×</span>{' '}
                    {item.name}
                    {item.variety ? (
                      <span className="text-earth-muted"> · {item.variety}</span>
                    ) : null}{' '}
                    <span className="text-earth-muted">({item.packLabel})</span>
                  </span>
                  <span className="text-earth-soft">
                    {formatPrice(item.unitPrice * item.quantity, 'INR')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-baseline justify-between border-t border-beige pt-4">
              <span className="text-[0.9375rem] text-earth-soft">Total</span>
              <span className="font-display text-[1.5rem] text-forest">
                {formatPrice(order.total, 'INR')}
              </span>
            </p>
          </section>

          <section className="rounded-sm border border-beige bg-ivory p-5">
            <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
              Move this order on
            </p>
            <div className="mt-3">
              <OrderStatusActions
                reference={order.reference}
                status={order.status}
                align="start"
              />
            </div>
            {(order.status === 'delivered' || order.status === 'cancelled') && (
              <p className="mt-2 text-[0.8125rem] text-earth-muted">
                {STATUS_LABELS[order.status]} is final — there is nothing further to do.
              </p>
            )}
          </section>
        </div>

        {/* Right: money, alerts and the paper trail ----------------------- */}
        <div className="grid gap-5">
          <PaymentControl reference={order.reference} payment={order.payment} />

          <NotificationPanel
            reference={order.reference}
            notifications={order.notifications}
            configured={configured}
          />

          <section className="rounded-sm border border-beige bg-ivory p-5">
            <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
              History
            </p>
            <ol className="mt-3 grid gap-2.5">
              {order.history.map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="text-[0.875rem]">
                  <span className="text-earth">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                  <span className="text-earth-muted"> · {ist(entry.at)}</span>
                  {entry.by ? <span className="text-earth-muted"> · {entry.by}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  )
}

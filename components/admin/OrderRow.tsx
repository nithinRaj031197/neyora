import Link from 'next/link'
import { formatAddress, type Order } from '@/lib/orders/schema'
import { OrderStatusActions } from './OrderStatusActions'
import { NotificationBadge, PaymentBadge, StatusBadge, SheetBadge } from './OrderBadges'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

/**
 * One order in the list.
 *
 * Extracted so the server-rendered first page and the client-rendered "load
 * more" pages cannot drift into looking different — which is exactly what
 * happens when a list is duplicated across a boundary.
 */
export function OrderRow({ order }: { order: Order }) {
  return (
    <li className="rounded-sm border border-beige bg-ivory p-5 transition-colors duration-200 ease-(--ease-out-soft) hover:border-forest/25 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* The reference is the link: one obvious way into the order, in
                the place the eye already lands. */}
            <Link
              href={`/admin/orders/${order.reference}`}
              className="press font-mono text-[0.9375rem] text-forest underline underline-offset-4 hover:text-botanical"
            >
              {order.reference}
            </Link>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment.status} />
            <NotificationBadge notifications={order.notifications} />
            <SheetBadge sync={order.sheetSync} />
          </div>

          <p className="mt-2.5 text-[1rem] text-earth">{order.customer.name}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem]">
            {/* tel: and wa.me are the two things the admin does next — both one
                tap from here rather than a copy-paste. */}
            <a
              href={`tel:+91${order.customer.phone}`}
              className="press inline-flex items-center gap-1.5 font-mono text-forest underline underline-offset-4 hover:text-botanical"
            >
              <Icon name="phone" size={14} />
              {order.customer.phone}
            </a>
            <a
              href={`https://wa.me/91${order.customer.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 text-forest underline underline-offset-4 hover:text-botanical"
            >
              <Icon name="whatsapp" size={14} />
              WhatsApp
            </a>
          </div>

          <p className="mt-1.5 max-w-[60ch] text-[0.875rem] text-earth-muted">
            {formatAddress(order.customer.address)}
          </p>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem] text-earth-soft">
            {order.items.map((item) => (
              <li key={item.productSlug}>
                <span className="font-medium text-earth">{item.quantity}×</span>{' '}
                {item.variety ?? item.name}{' '}
                <span className="text-earth-muted">({item.packLabel})</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-auto text-right">
          <p className="font-display text-[1.375rem] text-forest">
            {formatPrice(order.total, 'INR')}
          </p>
          <p className="text-[0.75rem] text-earth-muted">
            {new Date(order.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Kolkata',
            })}
          </p>
          <div className="mt-3">
            <OrderStatusActions reference={order.reference} status={order.status} />
          </div>
        </div>
      </div>
    </li>
  )
}

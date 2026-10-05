'use client'

import { useActionState } from 'react'
import { setOrderPayment, type AdminActionState } from '@/lib/orders/admin-actions'
import {
  PAYMENT_METHOD_LABELS,
  type Payment,
} from '@/lib/orders/schema'
import { Button } from '@/components/ui/Button'
import { PaymentBadge } from './OrderBadges'
import { ConfirmButton } from './ConfirmButton'
import { useActionToast } from './useActionToast'

/**
 * Collect payment, or correct a mistake.
 *
 * Payment is a separate axis from order status on purpose: the rider can hand
 * over the pack and come back without the cash, and a model that infers "paid"
 * from "delivered" quietly loses that money.
 *
 * Marking paid is one tap, because it happens every day. Reversing it asks
 * first, because it is a correction to a financial record and should never be
 * the result of a mis-tap.
 */
export function PaymentControl({
  reference,
  payment,
}: {
  reference: string
  payment: Payment
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setOrderPayment, {
    status: 'idle',
  })

  useActionToast(state, {
    title: 'Payment updated',
    description: state.status === 'saved' ? state.message : undefined,
  })

  const paid = payment.status === 'paid'

  return (
    <div className="rounded-sm border border-beige bg-ivory p-5">
      <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
        Payment
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[0.9375rem] text-earth">
          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
        </span>
        <PaymentBadge status={payment.status} />
      </div>

      {paid && payment.paidAt ? (
        <p className="mt-2 text-[0.8125rem] text-earth-muted">
          Paid on{' '}
          {new Date(payment.paidAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Kolkata',
          })}
          {payment.updatedBy ? ` · ${payment.updatedBy}` : ''}
        </p>
      ) : (
        <p className="mt-2 text-[0.8125rem] text-earth-muted">
          Collect on delivery. Nothing has been charged online.
        </p>
      )}

      {/*
        The trail, not just the current value. A reversal clears `paidAt`, so
        without this the fact that payment was once recorded would disappear —
        which is exactly the event worth keeping.
      */}
      {payment.history && payment.history.length > 1 ? (
        <ol className="mt-3 grid gap-1 border-t border-beige pt-3">
          {payment.history.map((entry, index) => (
            <li key={`${entry.status}-${index}`} className="text-[0.75rem] text-earth-muted">
              {entry.status === 'paid' ? 'Marked paid' : 'Reversed to pending'} ·{' '}
              {new Date(entry.at).toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              })}{' '}
              · {entry.by}
            </li>
          ))}
        </ol>
      ) : null}

      <form action={action} className="mt-4">
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="from" value={payment.status} />

        {paid ? (
          <ConfirmButton
            name="to"
            value="pending"
            size="sm"
            variant="ghost"
            disabled={pending}
            confirm={`Mark ${reference} as unpaid again? Only do this if the payment was recorded by mistake.`}
            className="text-danger hover:bg-danger/8 hover:text-danger"
          >
            Reverse — not actually paid
          </ConfirmButton>
        ) : (
          <Button type="submit" name="to" value="paid" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Mark as paid'}
          </Button>
        )}
      </form>
    </div>
  )
}

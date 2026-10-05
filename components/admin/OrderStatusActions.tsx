'use client'

import { useActionState } from 'react'
import { setOrderStatus, type AdminActionState } from '@/lib/orders/admin-actions'
import { STATUS_LABELS, STATUS_TRANSITIONS, type OrderStatus } from '@/lib/orders/schema'
import { Button } from '@/components/ui/Button'
import { useActionToast } from './useActionToast'
import { ConfirmButton } from './ConfirmButton'

/**
 * The moves available from an order's current status.
 *
 * One `useActionState` for the whole row rather than one per button: the moves
 * are mutually exclusive, so a single pending flag correctly disables all of
 * them while any one is in flight. That is what stops a double-tap on a slow
 * connection trying two transitions at once.
 */
export function OrderStatusActions({
  reference,
  status,
  align = 'end',
}: {
  reference: string
  status: OrderStatus
  align?: 'start' | 'end'
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setOrderStatus, {
    status: 'idle',
  })

  useActionToast(state, {
    title: 'Order updated',
    description: state.status === 'saved' ? state.message : undefined,
  })

  const moves = STATUS_TRANSITIONS[status] ?? []
  if (moves.length === 0) return null

  return (
    <form
      action={action}
      className={`flex flex-wrap gap-2 ${align === 'end' ? 'justify-end' : 'justify-start'}`}
    >
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="from" value={status} />

      {moves.map((next) =>
        next === 'cancelled' ? (
          /*
           * Cancelling is destructive and final — there is no transition back
           * out of it — so it asks first. Everything else is a forward step
           * that the next step corrects anyway.
           */
          <ConfirmButton
            key={next}
            name="to"
            value={next}
            disabled={pending}
            confirm={`Cancel ${reference}? This cannot be undone.`}
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-danger/8 hover:text-danger"
          >
            Cancel order
          </ConfirmButton>
        ) : (
          <Button key={next} type="submit" name="to" value={next} size="sm" variant="secondary" disabled={pending}>
            {STATUS_LABELS[next]}
          </Button>
        ),
      )}
    </form>
  )
}

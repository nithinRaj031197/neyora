'use client'

import { useActionState, useState } from 'react'
import { placeOrder, type OrderFormState } from '@/lib/orders/actions'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

/**
 * Place an order for one product.
 *
 * Deliberately short: name, phone, area, quantity. Every extra field is a
 * customer who abandons the form, and we phone them to confirm anyway — so
 * anything we can ask on the call does not belong here.
 *
 * No price is submitted. The server looks it up from the product by slug.
 */
export function OrderForm({
  productSlug,
  productName,
  packLabel,
  unitPrice,
  currency,
  whatsappHref,
}: {
  productSlug: string
  productName: string
  packLabel: string
  unitPrice: number
  currency: string
  whatsappHref?: string | null
}) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(placeOrder, {
    status: 'idle',
  })
  const [quantity, setQuantity] = useState(1)

  if (state.status === 'success') {
    return (
      <div className="rounded-sm border border-botanical/40 bg-ivory-soft p-6">
        <p className="eyebrow text-botanical">Order received</p>
        <p className="mt-3 font-display text-[1.75rem] leading-tight text-forest">
          Thank you, {state.name}.
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-earth-soft">
          Your reference is{' '}
          <strong className="font-mono text-forest">{state.reference}</strong>. We will
          call you shortly to confirm the order and delivery time. Nothing has been
          charged — payment is arranged on the call.
        </p>
        <p className="mt-4 text-[0.9375rem] text-earth-soft">
          Total: <strong className="text-forest">{formatPrice(state.total, currency)}</strong>
        </p>
      </div>
    )
  }

  const err = state.status === 'error' ? state.fieldErrors : undefined
  const field =
    'h-12 w-full rounded-xs border bg-ivory px-3.5 text-[0.9375rem] text-earth ' +
    'placeholder:text-earth-muted/70 focus-visible:outline-2 focus-visible:outline-leaf'

  return (
    <form action={action} className="rounded-sm border border-beige bg-ivory-soft p-6">
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="quantity" value={quantity} />

      <p className="eyebrow text-botanical">Place an order</p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-earth-soft">
        We will call you to confirm. No payment is taken here.
      </p>

      {/* Quantity. Buttons rather than a number input: this is used one-handed
          on a phone, where a stepper beats a keyboard. */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="text-[0.9375rem] text-earth">
          {productName} <span className="text-earth-muted">· {packLabel}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="press flex size-10 items-center justify-center rounded-xs border border-forest/30 text-forest disabled:opacity-35"
          >
            −
          </button>
          <output
            aria-live="polite"
            aria-label={`Quantity: ${quantity}`}
            className="w-10 text-center font-mono text-[1rem] text-forest"
          >
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            disabled={quantity >= 50}
            aria-label="Increase quantity"
            className="press flex size-10 items-center justify-center rounded-xs border border-forest/30 text-forest disabled:opacity-35"
          >
            +
          </button>
        </div>
      </div>

      <p className="mt-3 border-t border-beige pt-3 text-[0.9375rem] text-earth-soft">
        Total{' '}
        <strong className="font-display text-[1.375rem] text-forest">
          {formatPrice(unitPrice * quantity, currency)}
        </strong>
      </p>

      <div className="mt-5 grid gap-3">
        <div>
          <label htmlFor="order-name" className="sr-only">Your name</label>
          <input
            id="order-name" name="name" required autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(err?.name)}
            className={cn(field, err?.name ? 'border-danger' : 'border-beige')}
          />
          {err?.name ? <p className="mt-1 text-[0.8125rem] text-danger">{err.name}</p> : null}
        </div>

        <div>
          <label htmlFor="order-phone" className="sr-only">Mobile number</label>
          <input
            id="order-phone" name="phone" required type="tel" inputMode="tel"
            autoComplete="tel" placeholder="Mobile number"
            aria-invalid={Boolean(err?.phone)}
            className={cn(field, err?.phone ? 'border-danger' : 'border-beige')}
          />
          {err?.phone ? <p className="mt-1 text-[0.8125rem] text-danger">{err.phone}</p> : null}
        </div>

        <div>
          <label htmlFor="order-area" className="sr-only">Delivery area</label>
          <input
            id="order-area" name="area" required autoComplete="address-level2"
            placeholder="Delivery area, e.g. Koramangala"
            aria-invalid={Boolean(err?.area)}
            className={cn(field, err?.area ? 'border-danger' : 'border-beige')}
          />
          {err?.area ? <p className="mt-1 text-[0.8125rem] text-danger">{err.area}</p> : null}
        </div>

        <div>
          <label htmlFor="order-note" className="sr-only">Anything else?</label>
          <textarea
            id="order-note" name="note" rows={2}
            placeholder="Anything else? (optional)"
            className="w-full rounded-xs border border-beige bg-ivory px-3.5 py-2.5 text-[0.9375rem] text-earth placeholder:text-earth-muted/70 focus-visible:outline-2 focus-visible:outline-leaf"
          />
        </div>
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="mt-4 rounded-xs bg-danger/10 px-3.5 py-2.5 text-[0.875rem] text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="press cta-arrow mt-5 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-xs border border-forest bg-forest px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:opacity-60"
      >
        {pending ? 'Placing order…' : 'Place order'}
        {pending ? null : <Icon name="arrow-right" size={17} />}
      </button>

      {whatsappHref ? (
        <p className="mt-3 text-center text-[0.8125rem] text-earth-muted">
          Prefer WhatsApp?{' '}
          <a href={whatsappHref} rel="noopener noreferrer" target="_blank" className="underline underline-offset-4 hover:text-forest">
            Message us instead
          </a>
        </p>
      ) : null}
    </form>
  )
}

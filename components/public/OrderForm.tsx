'use client'

import { useActionState, useId, useRef, useState } from 'react'
import { placeOrder, type OrderFormState } from '@/lib/orders/actions'
import {
  BULK_ORDER_MESSAGE,
  DELIVERY_CITY,
  DELIVERY_NOTICE,
  MAX_PACKS_PER_ORDER,
} from '@/lib/orders/schema'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

/**
 * Place an order for one product.
 *
 * Mobile-first, because almost every order will be placed one-handed on a
 * phone: 48px targets, the right keyboard on every field via `inputMode`, and
 * `autoComplete` tokens specific enough that a browser can fill the whole
 * address in one tap.
 *
 * Labels are visible, not placeholders. A placeholder disappears the moment
 * you type, so a form built from placeholders is unreadable exactly when
 * someone looks back to check what they entered — and invisible to anyone
 * using a screen reader after the first keystroke.
 *
 * No price is submitted. The server looks it up from the product by slug.
 */

interface Props {
  productSlug: string
  productName: string
  varietyLabel?: string
  packLabel: string
  unitPrice: number
  currency: string
  /** Support conversation, never an order channel. See WhatsappEnquiry. */
  whatsappHref?: string | null
}

export function OrderForm(props: Props) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(placeOrder, {
    status: 'idle',
  })

  if (state.status === 'success') {
    return <Confirmation order={state.order} currency={props.currency} />
  }

  return <Checkout {...props} state={state} action={action} pending={pending} />
}

// ---------------------------------------------------------------------------

function Checkout({
  productSlug,
  productName,
  varietyLabel,
  packLabel,
  unitPrice,
  currency,
  whatsappHref,
  state,
  action,
  pending,
}: Props & {
  state: OrderFormState
  action: (formData: FormData) => void
  pending: boolean
}) {
  const [quantity, setQuantity] = useState(1)
  const id = useId()

  /*
   * One token per mount, sent with the submission.
   *
   * It is what makes a double-tap, a flaky-connection retry or the browser's
   * "resend this form?" dialog produce ONE order: the server stores it under a
   * unique index and returns the existing order rather than creating a second.
   *
   * Generated in an effect, not during render. `randomUUID()` is impure, and a
   * render that produces a different value each time is exactly what React's
   * purity rule exists to catch. It survives a re-render after a validation
   * error — which is the case that matters, because that is the retry.
   *
   * Not `useId()`: that is stable per position in the tree, so two different
   * customers would generate the SAME token and the second order would be
   * silently swallowed as a duplicate of the first.
   */
  const submissionId = useRef('')
  /*
   * The token is minted in the submit handler, not during render and not in an
   * effect: an event handler is the one place React allows an impure call and
   * a ref write. The ref keeps its value across the re-render that follows a
   * validation error, so a corrected resubmission carries the same token.
   */
  const submit = (formData: FormData) => {
    submissionId.current ||= globalThis.crypto.randomUUID()
    formData.set('submissionId', submissionId.current)
    action(formData)
  }

  const err = state.status === 'error' ? state.fieldErrors : undefined

  return (
    <form action={submit} className="rounded-sm border border-beige bg-ivory-soft p-5 sm:p-6">
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="quantity" value={quantity} />

      <p className="eyebrow text-botanical">Place an order</p>

      {/* 1 — What, and how many ------------------------------------------ */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-[0.9375rem] text-earth">
          {varietyLabel ?? productName}{' '}
          <span className="text-earth-muted">· {packLabel}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="press flex size-11 items-center justify-center rounded-xs border border-forest/30 text-[1.25rem] text-forest disabled:opacity-35"
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
            onClick={() => setQuantity((q) => Math.min(MAX_PACKS_PER_ORDER, q + 1))}
            disabled={quantity >= MAX_PACKS_PER_ORDER}
            aria-label="Increase quantity"
            className="press flex size-11 items-center justify-center rounded-xs border border-forest/30 text-[1.25rem] text-forest disabled:opacity-35"
          >
            +
          </button>
        </div>
      </div>

      <p className="mt-4 flex items-baseline justify-between border-t border-beige pt-4 text-[0.9375rem] text-earth-soft">
        Total
        <strong className="font-display text-[1.5rem] text-forest">
          {formatPrice(unitPrice * quantity, currency)}
        </strong>
      </p>

      {/*
        At the cap, the stepper stops and says why. Letting the number climb to
        200 and then refusing the whole form on submit wastes the address the
        customer has just typed — and a bulk order is a conversation about
        harvest volume, not a checkout.
      */}
      {quantity >= MAX_PACKS_PER_ORDER ? (
        <p className="mt-3 rounded-xs border border-beige bg-ivory px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-earth-soft">
          {BULK_ORDER_MESSAGE}{' '}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
              className="font-medium text-forest underline underline-offset-4"
            >
              Message us
            </a>
          ) : (
            <a href="/contact" className="font-medium text-forest underline underline-offset-4">
              Contact us
            </a>
          )}
        </p>
      ) : null}

      {/* 2 — Who ---------------------------------------------------------- */}
      <Legend>Your details</Legend>
      <div className="grid gap-4">
        <Field id={`${id}-name`} label="Full name" error={err?.name}>
          <input
            id={`${id}-name`} name="name" required autoComplete="name"
            autoCapitalize="words" enterKeyHint="next"
            className={input(err?.name)}
          />
        </Field>

        <Field
          id={`${id}-phone`}
          label="Mobile number"
          hint="We call this number to confirm your order."
          error={err?.phone}
        >
          <input
            id={`${id}-phone`} name="phone" required type="tel"
            inputMode="numeric" autoComplete="tel-national" enterKeyHint="next"
            placeholder="98765 43210"
            className={input(err?.phone)}
          />
        </Field>
      </div>

      {/* 3 — Where -------------------------------------------------------- */}
      <Legend>Delivery address</Legend>
      <div className="grid gap-4">
        <Field id={`${id}-line1`} label="House / flat / building" error={err?.line1}>
          <input
            id={`${id}-line1`} name="line1" required
            autoComplete="address-line1" autoCapitalize="words" enterKeyHint="next"
            className={input(err?.line1)}
          />
        </Field>

        <Field id={`${id}-line2`} label="Street" optional error={err?.line2}>
          <input
            id={`${id}-line2`} name="line2"
            autoComplete="address-line2" autoCapitalize="words" enterKeyHint="next"
            className={input(err?.line2)}
          />
        </Field>

        <Field id={`${id}-area`} label="Area" error={err?.area}>
          <input
            id={`${id}-area`} name="area" required
            autoComplete="address-level3" autoCapitalize="words" enterKeyHint="next"
            placeholder="e.g. Koramangala"
            className={input(err?.area)}
          />
        </Field>

        {/* City and pincode pair up: two short fields that fit a phone row. */}
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-city`} label="City" error={undefined}>
            {/*
              Read-only, not a select and not a text field. We deliver in
              Bengaluru only, and the server fixes the value regardless of what
              is posted — so offering an editable box would invite someone to
              type Mysuru and be rejected after filling in the whole form.
            */}
            <input
              id={`${id}-city`} value={DELIVERY_CITY} readOnly tabIndex={-1}
              aria-describedby={`${id}-city-note`}
              className={cn(input(undefined), 'cursor-not-allowed bg-beige-soft/60 text-earth-muted')}
            />
          </Field>

          <Field id={`${id}-pincode`} label="Pincode" error={err?.pincode}>
            <input
              id={`${id}-pincode`} name="pincode" required
              inputMode="numeric" autoComplete="postal-code" enterKeyHint="next"
              maxLength={6} pattern="\d{6}" placeholder="560034"
              className={input(err?.pincode)}
            />
          </Field>
        </div>

        <p id={`${id}-city-note`} className="-mt-1 text-[0.8125rem] leading-relaxed text-earth-muted">
          {DELIVERY_NOTICE}
        </p>

        <Field
          id={`${id}-landmark`}
          label="Landmark"
          optional
          hint="Anything that helps us find you quickly."
          error={err?.landmark}
        >
          <input
            id={`${id}-landmark`} name="landmark"
            autoCapitalize="sentences" enterKeyHint="next"
            className={input(err?.landmark)}
          />
        </Field>

        <Field id={`${id}-note`} label="Order note" optional error={err?.note}>
          <textarea
            id={`${id}-note`} name="note" rows={2} enterKeyHint="done"
            className="w-full rounded-xs border border-beige bg-ivory px-3.5 py-3 text-[1rem] leading-relaxed text-earth focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf"
          />
        </Field>
      </div>

      {/* 4 — How it is paid ----------------------------------------------- */}
      <Legend>Payment</Legend>
      <div className="flex items-start gap-3 rounded-xs border border-beige bg-ivory px-4 py-3.5">
        <Icon name="check" size={18} className="mt-0.5 shrink-0 text-botanical" />
        <div>
          <p className="text-[0.9375rem] font-medium text-forest">Pay on delivery</p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-earth-muted">
            Nothing is charged now. Pay cash or UPI when the order reaches you.
          </p>
        </div>
      </div>

      {state.status === 'error' ? (
        <p
          role="alert"
          className="mt-5 rounded-xs bg-danger/10 px-3.5 py-3 text-[0.875rem] text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="press cta-arrow mt-5 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-xs border border-forest bg-forest px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:opacity-60"
      >
        {pending ? 'Placing order…' : `Place order · ${formatPrice(unitPrice * quantity, currency)}`}
        {pending ? null : <Icon name="arrow-right" size={17} />}
      </button>

      {whatsappHref ? (
        <p className="mt-3 text-center text-[0.8125rem] text-earth-muted">
          Questions before you order?{' '}
          <a
            href={whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-4 hover:text-forest"
          >
            Ask us on WhatsApp
          </a>
        </p>
      ) : null}
    </form>
  )
}

// ---------------------------------------------------------------------------

function Confirmation({
  order,
  currency,
}: {
  order: Extract<OrderFormState, { status: 'success' }>['order']
  currency: string
}) {
  return (
    <div
      // Focus lands here after the swap, so a screen reader announces the
      // confirmation rather than leaving the user on a button that is gone.
      role="status"
      tabIndex={-1}
      className="rounded-sm border border-botanical/40 bg-ivory-soft p-6"
    >
      <p className="eyebrow text-botanical">Order placed 🍄</p>
      <p className="mt-3 font-display text-[1.75rem] leading-tight text-forest">
        Thank you, {order.name}.
      </p>

      <dl className="mt-6 grid gap-4 border-t border-beige pt-5 text-[0.9375rem]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-earth-muted">Order</dt>
          <dd className="font-mono text-[1rem] text-forest">{order.reference}</dd>
        </div>

        <div>
          <dt className="text-earth-muted">Items</dt>
          <dd className="mt-1.5 grid gap-1 text-earth">
            {order.items.map((item) => (
              <span key={`${item.name}-${item.packLabel}`}>
                {item.variety ?? item.name}
                <span className="text-earth-muted">
                  {' '}
                  · {item.packLabel} × {item.quantity}
                </span>
              </span>
            ))}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-earth-muted">Total</dt>
          <dd className="font-display text-[1.375rem] text-forest">
            {formatPrice(order.total, currency)}
          </dd>
        </div>

        <div>
          <dt className="text-earth-muted">Payment</dt>
          <dd className="mt-1 text-earth">{order.paymentLabel}</dd>
        </div>

        <div>
          <dt className="text-earth-muted">Delivering to</dt>
          <dd className="mt-1 grid text-earth">
            {order.addressLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </dd>
        </div>
      </dl>

      <p className="mt-5 border-t border-beige pt-5 text-[0.9375rem] leading-relaxed text-earth-soft">
        We will call you if anything needs confirming. Keep{' '}
        <strong className="font-mono text-forest">{order.reference}</strong> handy if you
        message us.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

const input = (error?: string) =>
  cn(
    // 1rem, not 0.9375 — iOS Safari zooms the whole page on focus for anything
    // under 16px, and the zoom does not come back when the field blurs.
    'h-12 w-full rounded-xs border bg-ivory px-3.5 text-[1rem] text-earth',
    'placeholder:text-earth-muted/60',
    'transition-colors duration-200 ease-(--ease-out-soft)',
    'focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf',
    error ? 'border-danger' : 'border-beige',
  )

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-7 mb-4 border-t border-beige pt-5 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
      {children}
    </p>
  )
}

function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-[0.8125rem] text-earth-soft">
        {label}
        {optional ? <span className="text-[0.6875rem] text-earth-muted">optional</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.8125rem] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8125rem] text-earth-muted">{hint}</p>
      ) : null}
    </div>
  )
}

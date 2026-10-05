'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { placeOrder, type OrderFormState } from '@/lib/orders/actions'
import {
  BULK_ORDER_MESSAGE,
  checkoutFormSchema,
  DELIVERY_CITY,
  DELIVERY_NOTICE,
  MAX_PACKS_PER_ORDER,
  type CheckoutFormValues,
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
 * ── VALIDATION ───────────────────────────────────────────────────────────
 *
 * react-hook-form with the SAME Zod rules the server uses, composed from the
 * shared `FIELD` definitions — so a value the form accepts can never be one
 * the server rejects. That mismatch is what produced "Please check the
 * highlighted fields" with nothing highlighted.
 *
 * `onTouched` + revalidate `onChange` is the combination that matters: a field
 * is not marked wrong while you are still typing it for the first time, only
 * once you leave it — and once it IS wrong, the message clears the instant you
 * fix it rather than waiting for another blur.
 *
 * None of this is a security boundary. The server re-validates everything,
 * looks the price up itself, and is reachable by direct POST regardless.
 *
 * No price is submitted. The server looks it up from the product by slug.
 */

/** Every field starts empty and stays a string: a form has no undefined. */
const EMPTY: CheckoutFormValues = {
  name: '',
  phone: '',
  line1: '',
  line2: '',
  area: '',
  pincode: '',
  landmark: '',
  note: '',
}

/** Field names as a customer would say them, for the summary line. */
const LABELS: Record<keyof CheckoutFormValues, string> = {
  name: 'name',
  phone: 'mobile number',
  line1: 'house or building',
  line2: 'street',
  area: 'area',
  pincode: 'pincode',
  landmark: 'landmark',
  note: 'note',
}

/**
 * Which fields need attention, by name.
 *
 * "Please check the highlighted fields" is useless on a phone, where the
 * highlighted field is three scrolls away.
 */
function summarise(errors: FieldErrors<CheckoutFormValues>): string {
  const fields = (Object.keys(errors) as (keyof CheckoutFormValues)[]).map((key) => LABELS[key])
  if (fields.length === 0) return 'Please check the form and try again.'
  if (fields.length === 1) return `Please check your ${fields[0]}.`
  const last = fields.pop()
  return `Please check your ${fields.join(', ')} and ${last}.`
}

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

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, submitCount, isValid },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: EMPTY,
    // Do not shout at someone who has not finished typing their name: a field
    // is marked wrong when they LEAVE it, then re-checked on every keystroke so
    // the message clears the moment it is fixed.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  /*
   * The server is the authority. If it rejects a field the browser accepted —
   * a rule this bundle does not know yet, or a stale deploy — that message is
   * attached to the field rather than left as a banner pointing at nothing,
   * which is exactly how this form failed before.
   */
  useEffect(() => {
    if (state.status !== 'error' || !state.fieldErrors) return
    for (const [field, message] of Object.entries(state.fieldErrors)) {
      if (field in EMPTY) {
        setError(field as keyof CheckoutFormValues, { type: 'server', message })
      }
    }
  }, [state, setError])

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
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // The ref is read HERE, in the event handler, and the token is then closed
    // over as a plain string. Reading it inside the callback handed to
    // `handleSubmit` would be a ref access that React cannot prove happens
    // outside render.
    submissionId.current ||= globalThis.crypto.randomUUID()
    const token = submissionId.current

    void handleSubmit((values) => {
      const formData = new FormData()
      formData.set('productSlug', productSlug)
      formData.set('quantity', String(quantity))
      formData.set('submissionId', token)
      for (const [key, value] of Object.entries(values)) formData.set(key, value ?? '')

      action(formData)
    })(event)
  }

  return (
    <form
      onSubmit={onSubmit}
      // `noValidate`: the browser's own bubbles would fire before Zod runs and
      // say something different from what the server would say.
      noValidate
      className="rounded-sm border border-beige bg-ivory-soft p-5 sm:p-6"
    >

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
        <Field id={`${id}-name`} label="Full name" error={errors.name?.message}>
          <input
            id={`${id}-name`} autoComplete="name"
            autoCapitalize="words" enterKeyHint="next"
            className={input(errors.name)}
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            {...register('name')}
          />
        </Field>

        <Field
          id={`${id}-phone`}
          label="Mobile number"
          hint="We call this number to confirm your order."
          error={errors.phone?.message}
        >
          <input
            id={`${id}-phone`} type="tel"
            inputMode="numeric" autoComplete="tel-national" enterKeyHint="next"
            placeholder="98765 43210"
            className={input(errors.phone)}
            aria-invalid={Boolean(errors.phone) || undefined}
            aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
            {...register('phone')}
          />
        </Field>
      </div>

      {/* 3 — Where -------------------------------------------------------- */}
      <Legend>Delivery address</Legend>
      <div className="grid gap-4">
        <Field id={`${id}-line1`} label="House / flat / building" error={errors.line1?.message}>
          <input
            id={`${id}-line1`} 
            autoComplete="address-line1" autoCapitalize="words" enterKeyHint="next"
            className={input(errors.line1)}
            aria-invalid={Boolean(errors.line1) || undefined}
            aria-describedby={errors.line1 ? `${id}-line1-error` : undefined}
            {...register('line1')}
          />
        </Field>

        <Field id={`${id}-line2`} label="Street" optional error={errors.line2?.message}>
          <input
            id={`${id}-line2`}
            autoComplete="address-line2" autoCapitalize="words" enterKeyHint="next"
            className={input(errors.line2)}
            aria-invalid={Boolean(errors.line2) || undefined}
            aria-describedby={errors.line2 ? `${id}-line2-error` : undefined}
            {...register('line2')}
          />
        </Field>

        <Field id={`${id}-area`} label="Area" error={errors.area?.message}>
          <input
            id={`${id}-area`} 
            autoComplete="address-level3" autoCapitalize="words" enterKeyHint="next"
            placeholder="e.g. Koramangala"
            className={input(errors.area)}
            aria-invalid={Boolean(errors.area) || undefined}
            aria-describedby={errors.area ? `${id}-area-error` : undefined}
            {...register('area')}
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

          <Field id={`${id}-pincode`} label="Pincode" error={errors.pincode?.message}>
            <input
              id={`${id}-pincode`} 
              inputMode="numeric" autoComplete="postal-code" enterKeyHint="next"
              maxLength={6} pattern="\d{6}" placeholder="560034"
              className={input(errors.pincode)}
            aria-invalid={Boolean(errors.pincode) || undefined}
            aria-describedby={errors.pincode ? `${id}-pincode-error` : undefined}
            {...register('pincode')}
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
          error={errors.landmark?.message}
        >
          <input
            id={`${id}-landmark`}
            autoCapitalize="sentences" enterKeyHint="next"
            className={input(errors.landmark)}
            aria-invalid={Boolean(errors.landmark) || undefined}
            aria-describedby={errors.landmark ? `${id}-landmark-error` : undefined}
            {...register('landmark')}
          />
        </Field>

        <Field id={`${id}-note`} label="Order note" optional error={errors.note?.message}>
          <textarea
            id={`${id}-note`} rows={2} enterKeyHint="done"
            className="w-full rounded-xs border border-beige bg-ivory px-3.5 py-3 text-[1rem] leading-relaxed text-earth focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf"
            aria-invalid={Boolean(errors.note) || undefined}
            aria-describedby={errors.note ? `${id}-note-error` : undefined}
            {...register('note')}
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

      {/*
        One banner, and only for what is not already shown against a field.
        Naming the fields beats "check the highlighted ones", which on a phone
        points at something three scrolls away.
      */}
      {submitCount > 0 && !isValid ? (
        <p role="alert" className="mt-5 rounded-xs bg-danger/10 px-3.5 py-3 text-[0.875rem] text-danger">
          {summarise(errors)}
        </p>
      ) : state.status === 'error' && Object.keys(errors).length === 0 ? (
        <p role="alert" className="mt-5 rounded-xs bg-danger/10 px-3.5 py-3 text-[0.875rem] text-danger">
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

const input = (error?: unknown) =>
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
      {/*
        `role="alert"` so the message is announced when it appears, rather than
        sitting silently below a field someone cannot see. The error REPLACES
        the hint: two descriptions read back to back is how a screen-reader
        user hears the formatting advice they already followed before they hear
        what actually went wrong.
      */}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-earth-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

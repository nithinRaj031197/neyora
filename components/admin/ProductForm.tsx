'use client'

import { useActionState, useState } from 'react'
import { saveProduct, type ProductState } from '@/lib/products/actions'
import { AVAILABILITY_LABELS, type Availability } from '@/lib/products/schema'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { useActionToast } from './useActionToast'
import { cn } from '@/lib/utils/cn'

/**
 * One product's editable fields.
 *
 * Each input shows its current override, with the content file's value as the
 * placeholder — so clearing a field visibly returns it to the file rather than
 * blanking the shop.
 *
 * Images are not here. They are committed files with known dimensions, which
 * is what keeps layout shift at zero.
 */

/**
 * Availability, split by the only question that changes what a customer sees:
 * can they order it right now?
 *
 * The switch answers that. The finer state is a reason, and a reason only
 * needs choosing once the answer is "no" — so it stays folded away until then
 * rather than presenting five radio buttons to someone who wants to mark one
 * product sold out.
 */
const ORDERABLE: readonly Availability[] = ['in_stock', 'low_stock']
const UNAVAILABLE: readonly Availability[] = ['out_of_stock', 'seasonal', 'coming_soon']

/** Short labels for the pills; the long ones are sentences, not buttons. */
const SHORT: Record<Availability, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  seasonal: 'Seasonal',
  coming_soon: 'Coming soon',
}

/** `''` means "no override" — fall back to whatever the content file says. */
const toNumber = (value: string, fallback: string | number | undefined) => {
  const raw = value.trim() === '' ? String(fallback ?? '') : value
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function ProductForm({
  slug,
  values,
  fileDefaults,
}: {
  slug: string
  values: Partial<Record<string, string | number>>
  fileDefaults: Partial<Record<string, string | number>>
}) {
  const [state, action, pending] = useActionState<ProductState, FormData>(saveProduct, {
    status: 'idle',
  })
  const err = state.status === 'error' ? state.fieldErrors : undefined

  useActionToast(state, {
    title: 'Product saved',
    description: 'The shop is already showing the change.',
  })

  const [availability, setAvailability] = useState<Availability>(
    (values.availability as Availability) ||
      (fileDefaults.availability as Availability) ||
      'in_stock',
  )
  const orderable = ORDERABLE.includes(availability)

  /*
   * Prices are controlled so the preview below can be live. It is not
   * decoration: a struck-through price at or below the selling price is both
   * rejected by the server and, on a public shop, misleading — seeing the real
   * saving appear as you type catches a slipped digit before you save it.
   */
  const [price, setPrice] = useState(String(values.price ?? ''))
  const [mrp, setMrp] = useState(String(values.mrp ?? ''))

  const effectivePrice = toNumber(price, fileDefaults.price)
  const effectiveMrp = toNumber(mrp, fileDefaults.mrp)
  const discount =
    effectivePrice !== undefined && effectiveMrp !== undefined && effectiveMrp > effectivePrice
      ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100)
      : undefined

  const overridden = (key: string) => values[key] !== undefined && values[key] !== ''
  const fromFile = (key: string) => (overridden(key) ? undefined : 'from file')

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-5">
        <Field label="Product name" error={err?.name} note={fromFile('name')}>
          <Input
            name="name"
            type="text"
            defaultValue={String(values.name ?? '')}
            placeholder={String(fileDefaults.name ?? '')}
          />
        </Field>

        <Field
          label="Short description"
          hint="Shown on the shop listing and under the product name."
          error={err?.shortDescription}
          note={fromFile('shortDescription')}
        >
          <Textarea
            name="shortDescription"
            rows={3}
            defaultValue={String(values.shortDescription ?? '')}
            placeholder={String(fileDefaults.shortDescription ?? '')}
          />
        </Field>

        {/* Pricing ------------------------------------------------------- */}
        <fieldset className="rounded-sm border border-beige bg-ivory-soft p-5">
          <legend className="px-1.5 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
            Pricing
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Current price"
              hint="What the customer actually pays."
              error={err?.price}
              note={fromFile('price')}
            >
              <Input
                name="price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                prefix="₹"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={String(fileDefaults.price ?? '')}
              />
            </Field>

            <Field
              label="Original price"
              hint="Shown struck through. Leave empty for no discount."
              error={err?.mrp}
              note={fromFile('mrp')}
            >
              <Input
                name="mrp"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                prefix="₹"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder={String(fileDefaults.mrp ?? '')}
              />
            </Field>
          </div>

          <div
            aria-live="polite"
            className="mt-5 flex flex-wrap items-baseline gap-3 border-t border-beige pt-4"
          >
            <span className="text-[0.75rem] tracking-[0.1em] text-earth-muted uppercase">
              Customer sees
            </span>
            {effectivePrice === undefined ? (
              <span className="text-[0.875rem] text-earth-muted">No price set</span>
            ) : (
              <>
                <span className="font-display text-[1.25rem] text-forest">₹{effectivePrice}</span>
                {discount !== undefined ? (
                  <>
                    <span className="text-[0.9375rem] text-earth-muted line-through">
                      ₹{effectiveMrp}
                    </span>
                    <Badge tone="leaf">{discount}% off</Badge>
                  </>
                ) : effectiveMrp !== undefined ? (
                  <span className="text-[0.8125rem] text-danger">
                    The original price must be above the current price
                  </span>
                ) : null}
              </>
            )}
          </div>
        </fieldset>

        {/* Availability -------------------------------------------------- */}
        <fieldset className="rounded-sm border border-beige bg-ivory-soft p-5">
          <legend className="px-1.5 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
            Availability
          </legend>

          <div className="flex items-start justify-between gap-5">
            <div>
              <label
                htmlFor={`${slug}-orderable`}
                className="text-[0.9375rem] font-medium text-forest"
              >
                Available to order
              </label>
              <p className="mt-1 max-w-[46ch] text-[0.8125rem] leading-relaxed text-earth-muted">
                Off removes the order button from the shop and shows the
                customer a badge instead. Nothing else about the product
                changes.
              </p>
            </div>
            <Switch
              id={`${slug}-orderable`}
              checked={orderable}
              onCheckedChange={(next) => setAvailability(next ? 'in_stock' : 'out_of_stock')}
            />
          </div>

          {/*
            Real radios, not toggle buttons. They are mutually exclusive, so
            they need arrow-key navigation and a single tab stop — and being
            the actual form control, the posted value cannot drift from what
            is selected on screen. Only the active group is rendered, so the
            hidden half can never submit a stale value.
          */}
          <div
            role="radiogroup"
            aria-label={orderable ? 'Stock level' : 'Reason it cannot be ordered'}
            className="mt-4 flex flex-wrap gap-2 border-t border-beige pt-4"
          >
            {(orderable ? ORDERABLE : UNAVAILABLE).map((option) => (
              <label
                key={option}
                className={cn(
                  'press inline-flex h-9 cursor-pointer items-center rounded-xs border px-3.5 text-[0.8125rem]',
                  'transition-colors duration-200 ease-(--ease-out-soft)',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-leaf',
                  availability === option
                    ? 'border-forest bg-forest text-ivory'
                    : 'border-beige bg-ivory text-earth-soft hover:border-forest/45 hover:text-forest',
                )}
              >
                <input
                  type="radio"
                  name="availability"
                  value={option}
                  checked={availability === option}
                  onChange={() => setAvailability(option)}
                  className="sr-only"
                />
                {SHORT[option]}
              </label>
            ))}
          </div>

          <p className="mt-3 text-[0.8125rem] text-earth-muted">
            {AVAILABILITY_LABELS[availability]}
          </p>
        </fieldset>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-beige pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <p className="text-[0.8125rem] text-earth-muted">
          Clear a field to fall back to the content file.
        </p>
      </div>
    </form>
  )
}

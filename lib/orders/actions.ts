'use server'

import { revalidatePath } from 'next/cache'
import { createOrder } from './repository'
import { DELIVERY_CITY, newOrderSchema, type Order } from './schema'
import { getProductBySlug } from '@/lib/content'
import { notifyNewOrder } from '@/lib/notify/dispatch'
import { queueSheetSync } from '@/lib/sheets/sync'

/**
 * Placing an order.
 *
 * A Server Function, which the Next docs are blunt about: these are reachable
 * by direct POST, not only through the form. So nothing here trusts the
 * request. In particular the PRICE is looked up from the product content by
 * slug — the form never posts a price, because a form that posts a price lets
 * the customer choose what to pay.
 */

/** What the customer is shown afterwards. No database ids, ever. */
export interface OrderSummary {
  reference: string
  name: string
  total: number
  items: { name: string; variety?: string; packLabel: string; quantity: number }[]
  addressLines: string[]
  paymentLabel: string
}

export type OrderFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success'; order: OrderSummary }

/** Availabilities a customer may actually order. Everything else is a browse. */
const ORDERABLE = new Set(['in_stock', 'low_stock'])

export async function placeOrder(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const slug = String(formData.get('productSlug') ?? '')

  // The product is the server's own record, not the submission's. This is the
  // line that stops a crafted POST buying a 250 g pack for ₹1.
  const product = await getProductBySlug(slug)
  if (!product) {
    return { status: 'error', message: 'That product is no longer available.' }
  }

  /*
   * Availability is checked HERE, not only by hiding the form.
   *
   * Without this, the out-of-stock variety could be ordered by anyone who kept
   * a tab open from before it sold out, or who posted to this function
   * directly — and the first anyone would know is a pack that cannot be
   * picked.
   */
  if (!ORDERABLE.has(product.availability)) {
    return {
      status: 'error',
      message: `${product.name} is not available to order right now. Message us and we will tell you the next harvest date.`,
    }
  }

  if (typeof product.price !== 'number') {
    return { status: 'error', message: 'That product has no price set. Please message us instead.' }
  }

  const quantityRaw = String(formData.get('quantity') ?? '1')
  const quantity = Number.parseInt(quantityRaw, 10)

  const parsed = newOrderSchema.safeParse({
    customer: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: {
        line1: formData.get('line1'),
        ...optional('line2', formData),
        area: formData.get('area'),
        // Fixed on the server, not taken from the form. The form shows it as a
        // read-only value; posting a different city must not change where we
        // believe we are delivering.
        city: DELIVERY_CITY,
        pincode: formData.get('pincode'),
        ...optional('landmark', formData),
      },
      ...optional('note', formData),
    },
    items: [
      {
        productSlug: product.slug,
        name: product.name,
        ...(product.varietyLabel ? { variety: product.varietyLabel } : {}),
        packLabel: product.weightLabel ?? product.unitLabel ?? 'pack',
        ...(product.weightGrams ? { weightGrams: product.weightGrams } : {}),
        unitPrice: product.price,
        quantity: Number.isFinite(quantity) ? quantity : 0,
      },
    ],
  })

  if (!parsed.success) {
    // Surface the first problem per field, so the form can point at the input
    // rather than showing one generic failure.
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[issue.path.length - 1]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return {
      status: 'error',
      message: 'Please check the highlighted fields.',
      fieldErrors,
    }
  }

  let order: Order
  try {
    order = await createOrder(parsed.data, {
      // Generated once per form mount in the browser. Two submissions of the
      // same form carry the same key and produce one order.
      idempotencyKey: String(formData.get('submissionId') ?? '').trim() || undefined,
    })
  } catch (error) {
    // Never leak a driver message or a connection string to the browser.
    console.error('[orders] failed to place order', error)
    return {
      status: 'error',
      message: 'We could not save your order. Please try again, or message us on WhatsApp.',
    }
  }

  /*
   * Everything below happens AFTER the order is safely stored, and none of it
   * can turn a stored order into an error on the customer's screen.
   */
  try {
    // The dashboard is force-dynamic, but the layout and any cached segment
    // are not — without this an admin with the page open sees yesterday.
    revalidatePath('/admin')
    await notifyNewOrder(order)
    // The spreadsheet is a reporting projection, not part of this path: it
    // runs in the background and cannot fail the order.
    await queueSheetSync(order)
  } catch (error) {
    console.error('[orders] post-create side effects failed', error)
  }

  return {
    status: 'success',
    order: {
      reference: order.reference,
      name: order.customer.name,
      total: order.total,
      items: order.items.map((item) => ({
        name: item.name,
        variety: item.variety,
        packLabel: item.packLabel,
        quantity: item.quantity,
      })),
      addressLines: [
        order.customer.address.line1,
        order.customer.address.line2,
        order.customer.address.area,
        `${order.customer.address.city} ${order.customer.address.pincode}`,
      ].filter((line): line is string => Boolean(line)),
      paymentLabel: 'Pay on delivery',
    },
  }
}

/**
 * Include an optional field only when it has content.
 *
 * An empty string would fail `.max()`-less optional string rules in some cases
 * and, worse, store `""` as a landmark — which reads as "there is a landmark"
 * everywhere downstream.
 */
function optional(name: string, formData: FormData): Record<string, string> {
  const value = String(formData.get(name) ?? '').trim()
  return value ? { [name]: value } : {}
}

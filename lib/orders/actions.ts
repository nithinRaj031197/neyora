'use server'

import { createOrder } from './repository'
import { newOrderSchema } from './schema'
import { getProductBySlug } from '@/lib/content'

/**
 * Placing an order.
 *
 * A Server Function, which the Next docs are blunt about: these are reachable
 * by direct POST, not only through the form. So nothing here trusts the
 * request. In particular the PRICE is looked up from the product content by
 * slug — the form never posts a price, because a form that posts a price lets
 * the customer choose what to pay.
 */

export type OrderFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success'; reference: string; total: number; name: string }

export async function placeOrder(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const slug = String(formData.get('productSlug') ?? '')

  // The product is the server's own record, not the submission's. This is the
  // line that stops a crafted POST buying a 200 g pack for ₹1.
  const product = getProductBySlug(slug)
  if (!product) {
    return { status: 'error', message: 'That product is no longer available.' }
  }

  const quantityRaw = String(formData.get('quantity') ?? '1')
  const quantity = Number.parseInt(quantityRaw, 10)

  const parsed = newOrderSchema.safeParse({
    customer: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      area: formData.get('area'),
      ...(String(formData.get('note') ?? '').trim()
        ? { note: formData.get('note') }
        : {}),
    },
    items: [
      {
        productSlug: product.slug,
        name: product.name,
        packLabel: product.weightLabel ?? product.unitLabel ?? 'pack',
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

  try {
    const order = await createOrder(parsed.data)
    return {
      status: 'success',
      reference: order.reference,
      total: order.total,
      name: order.customer.name,
    }
  } catch (error) {
    // Never leak a driver message or a connection string to the browser.
    console.error('[orders] failed to place order', error)
    return {
      status: 'error',
      message: 'We could not save your order. Please try again, or message us on WhatsApp.',
    }
  }
}

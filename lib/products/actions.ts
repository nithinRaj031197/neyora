'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import { productOverrideSchema } from './schema'
import { writeProductOverride } from './repository'

export type ProductState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'saved'; slug: string }

/**
 * Save a product's editable fields.
 *
 * Auth is checked HERE, not only on the page that renders the form — a Server
 * Function is reachable by direct POST, so hiding the form protects nobody.
 *
 * Afterwards the shop is revalidated. Without it the previously built HTML
 * keeps serving and the change looks like it silently failed.
 */
export async function saveProduct(
  _previous: ProductState,
  formData: FormData,
): Promise<ProductState> {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' }
  }

  const slug = String(formData.get('slug') ?? '').trim()
  if (!slug) return { status: 'error', message: 'Missing product.' }

  /*
   * Only our own fields. `Object.fromEntries(formData)` also returns React's
   * hidden $ACTION_* inputs, which a strict schema rejects with no field to
   * attach the error to.
   */
  const parsed = productOverrideSchema.safeParse({
    name: formData.get('name'),
    shortDescription: formData.get('shortDescription'),
    price: formData.get('price'),
    mrp: formData.get('mrp'),
    availability: formData.get('availability') || undefined,
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[issue.path.length - 1]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors }
  }

  try {
    await writeProductOverride(slug, parsed.data, admin.email)
  } catch (error) {
    console.error('[products] save failed', error)
    return { status: 'error', message: 'Could not save. Please try again.' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/products')
  revalidatePath(`/products/${slug}`)

  return { status: 'saved', slug }
}

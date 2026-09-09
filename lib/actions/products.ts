'use server'

/**
 * Product CRUD.
 *
 * Mirrors the recipe actions: authorise, re-validate with Zod, write through
 * the authenticated client so RLS applies, then revalidate the public paths.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { productSchema } from '@/lib/validation/schemas'
import { slugify } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'

const JSON_FIELDS = ['nutrition', 'highlights', 'image_ids']

function productPaths(slug: string): string[] {
  return ['/products', `/products/${slug}`, '/sitemap.xml']
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const raw = formToObject(formData, { jsonFields: JSON_FIELDS })
  if (!raw.slug || String(raw.slug).trim() === '') raw.slug = slugify(String(raw.name ?? ''))

  const parsed = parseOrFail(productSchema, raw)
  if (!parsed.ok) return parsed.state

  const { image_ids, sort_order, ...fields } = parsed.data
  const supabase = await createClient()

  const payload = { ...fields, sort_order: sort_order ?? 0 }

  const { data, error } = id
    ? await supabase.from('products').update(payload).eq('id', id).select('id, slug').single()
    : await supabase.from('products').insert(payload).select('id, slug').single()

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  // Images are a join table with an explicit order, so replace wholesale —
  // the first id is the primary image, which is what cards and OG tags use.
  const { error: clearError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', data.id)
  if (clearError) return fail(`Saved the product, but could not update images: ${clearError.message}`)

  if (image_ids.length > 0) {
    const { error: imageError } = await supabase.from('product_images').insert(
      image_ids.map((mediaId, index) => ({
        product_id: data.id,
        media_id: mediaId,
        sort_order: index + 1,
        is_primary: index === 0,
      })),
    )
    if (imageError) return fail(`Saved the product, but could not attach images: ${imageError.message}`)
  }

  revalidateContent(productPaths(data.slug))

  if (!id) redirect(`/admin/products/${data.id}?created=1`)

  return ok(
    parsed.data.status === 'published' ? 'Product saved and published.' : 'Product draft saved.',
  )
}

export async function setProductStatus(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!['draft', 'published'].includes(status)) throw new Error('Unsupported status change.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update({ status: status as 'draft' | 'published' })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(productPaths(data.slug))
}

export async function toggleProductFeatured(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const featured = String(formData.get('featured') ?? '') === 'true'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update({ featured })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(productPaths(data.slug))
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(productPaths(data.slug))
  redirect('/admin/products?deleted=1')
}

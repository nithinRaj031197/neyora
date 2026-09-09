'use server'

/**
 * Recipe categories, product categories and recipe tags.
 *
 * `kind` selects the table rather than there being three near-identical files.
 * It is validated against a literal union, so the value can never widen into
 * an arbitrary table name.
 */
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { categorySchema, tagSchema } from '@/lib/validation/schemas'
import { slugify } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'

type CategoryKind = 'recipe' | 'product'

function tableFor(kind: CategoryKind): 'recipe_categories' | 'product_categories' {
  return kind === 'recipe' ? 'recipe_categories' : 'product_categories'
}

function readKind(formData: FormData): CategoryKind {
  const value = String(formData.get('kind') ?? '')
  if (value !== 'recipe' && value !== 'product') {
    throw new Error('Unknown category type.')
  }
  return value
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  let kind: CategoryKind
  try {
    kind = readKind(formData)
  } catch {
    return fail('Unknown category type.')
  }

  const id = String(formData.get('id') ?? '').trim()
  const raw = formToObject(formData)
  if (!raw.slug || String(raw.slug).trim() === '') raw.slug = slugify(String(raw.name ?? ''))

  const parsed = parseOrFail(categorySchema, raw)
  if (!parsed.ok) return parsed.state

  const { sort_order, seo_title, seo_description, ...common } = parsed.data
  const supabase = await createClient()

  // product_categories has no SEO columns; recipe_categories does.
  const payload =
    kind === 'recipe'
      ? { ...common, sort_order: sort_order ?? 0, seo_title, seo_description }
      : { ...common, sort_order: sort_order ?? 0 }

  const table = tableFor(kind)
  const { error } = id
    ? await supabase.from(table).update(payload).eq('id', id)
    : await supabase.from(table).insert(payload)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  revalidateContent(
    kind === 'recipe'
      ? ['/recipes', `/recipes/category/${parsed.data.slug}`, '/sitemap.xml']
      : ['/products', '/sitemap.xml'],
  )

  return ok(id ? 'Category saved.' : 'Category created.')
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const kind = readKind(formData)
  const id = String(formData.get('id') ?? '')

  const supabase = await createClient()
  // Soft delete. Content pointing at it keeps working: the FK is
  // `on delete set null`, and a soft-deleted row simply stops being listed.
  const { error } = await supabase
    .from(tableFor(kind))
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidateContent(kind === 'recipe' ? ['/recipes'] : ['/products'])
}

export async function saveTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const raw = formToObject(formData)
  if (!raw.slug || String(raw.slug).trim() === '') raw.slug = slugify(String(raw.name ?? ''))

  const parsed = parseOrFail(tagSchema, raw)
  if (!parsed.ok) return parsed.state

  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('recipe_tags').update(parsed.data).eq('id', id)
    : await supabase.from('recipe_tags').insert(parsed.data)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  revalidateContent(['/recipes'])
  return ok(id ? 'Tag saved.' : 'Tag created.')
}

/**
 * Tags are hard-deleted: they carry no content of their own, and the join
 * rows cascade. A soft-deleted tag would only clutter the filter UI.
 */
export async function deleteTag(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()
  const { error } = await supabase.from('recipe_tags').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateContent(['/recipes'])
}

'use server'

/**
 * Recipe CRUD.
 *
 * Every action here starts with `authorizeAction()`, then re-validates the
 * whole payload with the same Zod schema the form used. The client is never
 * trusted: a hand-crafted POST hits exactly the same two gates, and then RLS
 * beneath them.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { recipePackVariantSchema, recipeSchema } from '@/lib/validation/schemas'
import { fieldErrors, slugify } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'
import type { PackSize } from '@/types/database'

const JSON_FIELDS = ['ingredients', 'steps', 'nutrition', 'equipment']
const ARRAY_FIELDS = ['tag_ids']

/** Public paths a recipe change can affect. */
function recipePaths(slug: string): string[] {
  return ['/recipes', `/recipes/${slug}`, '/sitemap.xml', '/go']
}

export async function saveRecipe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const raw = formToObject(formData, { jsonFields: JSON_FIELDS, arrayFields: ARRAY_FIELDS })

  // An empty slug is derived from the title rather than rejected — the form
  // does this live, but a submission without JavaScript must work too.
  if (!raw.slug || String(raw.slug).trim() === '') {
    raw.slug = slugify(String(raw.title ?? ''))
  }

  const parsed = parseOrFail(recipeSchema, raw)
  if (!parsed.ok) return parsed.state

  const input = parsed.data
  const supabase = await createClient()

  const { tag_ids, sort_order, ...recipeFields } = input

  const payload = {
    ...recipeFields,
    // `sort_order` is NOT NULL with a default; a blank input means "unset",
    // which is 0, not null.
    sort_order: sort_order ?? 0,
    // `total_time_minutes` is a generated column — never sent.
    updated_by: auth.session.admin.id,
    ...(id ? {} : { created_by: auth.session.admin.id }),
  }

  const query = id
    ? supabase.from('recipes').update(payload).eq('id', id).select('id, slug').single()
    : supabase.from('recipes').insert(payload).select('id, slug').single()

  const { data, error } = await query

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  // Tags are a join table, so they are replaced rather than patched. Delete
  // then insert inside the same request keeps it simple and idempotent.
  const { error: clearError } = await supabase
    .from('recipe_tag_map')
    .delete()
    .eq('recipe_id', data.id)
  if (clearError) return fail(`Saved the recipe, but could not update tags: ${clearError.message}`)

  if (tag_ids.length > 0) {
    const { error: tagError } = await supabase
      .from('recipe_tag_map')
      .insert(tag_ids.map((tagId) => ({ recipe_id: data.id, tag_id: tagId })))
    if (tagError) return fail(`Saved the recipe, but could not add tags: ${tagError.message}`)
  }

  revalidateContent(recipePaths(data.slug))

  if (!id) {
    // Created: move to the edit screen so the next save is an update.
    redirect(`/admin/recipes/${data.id}?created=1`)
  }

  return ok(
    input.status === 'published'
      ? 'Recipe saved and published.'
      : input.status === 'scheduled'
        ? 'Recipe saved and scheduled.'
        : 'Draft saved.',
  )
}

/**
 * Status change from a list row.
 *
 * Separate from `saveRecipe` so publishing does not require round-tripping the
 * entire recipe body — which would let a stale open tab overwrite newer edits.
 */
export async function setRecipeStatus(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id) throw new Error('No recipe id supplied.')
  if (!['draft', 'published'].includes(status)) throw new Error('Unsupported status change.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .update({ status: status as 'draft' | 'published', updated_by: auth.session.admin.id })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(recipePaths(data.slug))
}

export async function toggleRecipeFeatured(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const featured = String(formData.get('featured') ?? '') === 'true'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .update({ featured, updated_by: auth.session.admin.id })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(recipePaths(data.slug))
}

/** Soft delete: sets `deleted_at`, so nothing is lost and it can be restored. */
export async function deleteRecipe(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('No recipe id supplied.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent(recipePaths(data.slug))
  redirect('/admin/recipes?deleted=1')
}

/**
 * Duplicate.
 *
 * Copies as an unpublished draft with a "-copy" slug, so an editor can build a
 * new recipe from a proven one without any risk of publishing it by accident.
 */
export async function duplicateRecipe(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()

  const { data: source, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    total_time_minutes: _total,
    published_at: _published,
    view_count: _views,
    ...rest
  } = source

  let slug = `${source.slug}-copy`
  // Walk suffixes until one is free, so duplicating twice does not error.
  for (let attempt = 2; attempt < 20; attempt += 1) {
    const { data: clash } = await supabase.from('recipes').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${source.slug}-copy-${attempt}`
  }

  const { data: created, error: insertError } = await supabase
    .from('recipes')
    .insert({
      ...rest,
      slug,
      title: `${source.title} (copy)`,
      status: 'draft',
      scheduled_at: null,
      featured: false,
      is_demo: false,
      created_by: auth.session.admin.id,
      updated_by: auth.session.admin.id,
    })
    .select('id')
    .single()

  if (insertError) throw new Error(insertError.message)

  const { data: tags } = await supabase.from('recipe_tag_map').select('tag_id').eq('recipe_id', id)
  if (tags && tags.length > 0) {
    await supabase
      .from('recipe_tag_map')
      .insert(tags.map((t) => ({ recipe_id: created.id, tag_id: t.tag_id })))
  }

  redirect(`/admin/recipes/${created.id}?duplicated=1`)
}

// ---------------------------------------------------------------------------
// Pack-size variants
// ---------------------------------------------------------------------------

/**
 * Saves a hand-tuned ingredient list for one pack size.
 *
 * This is the escape hatch for the fact that seasoning does not scale
 * linearly: the public page prefers a variant over arithmetic scaling
 * whenever one exists.
 */
export async function saveRecipePackVariant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const raw = formToObject(formData, { jsonFields: ['ingredients'] })
  const parsed = recipePackVariantSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('Please check the highlighted fields.', fieldErrors(parsed.error))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('recipe_pack_variants').upsert(parsed.data, {
    onConflict: 'recipe_id,pack_size',
  })

  if (error) return fail(`Could not save the pack variant: ${error.message}`)

  const { data: recipe } = await supabase
    .from('recipes')
    .select('slug')
    .eq('id', parsed.data.recipe_id)
    .maybeSingle()
  if (recipe) revalidateContent(recipePaths(recipe.slug))

  return ok(`Saved the ${parsed.data.pack_size} ingredient list.`)
}

export async function deleteRecipePackVariant(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const recipeId = String(formData.get('recipe_id') ?? '')
  const packSize = String(formData.get('pack_size') ?? '') as PackSize

  const supabase = await createClient()
  const { error } = await supabase
    .from('recipe_pack_variants')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('pack_size', packSize)

  if (error) throw new Error(error.message)

  const { data: recipe } = await supabase
    .from('recipes')
    .select('slug')
    .eq('id', recipeId)
    .maybeSingle()
  if (recipe) revalidateContent(recipePaths(recipe.slug))
}

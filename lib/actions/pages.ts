'use server'

/**
 * Editorial pages and the homepage singleton.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { homepageSchema, pageSchema } from '@/lib/validation/schemas'
import { slugify } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'

/** Slugs whose content is served by a route with a different path. */
const SLUG_TO_PATH: Record<string, string> = {
  'faq-intro': '/faq',
  'contact-intro': '/contact',
}

export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const raw = formToObject(formData)
  if (!raw.slug || String(raw.slug).trim() === '') raw.slug = slugify(String(raw.title ?? ''))

  const parsed = parseOrFail(pageSchema, raw)
  if (!parsed.ok) return parsed.state

  const { sort_order, ...fields } = parsed.data
  const supabase = await createClient()

  // A system page's slug is wired to a route file, so changing it would 404
  // the route. The form disables the field; this is the server-side guard.
  if (id) {
    const { data: existing } = await supabase
      .from('pages')
      .select('is_system, slug')
      .eq('id', id)
      .maybeSingle()

    if (existing?.is_system && existing.slug !== fields.slug) {
      return fail('This page has a fixed URL and its slug cannot be changed.', {
        slug: `Must stay “${existing.slug}” — a route in the application depends on it.`,
      })
    }
  }

  const payload = { ...fields, sort_order: sort_order ?? 0 }

  const { data, error } = id
    ? await supabase.from('pages').update(payload).eq('id', id).select('id, slug').single()
    : await supabase.from('pages').insert(payload).select('id, slug').single()

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  const path = SLUG_TO_PATH[data.slug] ?? `/${data.slug}`
  revalidateContent([path, '/sitemap.xml'])

  if (!id) redirect(`/admin/pages/${data.id}?created=1`)

  return ok(parsed.data.status === 'published' ? 'Page saved and published.' : 'Page draft saved.')
}

export async function deletePage(formData: FormData): Promise<void> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('pages')
    .select('is_system, slug')
    .eq('id', id)
    .maybeSingle()

  if (existing?.is_system) {
    throw new Error(
      'This page cannot be deleted because a route depends on it. Set it to draft instead.',
    )
  }

  const { data, error } = await supabase
    .from('pages')
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidateContent([`/${data.slug}`, '/sitemap.xml'])
  redirect('/admin/pages?deleted=1')
}

export async function saveHomepage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const raw = formToObject(formData, { jsonFields: ['why_pillars', 'section_visibility'] })
  const parsed = parseOrFail(homepageSchema, raw)
  if (!parsed.ok) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.from('homepage').update(parsed.data).eq('id', 1)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  revalidateContent(['/'])
  return ok('Homepage updated. The live site will show the change immediately.')
}

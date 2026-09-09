'use server'

/**
 * FAQs and testimonials — short, list-shaped content.
 */
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { faqSchema, testimonialSchema } from '@/lib/validation/schemas'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'

export async function saveFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const parsed = parseOrFail(faqSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  const { sort_order, ...fields } = parsed.data
  const payload = { ...fields, sort_order: sort_order ?? 0 }

  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('faqs').update(payload).eq('id', id)
    : await supabase.from('faqs').insert(payload)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  revalidateContent(['/faq'])
  return ok(id ? 'Question saved.' : 'Question added.')
}

export async function deleteFaq(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('faqs')
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', String(formData.get('id') ?? ''))

  if (error) throw new Error(error.message)
  revalidateContent(['/faq'])
}

export async function saveTestimonial(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const parsed = parseOrFail(testimonialSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  const { sort_order, ...fields } = parsed.data
  const payload = { ...fields, sort_order: sort_order ?? 0 }

  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('testimonials').update(payload).eq('id', id)
    : await supabase.from('testimonials').insert(payload)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  revalidateContent(['/'])
  return ok(id ? 'Testimonial saved.' : 'Testimonial added.')
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('testimonials')
    .update({ deleted_at: new Date().toISOString(), status: 'draft' })
    .eq('id', String(formData.get('id') ?? ''))

  if (error) throw new Error(error.message)
  revalidateContent(['/'])
}

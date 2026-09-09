'use server'

/**
 * Site settings, social links, QR redirects, inbox and admin users.
 */
import { createClient } from '@/lib/supabase/server'
import { authorizeAction } from '@/lib/auth/session'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import {
  adminInviteSchema,
  adminUpdateSchema,
  contactStatusUpdateSchema,
  redirectSchema,
  siteSettingsSchema,
  socialLinkSchema,
} from '@/lib/validation/schemas'
import { fail, ok, type ActionState } from './state'
import { describeDbError, formToObject, parseOrFail, revalidateContent } from './helpers'

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

export async function saveSiteSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Contact details, the WhatsApp number and default SEO are site-wide, so
  // they need more than editor rights.
  const auth = await authorizeAction('admin')
  if (!auth.ok) return fail(auth.error)

  const parsed = parseOrFail(siteSettingsSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.from('site_settings').update(parsed.data).eq('id', 1)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  // Settings appear in the header and footer of every page.
  revalidateContent(['/', '/contact'])
  return ok('Site settings saved.')
}

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------

export async function saveSocialLinks(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const platforms = formData.getAll('platform').map(String)
  const supabase = await createClient()
  const errors: Record<string, string> = {}

  // One row per platform, submitted together as a single form. Parsed and
  // upserted individually so one bad URL reports against its own field
  // instead of failing the whole page.
  for (const [index, platform] of platforms.entries()) {
    const parsed = socialLinkSchema.safeParse({
      platform,
      label: String(formData.getAll('label')[index] ?? ''),
      url: String(formData.getAll('url')[index] ?? ''),
      handle: String(formData.getAll('handle')[index] ?? ''),
      sort_order: String(formData.getAll('sort_order')[index] ?? index),
      enabled: formData.getAll('enabled').includes(platform) ? 'on' : '',
    })

    if (!parsed.success) {
      errors[`url_${platform}`] = parsed.error.issues[0]?.message ?? 'Invalid value'
      continue
    }

    const { sort_order, ...fields } = parsed.data
    const { error } = await supabase
      .from('social_links')
      .upsert({ ...fields, sort_order: sort_order ?? index }, { onConflict: 'platform' })

    if (error) errors[`url_${platform}`] = error.message
  }

  if (Object.keys(errors).length > 0) {
    return fail('Some links could not be saved. Check the highlighted fields.', errors)
  }

  revalidateContent(['/', '/contact'])
  return ok('Social links saved. The footer updates immediately.')
}

// ---------------------------------------------------------------------------
// QR redirects
// ---------------------------------------------------------------------------

export async function saveRedirect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) return fail(auth.error)

  const id = String(formData.get('id') ?? '').trim()
  const parsed = parseOrFail(redirectSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  const supabase = await createClient()
  const payload = { ...parsed.data, updated_by: auth.session.admin.id }

  const { error } = id
    ? await supabase.from('redirects').update(payload).eq('id', id)
    : await supabase.from('redirects').insert(payload)

  if (error) {
    const described = describeDbError(error)
    return fail(described.message, described.errors)
  }

  // /go is force-dynamic, so nothing to invalidate there — but the homepage
  // links to it and the sitemap may reference the destination.
  revalidateContent(['/go'])
  return ok(
    `Saved. Scanning /${parsed.data.source} now goes to ${parsed.data.destination} — no reprinting needed.`,
  )
}

export async function deleteRedirect(formData: FormData): Promise<void> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('redirects')
    .select('source')
    .eq('id', id)
    .maybeSingle()

  // The main pack QR must always resolve. Deleting it would break every label
  // already printed, so it can only be re-pointed, never removed.
  if (existing?.source === 'go') {
    throw new Error(
      'The main pack QR (/go) cannot be deleted — every printed label depends on it. Change its destination instead.',
    )
  }

  const { error } = await supabase.from('redirects').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateContent(['/go'])
}

// ---------------------------------------------------------------------------
// Contact inbox
// ---------------------------------------------------------------------------

export async function updateMessageStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const parsed = parseOrFail(contactStatusUpdateSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .update({ status: parsed.data.status, admin_note: parsed.data.admin_note })
    .eq('id', parsed.data.id)

  if (error) return fail(`Could not update the message: ${error.message}`)
  return ok('Message updated.')
}

export async function deleteMessage(formData: FormData): Promise<void> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) throw new Error(auth.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', String(formData.get('id') ?? ''))

  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

/**
 * Grants CMS access to an existing Supabase Auth user.
 *
 * Deliberately does not create the account. Account creation belongs in
 * Supabase Auth, where password policy, email confirmation and rate limiting
 * already live — reimplementing that here would be strictly worse. So this
 * looks up an existing user by email and inserts their admin row.
 */
export async function inviteAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) return fail(auth.error)

  const parsed = parseOrFail(adminInviteSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  if (!hasServiceRole()) {
    return fail(
      'Granting access needs SUPABASE_SERVICE_ROLE_KEY, because looking up an auth user requires it. Add it to your environment, or insert the admins row directly in SQL.',
    )
  }

  // Only an owner may create another owner — otherwise an admin could
  // promote themselves past their own ceiling.
  if (parsed.data.role === 'owner' && auth.session.admin.role !== 'owner') {
    return fail('Only an owner can grant the owner role.', {
      role: 'Choose admin or editor.',
    })
  }

  const admin = createAdminClient()
  const email = parsed.data.email.toLowerCase()

  const { data: userList, error: lookupError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (lookupError) return fail(`Could not look up that account: ${lookupError.message}`)

  const user = userList.users.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    return fail(
      'No Supabase Auth account exists with that email. Create it first in Supabase → Authentication → Users, then grant access here.',
      { email: 'No account found with this address.' },
    )
  }

  const { error } = await admin.from('admins').insert({
    user_id: user.id,
    email,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
  })

  if (error) {
    if (error.code === '23505') {
      return fail('That account already has CMS access.', { email: 'Already an admin.' })
    }
    return fail(`Could not grant access: ${error.message}`)
  }

  return ok(`${email} can now sign in to the CMS as ${parsed.data.role}.`)
}

export async function updateAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) return fail(auth.error)

  const parsed = parseOrFail(adminUpdateSchema, formToObject(formData))
  if (!parsed.ok) return parsed.state

  if (parsed.data.role === 'owner' && auth.session.admin.role !== 'owner') {
    return fail('Only an owner can grant the owner role.', { role: 'Choose admin or editor.' })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('admins')
    .update({ full_name: parsed.data.full_name, role: parsed.data.role })
    .eq('id', parsed.data.id)

  if (error) {
    // The protect_last_owner trigger raises this rather than let you lock
    // yourself out of your own CMS.
    return fail(error.message)
  }

  return ok('User updated.')
}

export async function revokeAdmin(formData: FormData): Promise<void> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')

  // Revoking your own access would leave you staring at a sign-in screen with
  // no way back. Refuse it explicitly rather than let it half-happen.
  if (id === auth.session.admin.id) {
    throw new Error('You cannot revoke your own access. Ask another owner to do it.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('admins')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/**
 * Removes every row flagged `is_demo`.
 *
 * Runs through the `purge_demo_content()` function, which re-checks the
 * caller's role in the database itself — so the button is a convenience, not
 * the authorisation.
 */
export async function purgeDemoContent(): Promise<ActionState> {
  const auth = await authorizeAction('admin')
  if (!auth.ok) return fail(auth.error)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('purge_demo_content')

  if (error) return fail(`Could not purge demo content: ${error.message}`)

  revalidateContent(['/', '/recipes', '/products', '/faq'])
  return ok(`Demo content removed: ${data}`)
}

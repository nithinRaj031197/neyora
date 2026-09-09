'use server'

/**
 * Authentication actions: sign in, sign out, and the one-time admin bootstrap.
 */
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { adminSetupSchema, signInSchema } from '@/lib/validation/schemas'
import { fieldErrors } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { serverEnv } from '@/lib/env'

/** Only same-origin paths inside /admin, so `?next=` cannot be an open redirect. */
function safeNext(next: unknown): string {
  const value = typeof next === 'string' ? next : ''
  if (!value.startsWith('/admin') || value.startsWith('//')) return '/admin'
  return value
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  if (!parsed.success) {
    return fail('Please check your details.', fieldErrors(parsed.error))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Deliberately vague: distinguishing "no such user" from "wrong password"
    // would let anyone enumerate which email addresses have accounts.
    return fail('That email and password combination did not work.')
  }

  redirect(safeNext(formData.get('next')))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/admin', 'layout')
  redirect('/admin/sign-in')
}

/**
 * One-time first-admin bootstrap.
 *
 * Three conditions must all hold, which is what makes this a setup step and
 * not a backdoor:
 *
 *   1. The caller is already signed in through Supabase Auth — so they own a
 *      real, password-protected account.
 *   2. `ADMIN_SETUP_TOKEN` is set in the server environment and matches what
 *      was submitted, compared in constant time.
 *   3. No admin exists yet. The moment one does, this action always refuses.
 *
 * The insert needs the service role because RLS requires an existing admin to
 * create an admin — a genuine chicken-and-egg that only a bootstrap can break.
 */
export async function completeAdminSetup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return fail('Sign in first, then run setup with the same account.')
  }

  const parsed = adminSetupSchema.safeParse({
    token: String(formData.get('token') ?? ''),
    full_name: String(formData.get('full_name') ?? ''),
  })
  if (!parsed.success) {
    return fail('Please check the setup token.', fieldErrors(parsed.error))
  }

  let expected: string | undefined
  try {
    expected = serverEnv().adminSetupToken
  } catch {
    return fail('This deployment is missing SUPABASE_SERVICE_ROLE_KEY, so setup cannot run.')
  }

  if (!expected) {
    return fail(
      'ADMIN_SETUP_TOKEN is not set on the server. Add it to your environment, redeploy, and try again.',
    )
  }

  if (!timingSafeEqual(parsed.data.token, expected)) {
    return fail('That setup token is not correct.')
  }

  if (!hasServiceRole()) {
    return fail('This deployment is missing SUPABASE_SERVICE_ROLE_KEY, so setup cannot run.')
  }

  const admin = createAdminClient()

  const { count, error: countError } = await admin
    .from('admins')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (countError) {
    return fail(`Could not check existing admins: ${countError.message}`)
  }

  if ((count ?? 0) > 0) {
    return fail(
      'This site already has an administrator, so setup is closed. Ask an existing owner to invite you from Admin → Users.',
    )
  }

  const { error } = await admin.from('admins').insert({
    user_id: user.id,
    email: user.email ?? '',
    full_name: parsed.data.full_name,
    role: 'owner',
  })

  if (error) {
    return fail(`Could not create the administrator: ${error.message}`)
  }

  revalidatePath('/admin', 'layout')
  return ok('You are now the owner of this site. Opening the dashboard…')
}

/**
 * Constant-time string comparison.
 *
 * A plain `===` on a secret leaks its length and, in principle, its prefix
 * through timing. Written by hand because `node:crypto` is not available on
 * every runtime this app targets.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  // Compare a fixed number of bytes so the loop count never depends on input.
  const length = Math.max(aBytes.length, bBytes.length)
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

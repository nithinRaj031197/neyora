import 'server-only'

/**
 * Server-side authorisation.
 *
 * The rule that matters: being signed in to Supabase Auth grants nothing. An
 * `admins` row is what grants CMS access, and it is checked here on the server
 * for every admin page and every mutating Server Action. The middleware only
 * keeps the session cookie fresh and bounces obvious anonymous traffic — it is
 * never the authorisation boundary.
 */
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { AdminRole, AdminRow } from '@/types/database'

export interface AdminSession {
  user: User
  admin: AdminRow
}

/**
 * De-duplicated per request: a page and its Server Actions can call this
 * freely without extra round-trips to Supabase.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  // getUser() validates the JWT with the auth server. getSession() only reads
  // the cookie, which is forgeable, so it must never gate authorisation.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return { user, admin: data }
})

/** Redirects to sign-in (preserving the intended destination) when not an admin. */
export async function requireAdmin(redirectTo = '/admin'): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    redirect(`/admin/sign-in?next=${encodeURIComponent(redirectTo)}`)
  }
  return session
}

const ROLE_RANK: Record<AdminRole, number> = { editor: 1, admin: 2, owner: 3 }

export function hasRole(admin: AdminRow, minimum: AdminRole): boolean {
  return ROLE_RANK[admin.role] >= ROLE_RANK[minimum]
}

/** For sections only owners/admins may touch: users, site settings, purge. */
export async function requireRole(minimum: AdminRole, redirectTo = '/admin'): Promise<AdminSession> {
  const session = await requireAdmin(redirectTo)
  if (!hasRole(session.admin, minimum)) {
    redirect('/admin?error=insufficient-permissions')
  }
  return session
}

/**
 * Authorisation check for Server Actions. Returns a discriminated result rather
 * than redirecting, so the action can hand a useful message back to the form.
 */
export async function authorizeAction(
  minimum: AdminRole = 'editor',
): Promise<{ ok: true; session: AdminSession } | { ok: false; error: string }> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'You are not signed in. Please sign in again.' }
  if (!hasRole(session.admin, minimum)) {
    return { ok: false, error: `This action requires the ${minimum} role.` }
  }
  return { ok: true, session }
}

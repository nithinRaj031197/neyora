import 'server-only'

/**
 * Service-role Supabase client. **Bypasses Row Level Security.**
 *
 * `import 'server-only'` makes a client-component import a build error, so the
 * key cannot end up in a browser bundle even by accident.
 *
 * Legitimate uses, and nothing else:
 *   • the one-time first-admin bootstrap (no admin exists yet, so RLS would
 *     refuse the insert that creates one)
 *   • writing public submissions that must not be publicly writable —
 *     contact messages, analytics events, QR scan counters
 *   • storage housekeeping when an image is deleted from the library
 *
 * Every caller must validate its input and check authorisation FIRST. This
 * client trusts you completely.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { serverEnv, supabaseEnv } from '@/lib/env'

export function createAdminClient() {
  const { supabaseUrl } = supabaseEnv()
  const { serviceRoleKey } = serverEnv()

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'neyora-admin' } },
  })
}

/** True when a service-role key is present, so callers can degrade gracefully. */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

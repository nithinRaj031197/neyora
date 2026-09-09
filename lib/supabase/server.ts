import 'server-only'

/**
 * Server-side Supabase clients.
 *
 * `createClient()`   — anon key + the request's auth cookies. RLS applies, so
 *                      this is what every page and Server Action should use.
 *                      Cookie writes are attempted and ignored when we are in
 *                      a render pass (Next.js forbids them there); the
 *                      middleware is what actually refreshes the session.
 *
 * `createReadOnlyClient()` — anon key, no cookies at all. Used for public page
 *                      data so that responses stay cacheable and cannot vary
 *                      by visitor.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { supabaseEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = supabaseEnv()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component render. Middleware handles refresh.
        }
      },
    },
  })
}

export function createReadOnlyClient() {
  const { supabaseUrl, supabaseAnonKey } = supabaseEnv()
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

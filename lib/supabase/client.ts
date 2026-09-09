'use client'

/**
 * Browser Supabase client — anon key only.
 *
 * Everything it can do is bounded by Row Level Security. It is used for exactly
 * two things: the sign-in form, and uploading files straight to Storage from
 * the media library (so image bytes never pass through a Server Action).
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { supabaseEnv } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = supabaseEnv()
  cached ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return cached
}

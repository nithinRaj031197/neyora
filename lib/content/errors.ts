import type { PostgrestError } from '@supabase/supabase-js'

/**
 * A database error is a bug or an outage, never something to paper over.
 *
 * Silently swallowing one would let the site build and deploy a blank
 * homepage that looks fine, which is the worst possible failure mode for a
 * CMS. So every query throws, and the route's error.tsx reports it.
 *
 * The one exception is a completely unconfigured project (a fresh clone with
 * no .env.local) — handled by `isSupabaseConfigured()` at the page level,
 * which renders setup guidance instead.
 */
export class ContentQueryError extends Error {
  readonly code: string | undefined
  readonly details: string | undefined
  readonly hint: string | undefined

  constructor(operation: string, error: PostgrestError) {
    super(`Supabase query failed (${operation}): ${error.message}`)
    this.name = 'ContentQueryError'
    this.code = error.code
    this.details = error.details ?? undefined
    this.hint = error.hint ?? undefined
  }
}

export function assertNoError(
  operation: string,
  error: PostgrestError | null,
): asserts error is null {
  if (error) throw new ContentQueryError(operation, error)
}

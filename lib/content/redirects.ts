import 'server-only'

/**
 * QR redirect resolution.
 *
 * The packaging carries a QR pointing at /go and nothing else, forever. What
 * /go *does* is a database row, editable in Admin → QR Redirects — so a
 * seasonal campaign, a new recipe collection or a product page swap costs an
 * admin edit rather than a print run.
 */
import { createReadOnlyClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { assertNoError } from './errors'
import { isSupabaseConfigured } from '@/lib/env'
import type { RedirectRow } from '@/types/database'

/** Where /go goes if the row is missing or disabled. Never a dead end. */
export const DEFAULT_QR_DESTINATION = '/recipes'

export async function resolveRedirect(source: string): Promise<RedirectRow | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .eq('source', source)
    .eq('enabled', true)
    .maybeSingle()

  assertNoError(`redirect ${source}`, error)
  return data ?? null
}

/**
 * Records a scan.
 *
 * Uses the `register_scan` SECURITY DEFINER function so the counter can be
 * bumped by an anonymous visitor without granting the public any UPDATE
 * privilege on `redirects`. Failure is swallowed: a metric must never stand
 * between a customer and the page their pack promised them.
 */
export async function registerScan(source: string): Promise<void> {
  if (!isSupabaseConfigured() || !hasServiceRole()) return
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.rpc('register_scan', { p_source: source })
    if (error) console.error('[qr] scan count failed:', error.message)
  } catch (error) {
    console.error('[qr] scan count threw:', error)
  }
}

/**
 * Guards against the QR becoming an open redirector.
 *
 * Mirrors the `redirects_destination_relative` CHECK constraint, and re-checks
 * at read time — defence in depth, because a redirect target is exactly the
 * kind of value an attacker would want to control.
 *
 * Rejected alongside absolute URLs:
 *   `//evil.example.com`   protocol-relative; looks relative, is not
 *   `/\evil.example.com`   some clients normalise the backslash to a slash
 *   control characters     header/URL smuggling
 */
export function isSafeDestination(destination: string): boolean {
  if (!destination.startsWith('/')) return false
  if (destination.startsWith('//') || destination.startsWith('/\\')) return false
  if (/[\u0000-\u001f\u007f]/.test(destination)) return false
  return true
}

import 'server-only'

/**
 * The public-visibility filter, in one place.
 *
 * RLS already enforces this via `is_publicly_visible()`, so these predicates
 * are not the security boundary — they exist so Postgres can use the partial
 * indexes from migration 0003 instead of filtering after the fact, and so
 * scheduled content appears the moment its time passes.
 *
 * The rule is driven by `published_at`, which the publication trigger keeps
 * authoritative: NULL for drafts, the publish time for published rows, and
 * the scheduled time for scheduled ones. Testing it therefore covers all
 * three states with one comparison, and needs no cron job.
 */

/** Applied as `.not('published_at', 'is', null).lte('published_at', nowIso())`. */
export function nowIso(): string {
  return new Date().toISOString()
}

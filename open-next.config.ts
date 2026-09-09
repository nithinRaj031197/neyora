import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * OpenNext adapter configuration.
 *
 * Deliberately minimal. No incremental cache is configured, which means pages
 * carrying `export const revalidate` are rendered per request rather than
 * cached between them — correct output, just not cached.
 *
 * That is the right default for a free-first build: every cache backend
 * (R2, KV, D1) is a quota with a bill attached once exceeded, and this site's
 * pages are cheap to render — a handful of indexed Postgres queries each.
 *
 * When traffic justifies it, add an R2 bucket (see wrangler.jsonc) and:
 *
 *   import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache })
 *
 * Nothing in the application code changes.
 */
export default defineCloudflareConfig()

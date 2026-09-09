import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * OpenNext adapter configuration.
 *
 * Deliberately empty. Almost every page in this site is prerendered as static
 * HTML at build time, so there is nothing meaningful for an incremental cache
 * to hold: Cloudflare serves those pages from its edge as assets.
 *
 * The only dynamic routes are /go (which must never be cached — a cached QR
 * redirect would keep sending scanners to last season's page) and the two
 * listing pages that read query parameters.
 */
export default defineCloudflareConfig()

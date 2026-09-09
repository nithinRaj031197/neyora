/**
 * Environment access, validated once at module load.
 *
 * Two deliberate rules:
 *   1. `serverEnv()` throws if it is ever reached from a browser bundle, so a
 *      service-role key cannot leak through an accidental import.
 *   2. Public values are read from literal `process.env.NEXT_PUBLIC_*`
 *      expressions — Next.js inlines those at build time only when written
 *      literally, never via a computed key.
 */
import { z } from 'zod'

const URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i

/**
 * Supabase credentials are validated separately (see `supabaseEnv()`), not
 * here, so that an unconfigured clone still builds and renders the setup
 * screen instead of failing during prerender. Anything that actually talks to
 * Supabase goes through `supabaseEnv()` and fails loudly there.
 */
const publicSchema = z.object({
  supabaseUrl: z.string(),
  supabaseAnonKey: z.string(),
  siteUrl: z.string().regex(URL_PATTERN, 'NEXT_PUBLIC_SITE_URL must be a valid http(s) URL'),
  mediaBucket: z.string().min(1),
  analyticsProvider: z.enum(['none', 'internal', 'umami', 'plausible']),
  analyticsScriptUrl: z.string().optional(),
  analyticsSiteId: z.string().optional(),
  googleSiteVerification: z.string().optional(),
})

export type PublicEnv = z.infer<typeof publicSchema>

/**
 * The browser-safe Supabase key.
 *
 * Newer Supabase projects issue `sb_publishable_…` keys and the dashboard
 * names the variable `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Older projects
 * issue a JWT under `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both authenticate as the
 * `anon` role and are equally safe in the browser — everything they can do is
 * bounded by Row Level Security — so both names are accepted and the newer one
 * wins.
 *
 * Both are written as literal `process.env.X` expressions on purpose: Next.js
 * only inlines a `NEXT_PUBLIC_*` value into the client bundle when it can see
 * the whole name statically. A computed lookup would compile to `undefined` in
 * the browser and fail only at runtime.
 */
function readPublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  )
}

function readPublicEnv(): PublicEnv {
  const raw = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: readPublishableKey(),
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    mediaBucket: process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'media',
    analyticsProvider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? 'none',
    analyticsScriptUrl: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL || undefined,
    analyticsSiteId: process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID || undefined,
    googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  }

  const parsed = publicSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `Invalid public environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env.local and fill in your Supabase project values.',
    )
  }
  return parsed.data
}

let cachedPublic: PublicEnv | null = null

/** Safe to call from both server and client code. */
export function publicEnv(): PublicEnv {
  cachedPublic ??= readPublicEnv()
  return cachedPublic
}

/**
 * Whether Supabase is configured at all. Used so the app can render a helpful
 * setup screen during first-run instead of a stack trace — and so `npm run
 * build` succeeds on a fresh clone before any credentials exist.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return URL_PATTERN.test(url) && readPublishableKey().length >= 20
}

/**
 * Supabase credentials, validated at the point of use.
 *
 * Throws when they are missing, which is correct: by the time anything calls
 * this, it is about to make a database request that cannot succeed without
 * them. Callers that must degrade gracefully check `isSupabaseConfigured()`
 * first.
 *
 * `supabaseAnonKey` carries whichever browser-safe key the project issued —
 * see `readPublishableKey()`.
 */
export function supabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const { supabaseUrl, supabaseAnonKey } = publicEnv()

  if (!URL_PATTERN.test(supabaseUrl) || supabaseAnonKey.length < 20) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (copy .env.example to .env.local), then restart.',
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

const serverSchema = z.object({
  serviceRoleKey: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is required for this operation'),
  adminSetupToken: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverEnv() was called in the browser. Secrets must never reach the client bundle.',
    )
  }
  const parsed = serverSchema.safeParse({
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    adminSetupToken: process.env.ADMIN_SETUP_TOKEN || undefined,
  })
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment configuration:\n${parsed.error.issues
        .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    )
  }
  return parsed.data
}

/** Absolute URL helper for canonicals, Open Graph and the sitemap. */
export function absoluteUrl(path = '/'): string {
  const base = publicEnv().siteUrl
  if (!path.startsWith('/')) return `${base}/${path}`
  return `${base}${path}`
}

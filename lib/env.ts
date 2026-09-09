/**
 * Environment access, validated once at module load.
 *
 * There is very little of it. The site has no database and no credentials —
 * the only values that matter are the canonical origin and, optionally, an
 * override for where the packaging QR code leads.
 */
import { z } from 'zod'

const URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i

const publicSchema = z.object({
  siteUrl: z.string().regex(URL_PATTERN, 'NEXT_PUBLIC_SITE_URL must be a valid http(s) URL'),
  analyticsProvider: z.enum(['none', 'umami', 'plausible']),
  analyticsScriptUrl: z.string().optional(),
  analyticsSiteId: z.string().optional(),
  googleSiteVerification: z.string().optional(),
})

export type PublicEnv = z.infer<typeof publicSchema>

function readPublicEnv(): PublicEnv {
  /*
   * Written as literal `process.env.X` expressions on purpose: Next.js only
   * inlines a NEXT_PUBLIC_* value into the client bundle when it can see the
   * whole name statically. A computed lookup compiles to `undefined` in the
   * browser and fails only at runtime.
   */
  const raw = {
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    analyticsProvider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? 'none',
    analyticsScriptUrl: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL || undefined,
    analyticsSiteId: process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID || undefined,
    googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  }

  const parsed = publicSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env.local and fill it in.',
    )
  }
  return parsed.data
}

let cached: PublicEnv | null = null

export function publicEnv(): PublicEnv {
  cached ??= readPublicEnv()
  return cached
}

/** Absolute URL, for canonicals, Open Graph and the sitemap. */
export function absoluteUrl(path = '/'): string {
  const base = publicEnv().siteUrl
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

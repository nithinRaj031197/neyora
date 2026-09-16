import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `lib/env.ts` validates the environment once and caches the result, so every
 * test needs a fresh copy of the module with its own process.env snapshot.
 *
 * The regression this file exists for: an env var that is SET but EMPTY used
 * to bypass the `??` default and fail Zod validation, crashing the build on
 * /_not-found. Empty must behave exactly like unset.
 */

const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = ORIGINAL.NEXT_PUBLIC_ANALYTICS_PROVIDER
  process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL = ORIGINAL.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL
  process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID = ORIGINAL.NEXT_PUBLIC_ANALYTICS_SITE_ID
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = ORIGINAL.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  vi.restoreAllMocks()
})

async function loadEnv(): Promise<typeof import('@/lib/env')> {
  vi.resetModules()
  return import('@/lib/env')
}

describe('publicEnv', () => {
  it('falls back to defaults when the variables are unset', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER

    const { publicEnv } = await loadEnv()

    expect(publicEnv().siteUrl).toBe('http://localhost:3000')
    expect(publicEnv().analyticsProvider).toBe('none')
  })

  it('falls back to defaults when the variables are set but empty', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = ''
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = ''

    const { publicEnv } = await loadEnv()

    expect(publicEnv().siteUrl).toBe('http://localhost:3000')
    expect(publicEnv().analyticsProvider).toBe('none')
  })

  it('falls back to defaults when the variables are whitespace only', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   '
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = '\t \n'

    const { publicEnv } = await loadEnv()

    expect(publicEnv().siteUrl).toBe('http://localhost:3000')
    expect(publicEnv().analyticsProvider).toBe('none')
  })

  it('accepts a valid URL and strips the trailing slash', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://neyora.com/'

    const { publicEnv } = await loadEnv()

    expect(publicEnv().siteUrl).toBe('https://neyora.com')
  })

  it('keeps a locally configured http URL', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'

    const { publicEnv } = await loadEnv()

    expect(publicEnv().siteUrl).toBe('http://localhost:3000')
  })

  it('still throws when the site URL is not a valid http(s) URL', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'neyora.com'

    const { publicEnv } = await loadEnv()

    expect(() => publicEnv()).toThrow(/Invalid environment configuration[\s\S]*must be a valid http\(s\) URL/)
  })

  it('still throws for an unknown analytics provider', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'google-analytics'

    const { publicEnv } = await loadEnv()

    expect(() => publicEnv()).toThrow(/Invalid environment configuration[\s\S]*expected one of "none"\|"umami"\|"plausible"/)
  })

  it('caches the first successful parse', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://neyora.com'

    const { publicEnv } = await loadEnv()
    const first = publicEnv()

    process.env.NEXT_PUBLIC_SITE_URL = 'https://other.example'
    expect(publicEnv()).toBe(first)
  })

  it('builds absolute URLs from the configured origin', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://neyora.com'

    const { absoluteUrl } = await loadEnv()

    expect(absoluteUrl()).toBe('https://neyora.com/')
    expect(absoluteUrl('/recipes')).toBe('https://neyora.com/recipes')
    expect(absoluteUrl('recipes')).toBe('https://neyora.com/recipes')
  })
})

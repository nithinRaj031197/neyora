import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Environment resolution.
 *
 * `lib/env.ts` memoises its parsed result, so every case resets the module
 * registry and re-imports rather than trusting a stale cache.
 */
// Synthetic fixtures. Deliberately not this project's real key — a test
// should not depend on a live credential, and a reader should not have to
// work out whether one has been committed.
const PUBLISHABLE = 'sb_publishable_EXAMPLE_0000000000000000000000'
const LEGACY_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.anon.jwt.value'

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

let saved: Record<string, string | undefined>

beforeEach(() => {
  vi.resetModules()
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  for (const key of KEYS) delete process.env[key]
})

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

async function env() {
  return import('@/lib/env')
}

describe('browser-safe key resolution', () => {
  it('reads the new publishable key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PUBLISHABLE

    const { supabaseEnv } = await env()
    expect(supabaseEnv().supabaseAnonKey).toBe(PUBLISHABLE)
  })

  // Existing projects must keep working after the rename.
  it('still reads the legacy anon key on its own', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = LEGACY_ANON

    const { supabaseEnv } = await env()
    expect(supabaseEnv().supabaseAnonKey).toBe(LEGACY_ANON)
  })

  it('prefers the publishable key when both are set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PUBLISHABLE
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = LEGACY_ANON

    const { supabaseEnv } = await env()
    expect(supabaseEnv().supabaseAnonKey).toBe(PUBLISHABLE)
  })
})

describe('isSupabaseConfigured', () => {
  it('is true with either key name', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PUBLISHABLE

    const { isSupabaseConfigured } = await env()
    expect(isSupabaseConfigured()).toBe(true)
  })

  // The whole point: a fresh clone must build and render the setup screen
  // rather than crash during prerender.
  it('is false with no key at all', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

    const { isSupabaseConfigured } = await env()
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('is false with a malformed URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PUBLISHABLE

    const { isSupabaseConfigured } = await env()
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('is false with a truncated key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x'

    const { isSupabaseConfigured } = await env()
    expect(isSupabaseConfigured()).toBe(false)
  })
})

describe('supabaseEnv', () => {
  it('names the current variable in its error, not the legacy one', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

    const { supabaseEnv } = await env()
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  })
})

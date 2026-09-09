import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Test environment.
 *
 * Public env vars are stubbed here so modules that call `publicEnv()` at import
 * time work under test without a real Supabase project.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key-that-is-long-enough-to-pass'
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://neyora.test'
process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ??= 'media'
process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ??= 'internal'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

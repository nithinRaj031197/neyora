import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Test environment.
 *
 * The site has no credentials, so this is only the canonical origin — which
 * the SEO builders need in order to produce absolute URLs.
 */
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://neyora.test'
process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ??= 'none'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

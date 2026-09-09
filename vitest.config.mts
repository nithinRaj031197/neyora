import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // `server-only` is a Next.js build-time guard with no runtime module.
      // Stubbing it lets us unit-test server modules directly, while the real
      // guard still protects the browser bundle at build time.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // happy-dom rather than jsdom: jsdom 27's CSS dependency chain requires an
    // ESM module from CJS, which Node 20 cannot do. happy-dom is also faster.
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    // tests/database.test.ts boots Postgres-in-WASM and applies every
    // migration, which takes a few seconds on a cold start.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})

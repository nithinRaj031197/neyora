/**
 * Stub for Next.js's `server-only` package.
 *
 * In a Next build, importing `server-only` from a client component is a hard
 * error — that is what keeps the service-role key out of the browser bundle.
 * Under Vitest there is no such bundler pass, so the import needs something to
 * resolve to. The real guard is unaffected.
 */
export {}

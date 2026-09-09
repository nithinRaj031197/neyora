'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Root error boundary.
 *
 * Shows the message but never a stack trace — in production `error.message`
 * for a server-side throw is already replaced by Next with a generic string
 * plus a digest, so there is nothing sensitive to leak here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[neyora] unhandled error:', error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-6 py-24">
      <div className="w-full max-w-xl">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-(length:--text-display-md)">
          We could not load this page
        </h1>
        <p className="mt-5 max-w-[52ch] text-earth-soft">
          This is our fault, not yours. Try again — if it keeps happening, the site may be having
          trouble reaching its database.
        </p>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-earth-muted">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.875rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xs border border-forest/35 px-5 text-[0.875rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}

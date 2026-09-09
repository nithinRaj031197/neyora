'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { ButtonLink } from '@/components/ui/Button'

/**
 * Public error boundary.
 *
 * The most likely cause is the database being unreachable, so the copy says
 * so plainly rather than showing a generic apology. The digest is included
 * because it is the one thing that makes a report actionable.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[neyora] page error:', error)
  }, [error])

  return (
    <Container size="wide" className="py-(--spacing-section)">
      <div className="max-w-xl">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-(length:--text-display-md)">We could not load this page</h1>
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-earth-soft">
          Most often this means the site could not reach its database. Trying again usually works.
        </p>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-earth-muted">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.875rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            Try again
          </button>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>

        <p className="mt-10 text-[0.875rem] text-earth-muted">
          If it keeps happening, we would like to know —{' '}
          <Link
            href="/contact"
            className="text-botanical underline decoration-botanical/40 underline-offset-4"
          >
            tell us
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}

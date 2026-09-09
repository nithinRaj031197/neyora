'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'

/**
 * Admin error boundary.
 *
 * Server Actions throw for authorisation failures too, so the copy names that
 * possibility first — it is by far the most common cause here, and the fix
 * (sign in again) is different from "retry".
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[neyora admin] error:', error)
  }, [error])

  return (
    <div className="px-5 py-10 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-[1.75rem] text-forest">Something went wrong</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Alert tone="danger" title="The action could not be completed">
            {error.message || 'An unexpected error occurred.'}
          </Alert>

          <p className="text-[0.875rem] leading-relaxed text-earth-soft">
            If this says you are not authorised, your session may have expired or your CMS access
            may have been changed. Signing out and back in resolves both.
          </p>

          {error.digest ? (
            <p className="font-mono text-[0.75rem] text-earth-muted">Reference: {error.digest}</p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-xs border border-beige px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
          >
            Back to dashboard
          </Link>
          <form action="/admin/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xs border border-beige px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

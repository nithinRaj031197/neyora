'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/Form'

/**
 * Search + status filter for admin lists.
 *
 * State lives in the URL so a filtered list is linkable and survives the
 * back button after an edit. The search input is debounced so typing does not
 * fire a request per keystroke.
 */
export function SearchFilter({
  basePath,
  placeholder = 'Search…',
  statuses,
  extra,
}: {
  basePath: string
  placeholder?: string
  statuses?: { value: string; label: string }[]
  extra?: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  const status = searchParams.get('status') ?? ''

  function push(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    params.delete('page')
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath))
  }

  // 350ms after the last keystroke. Long enough to avoid a request per letter,
  // short enough to feel immediate.
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (query === current) return
    const timer = window.setTimeout(() => push({ q: query.trim() || null }), 350)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <label htmlFor="admin-search" className="sr-only">
          Search
        </label>
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-earth-muted"
        />
        <input
          id="admin-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xs border border-beige bg-ivory pr-3 pl-9 text-[0.875rem] placeholder:text-earth-muted focus:border-botanical focus:outline-none"
        />
      </div>

      {statuses ? (
        <div className="min-w-40">
          <label htmlFor="admin-status" className="sr-only">
            Filter by status
          </label>
          <Select
            id="admin-status"
            value={status}
            onChange={(event) => push({ status: event.target.value || null })}
            className="h-10 text-[0.875rem]"
          >
            <option value="">All statuses</option>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {extra}
    </div>
  )
}

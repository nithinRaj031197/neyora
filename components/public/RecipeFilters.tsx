'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'
import { PACK_SIZES, packSizeLabel } from '@/lib/utils/scale'
import type { PackSize, RecipeTagRow } from '@/types/database'

/**
 * Recipe filters.
 *
 * Filters live in the URL, not in component state, so a filtered list is
 * shareable, bookmarkable and survives a reload — and the server does the
 * filtering, which keeps the client bundle small.
 */
export function RecipeFilters({
  tags,
  activeTag,
  activePack,
  query,
  basePath,
}: {
  tags: RecipeTagRow[]
  activeTag: string | null
  activePack: PackSize | null
  query: string
  basePath: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(query)

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    // Any filter change returns to page 1; staying on page 4 of a new,
    // shorter result set shows an empty grid.
    params.delete('page')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
  }

  const hasFilters = Boolean(activeTag || activePack || query)

  return (
    <div className={cn('flex flex-col gap-6', pending && 'opacity-70')}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q: search.trim() || null })
        }}
        className="flex max-w-md gap-2"
      >
        <div className="relative flex-1">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-earth-muted"
          />
          <input
            id="recipe-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes"
            className="h-11 w-full rounded-xs border border-beige bg-ivory pr-3 pl-10 text-[0.9375rem] placeholder:text-earth-muted focus:border-botanical focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
        >
          Search
        </button>
      </form>

      <fieldset>
        <legend className="eyebrow">Pack size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PACK_SIZES.map((pack) => {
            const active = activePack === pack
            return (
              <button
                key={pack}
                type="button"
                aria-pressed={active}
                onClick={() => apply({ pack: active ? null : pack })}
                className={cn(
                  'inline-flex h-9 items-center rounded-xs border px-3.5 text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors',
                  active
                    ? 'border-forest bg-forest text-ivory'
                    : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest',
                )}
              >
                {packSizeLabel(pack).replace(' pack', '')}
              </button>
            )
          })}
        </div>
      </fieldset>

      {tags.length > 0 ? (
        <fieldset>
          <legend className="eyebrow">Tags</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = activeTag === tag.slug
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => apply({ tag: active ? null : tag.slug })}
                  className={cn(
                    'inline-flex h-9 items-center rounded-xs border px-3.5 text-[0.8125rem] transition-colors',
                    active
                      ? 'border-botanical bg-leaf/20 text-forest'
                      : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest',
                  )}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setSearch('')
            apply({ tag: null, pack: null, q: null })
          }}
          className="self-start text-[0.8125rem] text-botanical underline decoration-botanical/40 underline-offset-4 transition-colors hover:decoration-botanical"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  )
}

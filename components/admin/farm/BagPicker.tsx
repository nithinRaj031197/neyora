'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { loadBagsAction, type BagsState } from '@/lib/farm/actions'
import type { PickerBag } from '@/lib/farm/repository'
import { cn } from '@/lib/utils/cn'

/**
 * Choosing the contaminated bags.
 *
 * ── THE SHAPE OF THE PROBLEM ──────────────────────────────────────────────
 *
 * A batch holds forty to a hundred-odd bags, and the admin is standing in a
 * growing room holding a phone in one hand. They have just seen green mould on
 * three bags and they know the numbers. So the fast path is: type 13, tap it,
 * type 18, tap it — not scroll a list of a hundred looking for B013.
 *
 * Search therefore matches on the bag NUMBER as well as the full id, because
 * "13" is what the admin read off the bag, and "BAT-202610-001-B013" is what
 * the sheet calls it. Typing `13` finds B013 immediately.
 *
 * ── WHY THE BAGS ARE NOT PASSED IN AS A PROP ──────────────────────────────
 *
 * They are fetched when a batch is chosen. Shipping every batch's bags into
 * the dashboard would mean reading the one tab that grows without bound on
 * every page load, to fill a control that is usually never opened.
 *
 * ── PREVIOUSLY REPORTED IS A HINT, NOT A RULE ─────────────────────────────
 *
 * A bag already named in an earlier event is marked, because re-reporting the
 * same bag by accident is the easy mistake. It is NOT disabled: the same bag
 * can legitimately be observed again — isolated on Monday, discarded on
 * Friday — and the analytics de-duplicate across events precisely so that the
 * second honest observation costs nothing.
 */

export function BagPicker({
  batchId,
  selected,
  onChange,
}: {
  batchId: string
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [bags, setBags] = useState<PickerBag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()

  /*
   * Every state change happens INSIDE the transition, not beside it. Clearing
   * the error synchronously before the request would be a setState in an
   * effect body — a cascading render, and the lint rule that says so is right:
   * the component has nothing useful to show between "error" and "loading"
   * anyway, because `pending` already covers it.
   */
  const load = useCallback((id: string) => {
    startTransition(async () => {
      const result: BagsState = await loadBagsAction(id)
      if (result.status === 'ok') {
        setBags(result.bags)
        setError(null)
      } else {
        setBags([])
        setError(result.message)
      }
    })
  }, [])

  /*
   * Fetching on mount, not on every batch change: the parent gives this
   * component `key={batchId}`, so switching batches makes a NEW picker with an
   * empty selection and an empty search. That keeps the reset where it belongs
   * — a bag id belongs to exactly one batch, and carrying B013 across would
   * submit another batch's bag — without an effect that writes state.
   */
  useEffect(() => {
    if (batchId) load(batchId)
  }, [batchId, load])

  const toggle = (bagId: string) =>
    onChange(selected.includes(bagId) ? selected.filter((b) => b !== bagId) : [...selected, bagId])

  const needle = query.trim().toLowerCase()
  const visible = needle
    ? bags.filter(
        (bag) =>
          bag.bagId.toLowerCase().includes(needle) || String(bag.bagNumber).padStart(3, '0').includes(needle),
      )
    : bags

  if (pending && bags.length === 0) {
    return <Shell>Loading bags…</Shell>
  }

  if (error) {
    return (
      <Shell>
        <p className="text-clay">{error}</p>
        <button
          type="button"
          onClick={() => load(batchId)}
          className="press mt-2 h-10 rounded-xs border border-beige px-4 text-[0.8125rem] text-earth"
        >
          Try again
        </button>
      </Shell>
    )
  }

  if (bags.length === 0) {
    return (
      <Shell>
        No bag records for this batch yet. Open the batch to generate them, or record a count instead.
      </Shell>
    )
  }

  return (
    <div className="grid gap-2">
      {/* Hidden inputs, not the checkboxes themselves: the visible grid is
          filtered by the search, and an unmounted checkbox would silently drop
          a bag the admin had already chosen. */}
      {selected.map((bagId) => (
        <input key={bagId} type="hidden" name="bagIds" value={bagId} />
      ))}

      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a bag — 13, or B013"
          aria-label="Find a bag"
          className="h-11 min-w-0 flex-1 rounded-xs border border-beige bg-ivory px-3 text-[0.9375rem] text-earth focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf"
        />
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="press h-11 shrink-0 rounded-xs border border-beige px-3 text-[0.8125rem] text-earth-soft"
          >
            Clear
          </button>
        )}
      </div>

      <p aria-live="polite" className="text-[0.8125rem] text-earth-soft">
        {selected.length === 0
          ? `${bags.length} bags`
          : `${selected.length} of ${bags.length} bags selected`}
      </p>

      <div className="max-h-56 overflow-y-auto rounded-xs border border-beige p-2">
        {visible.length === 0 ? (
          <p className="px-1 py-3 text-[0.8125rem] text-earth-muted">No bag matches “{query}”.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {visible.map((bag) => {
              const isSelected = selected.includes(bag.bagId)
              return (
                <button
                  key={bag.bagId}
                  type="button"
                  onClick={() => toggle(bag.bagId)}
                  aria-pressed={isSelected}
                  // The id, not the shorthand — a screen reader should not have
                  // to guess which batch "013" belongs to.
                  aria-label={`${bag.bagId}${bag.previouslyReported ? ', previously reported' : ''}`}
                  className={cn(
                    'press relative h-11 rounded-xs border text-[0.8125rem] tabular-nums',
                    isSelected
                      ? 'border-forest bg-forest font-medium text-ivory'
                      : 'border-beige text-earth-soft',
                  )}
                >
                  {String(bag.bagNumber).padStart(3, '0')}
                  {bag.previouslyReported && (
                    <span
                      aria-hidden
                      title="Previously reported"
                      className={cn(
                        'absolute top-1 right-1 size-1.5 rounded-full',
                        isSelected ? 'bg-ivory/80' : 'bg-clay',
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {bags.some((bag) => bag.previouslyReported) && (
        <p className="flex items-center gap-1.5 text-[0.75rem] text-earth-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-clay" />
          Already named in an earlier report — you can still select it.
        </p>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xs border border-beige p-3 text-[0.8125rem] text-earth-soft">{children}</div>
  )
}

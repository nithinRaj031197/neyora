'use client'

import { useId } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Generic add / remove / reorder list.
 *
 * Reorder is done with explicit up/down buttons rather than drag-and-drop:
 * buttons are keyboard-operable, announce themselves to a screen reader, and
 * work on a touch screen — none of which is true of a drag handle without a
 * great deal more code.
 */
export function RepeatableList<T>({
  items,
  onChange,
  render,
  addLabel,
  emptyLabel,
  makeEmpty,
  itemLabel,
  max = 200,
}: {
  items: T[]
  onChange: (next: T[]) => void
  render: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode
  addLabel: string
  emptyLabel: string
  makeEmpty: () => T
  itemLabel: (item: T, index: number) => string
  max?: number
}) {
  const listId = useId()

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return
    next.splice(to, 0, moved)
    onChange(next)
  }

  const iconButton =
    'inline-flex h-8 w-8 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest disabled:pointer-events-none disabled:opacity-35'

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-beige px-4 py-6 text-center text-[0.8125rem] text-earth-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li
              key={`${listId}-${index}`}
              className="rounded-sm border border-beige bg-ivory-soft p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[0.6875rem] font-semibold tracking-[0.12em] text-earth-muted uppercase">
                  {itemLabel(item, index)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${itemLabel(item, index)} up`}
                    className={iconButton}
                  >
                    <Icon name="chevron-down" size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${itemLabel(item, index)} down`}
                    className={iconButton}
                  >
                    <Icon name="chevron-down" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                    aria-label={`Remove ${itemLabel(item, index)}`}
                    className={`${iconButton} hover:border-danger hover:text-danger`}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>

              {render(item, index, (patch) =>
                onChange(items.map((existing, i) => (i === index ? { ...existing, ...patch } : existing))),
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...items, makeEmpty()])}
        disabled={items.length >= max}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="plus" size={15} />
        {addLabel}
      </button>
    </div>
  )
}

'use client'

import { Input, Select } from '@/components/ui/Form'
import { RepeatableList } from './RepeatableList'
import type { Ingredient } from '@/types/database'

const UNITS = [
  '', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'clove', 'sprig', 'piece',
  'pinch', 'handful', 'small', 'medium', 'large',
]

/**
 * Structured ingredient editor.
 *
 * The reason ingredients are not simply typed into the Markdown body: a
 * numeric `qty` plus a `scalable` flag is what makes Recipe JSON-LD, the
 * tick-off checklist and automatic pack-size scaling possible. Prose cannot
 * be multiplied; this can.
 */
export function IngredientsEditor({
  name,
  value,
  onChange,
}: {
  name: string
  value: Ingredient[]
  onChange: (next: Ingredient[]) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* The whole array travels as one JSON field, parsed by the Zod schema
          server-side. Keeps the Server Action payload flat and validated. */}
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      <RepeatableList<Ingredient>
        items={value}
        onChange={onChange}
        addLabel="Add ingredient"
        emptyLabel="No ingredients yet. Add the first one — quantities can be left blank for things like salt."
        itemLabel={(item, index) => item.item || `Ingredient ${index + 1}`}
        makeEmpty={() => ({ qty: null, unit: '', item: '', note: '', scalable: true, group: '' })}
        max={120}
        render={(item, index, update) => (
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-2">
              <label
                htmlFor={`ing-qty-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Quantity
              </label>
              <Input
                id={`ing-qty-${index}`}
                type="number"
                step="any"
                min="0"
                value={item.qty ?? ''}
                onChange={(event) =>
                  update({ qty: event.target.value === '' ? null : Number(event.target.value) })
                }
                className="mt-1 h-10"
                placeholder="200"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor={`ing-unit-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Unit
              </label>
              <Select
                id={`ing-unit-${index}`}
                value={item.unit}
                onChange={(event) => update({ unit: event.target.value })}
                className="mt-1 h-10"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit || '—'}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor={`ing-item-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Ingredient
              </label>
              <Input
                id={`ing-item-${index}`}
                value={item.item}
                onChange={(event) => update({ item: event.target.value })}
                className="mt-1 h-10"
                placeholder="oyster mushrooms"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor={`ing-note-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Note
              </label>
              <Input
                id={`ing-note-${index}`}
                value={item.note ?? ''}
                onChange={(event) => update({ note: event.target.value })}
                className="mt-1 h-10"
                placeholder="torn into strips"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor={`ing-group-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Group (optional)
              </label>
              <Input
                id={`ing-group-${index}`}
                value={item.group ?? ''}
                onChange={(event) => update({ group: event.target.value })}
                className="mt-1 h-10"
                placeholder="For the batter"
              />
            </div>

            <div className="flex items-end sm:col-span-7">
              <label className="flex cursor-pointer items-start gap-2.5 pb-1">
                <input
                  type="checkbox"
                  checked={item.scalable}
                  onChange={(event) => update({ scalable: event.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-botanical"
                />
                <span className="text-[0.75rem] leading-relaxed text-earth-soft">
                  Scale this with pack size
                  <span className="mt-0.5 block text-earth-muted">
                    Leave off for anything measured by taste — salt, pepper, oil for frying.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}
      />
    </div>
  )
}

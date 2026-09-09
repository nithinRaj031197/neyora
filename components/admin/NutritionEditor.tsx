'use client'

import { Field, Input, Textarea } from '@/components/ui/Form'
import { RepeatableList } from './RepeatableList'
import type { Nutrition, NutritionFact } from '@/types/database'

/**
 * Nutrition editor.
 *
 * `note` is a first-class field rather than an afterthought because nutrition
 * claims are regulated: the caveat should be as easy to write as the numbers,
 * and it is rendered prominently on the public page.
 */
export function NutritionEditor({
  name,
  value,
  onChange,
}: {
  name: string
  value: Nutrition
  onChange: (next: Nutrition) => void
}) {
  const facts = value.per ?? []

  return (
    <div className="flex flex-col gap-5">
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      <Field
        label="Basis"
        htmlFor="nutrition-basis"
        hint="What the figures are per — e.g. “Per 100 g, raw” or “Per serving”."
      >
        <Input
          id="nutrition-basis"
          value={value.basis ?? ''}
          onChange={(event) => onChange({ ...value, basis: event.target.value })}
          placeholder="Per 100 g, raw"
        />
      </Field>

      <RepeatableList<NutritionFact>
        items={facts}
        onChange={(next) => onChange({ ...value, per: next })}
        addLabel="Add nutrient"
        emptyLabel="No nutrition figures yet. These appear as a table, and feed the recipe's structured data."
        itemLabel={(item, index) => item.label || `Nutrient ${index + 1}`}
        makeEmpty={() => ({ label: '', value: '', unit: '' })}
        max={30}
        render={(item, index, update) => (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor={`nut-label-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Nutrient
              </label>
              <Input
                id={`nut-label-${index}`}
                value={item.label}
                onChange={(event) => update({ label: event.target.value })}
                className="mt-1 h-10"
                placeholder="Protein"
              />
            </div>
            <div>
              <label
                htmlFor={`nut-value-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Value
              </label>
              <Input
                id={`nut-value-${index}`}
                value={item.value}
                onChange={(event) => update({ value: event.target.value })}
                className="mt-1 h-10"
                placeholder="3.3"
              />
            </div>
            <div>
              <label
                htmlFor={`nut-unit-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Unit
              </label>
              <Input
                id={`nut-unit-${index}`}
                value={item.unit ?? ''}
                onChange={(event) => update({ unit: event.target.value })}
                className="mt-1 h-10"
                placeholder="g"
              />
            </div>
          </div>
        )}
      />

      <Field
        label="Note"
        htmlFor="nutrition-note"
        hint="Shown under the table. Say where the figures come from — an estimate is fine, as long as it says so."
      >
        <Textarea
          id="nutrition-note"
          value={value.note ?? ''}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          rows={2}
          placeholder="Estimated values. Replace with your own lab report before making a nutrition claim."
        />
      </Field>
    </div>
  )
}

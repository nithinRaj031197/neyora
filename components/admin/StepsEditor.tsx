'use client'

import { Input, Textarea } from '@/components/ui/Form'
import { RepeatableList } from './RepeatableList'
import type { RecipeStep } from '@/types/database'

/**
 * Structured method-step editor.
 *
 * Steps are stored separately from the Markdown body because Google's Recipe
 * rich results need `HowToStep` objects with individual text and anchors —
 * something a prose blob cannot provide.
 */
export function StepsEditor({
  name,
  value,
  onChange,
}: {
  name: string
  value: RecipeStep[]
  onChange: (next: RecipeStep[]) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      <RepeatableList<RecipeStep>
        items={value}
        onChange={onChange}
        addLabel="Add step"
        emptyLabel="No steps yet. Each step becomes a numbered instruction on the recipe page."
        itemLabel={(item, index) => item.title || `Step ${index + 1}`}
        makeEmpty={() => ({ title: '', body: '', duration_minutes: null, media_id: null })}
        max={80}
        render={(item, index, update) => (
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8">
              <label
                htmlFor={`step-title-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Short title (optional)
              </label>
              <Input
                id={`step-title-${index}`}
                value={item.title ?? ''}
                onChange={(event) => update({ title: event.target.value })}
                className="mt-1 h-10"
                placeholder="Sear in a single layer"
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor={`step-time-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                Minutes (optional)
              </label>
              <Input
                id={`step-time-${index}`}
                type="number"
                min="0"
                max="1440"
                value={item.duration_minutes ?? ''}
                onChange={(event) =>
                  update({
                    duration_minutes: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className="mt-1 h-10"
                placeholder="3"
              />
            </div>

            <div className="sm:col-span-12">
              <label
                htmlFor={`step-body-${index}`}
                className="text-[0.6875rem] font-medium text-earth-muted"
              >
                What to do
              </label>
              <Textarea
                id={`step-body-${index}`}
                value={item.body}
                onChange={(event) => update({ body: event.target.value })}
                rows={3}
                className="mt-1"
                placeholder="Lay the mushrooms flat with space between them. Leave them alone for 2–3 minutes."
                required
              />
            </div>
          </div>
        )}
      />
    </div>
  )
}

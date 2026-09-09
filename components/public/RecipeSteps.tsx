import { Icon } from '@/components/ui/Icon'
import { formatDuration } from '@/lib/utils/format'
import type { RecipeStep } from '@/types/database'

/**
 * Numbered method steps.
 *
 * Each step gets an `id` so the Recipe JSON-LD `HowToStep.url` anchors
 * resolve — Google links directly to a step in some rich results, and a
 * dangling anchor there is a broken promise.
 */
export function RecipeSteps({ steps }: { steps: RecipeStep[] }) {
  if (steps.length === 0) return null

  return (
    <section aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-(length:--text-display-sm)">
        Method
      </h2>

      <ol className="mt-7 flex flex-col gap-8">
        {steps.map((step, index) => (
          <li
            key={index}
            id={`step-${index + 1}`}
            className="grid grid-cols-[2.5rem_1fr] gap-x-4 scroll-mt-28 sm:grid-cols-[3rem_1fr] sm:gap-x-6"
          >
            <span
              aria-hidden="true"
              className="font-display text-[1.75rem] leading-none text-leaf sm:text-[2.25rem]"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              {step.title ? (
                <h3 className="font-sans text-[1.0625rem] font-semibold text-forest">
                  {step.title}
                </h3>
              ) : null}
              <p className="mt-1.5 max-w-[62ch] text-[1.0625rem] leading-relaxed text-earth">
                {step.body}
              </p>
              {step.duration_minutes ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 text-[0.8125rem] text-earth-muted">
                  <Icon name="clock" size={14} />
                  {formatDuration(step.duration_minutes)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

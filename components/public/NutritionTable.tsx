import type { Nutrition } from '@/types/database'

/**
 * Nutrition panel.
 *
 * Renders the editor's `note` verbatim and prominently. Nutrition claims are
 * a regulated area, and the seeded content says its figures are indicative —
 * hiding that caveat in small grey text would be the wrong call.
 */
export function NutritionTable({ nutrition }: { nutrition: Nutrition }) {
  const facts = nutrition.per ?? []
  if (facts.length === 0) return null

  return (
    <section aria-labelledby="nutrition-heading">
      <h2 id="nutrition-heading" className="font-display text-xl text-forest">
        Nutrition
      </h2>
      {nutrition.basis ? (
        <p className="mt-1.5 text-[0.8125rem] text-earth-muted">{nutrition.basis}</p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-sm border border-beige">
        <table className="w-full text-[0.9375rem]">
          <caption className="sr-only">
            Nutrition information{nutrition.basis ? ` — ${nutrition.basis}` : ''}
          </caption>
          <tbody>
            {facts.map((fact) => (
              <tr key={fact.label} className="border-b border-beige/70 last:border-b-0">
                <th scope="row" className="px-4 py-3 text-left font-normal text-earth-soft">
                  {fact.label}
                </th>
                <td className="px-4 py-3 text-right font-medium text-forest tabular-nums">
                  {fact.value}
                  {fact.unit ? <span className="ml-0.5 font-normal">{fact.unit}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nutrition.note ? (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-earth-muted">{nutrition.note}</p>
      ) : null}
    </section>
  )
}

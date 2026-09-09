'use client'

import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Form'

/**
 * A simple list of strings — equipment, product highlights.
 *
 * Deliberately lighter than RepeatableList: for one-line values, a row with an
 * input and a remove button is all that is warranted.
 */
export function StringListEditor({
  name,
  value,
  onChange,
  label,
  hint,
  placeholder,
  addLabel = 'Add item',
  max = 30,
}: {
  name: string
  value: string[]
  onChange: (next: string[]) => void
  label: string
  hint?: string
  placeholder?: string
  addLabel?: string
  max?: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium text-earth">{label}</span>
      {hint ? (
        <p className="max-w-[70ch] text-[0.75rem] leading-relaxed text-earth-muted">{hint}</p>
      ) : null}

      {/* Empty strings are dropped so a blank row never reaches the database. */}
      <input type="hidden" name={name} value={JSON.stringify(value.filter((v) => v.trim()))} />

      {value.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {value.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(event) =>
                  onChange(value.map((existing, i) => (i === index ? event.target.value : existing)))
                }
                placeholder={placeholder}
                aria-label={`${label} ${index + 1}`}
                className="h-10"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove ${item || `item ${index + 1}`}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-danger hover:text-danger"
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => onChange([...value, ''])}
        disabled={value.length >= max}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="plus" size={14} />
        {addLabel}
      </button>
    </div>
  )
}

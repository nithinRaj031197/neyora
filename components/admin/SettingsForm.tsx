'use client'

import { useActionState } from 'react'
import { saveSettings, type SettingsState } from '@/lib/settings/actions'
import { SETTINGS_FIELDS } from '@/lib/settings/schema'
import { cn } from '@/lib/utils/cn'

/**
 * Contact details.
 *
 * Each field shows the value currently in effect and, where that value comes
 * from `content/site.yml` rather than from an earlier edit, says so. Clearing a
 * field removes the override and falls back to the file — which is why the
 * placeholder is always the file's value: it shows what you would get back.
 */
export function SettingsForm({
  values,
  fileDefaults,
}: {
  values: Partial<Record<string, string>>
  fileDefaults: Partial<Record<string, string>>
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {
    status: 'idle',
  })
  const err = state.status === 'error' ? state.fieldErrors : undefined

  return (
    <form action={action} className="mt-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {SETTINGS_FIELDS.map((field) => {
          const fileValue = fileDefaults[field.name]
          const overridden = values[field.name] !== undefined
          return (
            <div key={field.name} className={field.name.startsWith('address') ? '' : 'sm:col-span-2'}>
              <label
                htmlFor={field.name}
                className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-earth-soft"
              >
                {field.label}
                {!overridden && fileValue ? (
                  <span className="text-[0.6875rem] text-earth-muted">from site.yml</span>
                ) : null}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                defaultValue={values[field.name] ?? ''}
                placeholder={fileValue ?? ''}
                aria-invalid={Boolean(err?.[field.name])}
                aria-describedby={field.hint ? `${field.name}-hint` : undefined}
                className={cn(
                  'mt-1.5 h-12 w-full rounded-xs border bg-ivory px-3.5 text-[0.9375rem] text-earth',
                  'placeholder:text-earth-muted/60 focus-visible:outline-2 focus-visible:outline-leaf',
                  err?.[field.name] ? 'border-danger' : 'border-beige',
                )}
              />
              {err?.[field.name] ? (
                <p className="mt-1 text-[0.8125rem] text-danger">{err[field.name]}</p>
              ) : field.hint ? (
                <p id={`${field.name}-hint`} className="mt-1 text-[0.8125rem] text-earth-muted">
                  {field.hint}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="mt-6 rounded-xs bg-danger/10 px-3.5 py-2.5 text-[0.875rem] text-danger">
          {state.message}
        </p>
      ) : null}
      {state.status === 'saved' ? (
        <p role="status" className="mt-6 rounded-xs bg-success/10 px-3.5 py-2.5 text-[0.875rem] text-forest">
          Saved. The public site is updated.
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-4 border-t border-beige pt-6">
        <button
          type="submit"
          disabled={pending}
          className="press h-12 rounded-xs border border-forest bg-forest px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase hover:bg-forest-soft disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <p className="text-[0.8125rem] text-earth-muted">
          Clear a field to fall back to <code className="font-mono">content/site.yml</code>.
        </p>
      </div>
    </form>
  )
}

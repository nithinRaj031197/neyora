'use client'

import { useActionState } from 'react'
import { saveSettings, type SettingsState } from '@/lib/settings/actions'
import { SETTINGS_FIELDS } from '@/lib/settings/schema'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useActionToast } from './useActionToast'
import { cn } from '@/lib/utils/cn'

/**
 * Contact details.
 *
 * Each field shows the value currently in effect and, where that value comes
 * from `content/site.yml` rather than from an earlier edit, says so. Clearing a
 * field removes the override and falls back to the file — which is why the
 * placeholder is always the file's value: it shows what you would get back.
 *
 * Grouped into two cards rather than one eleven-field wall. "How customers
 * reach us" and "Where we are" are answered at different times and by
 * different people; a form that mirrors that is faster to scan than a grid.
 */

/** Grouped by the question each set of fields answers, not by storage shape. */
const GROUPS = [
  {
    title: 'How customers reach you',
    description:
      'These sit in the footer, on the contact page, and behind every WhatsApp button on the site.',
    fields: ['contactEmail', 'contactPhone', 'whatsappNumber', 'whatsappMessage', 'businessHours'],
  },
  {
    title: 'Where you are',
    description: 'Used on the contact page and in the structured data search engines read.',
    fields: [
      'addressLine1',
      'addressLine2',
      'addressCity',
      'addressState',
      'addressPostalCode',
      'addressCountry',
    ],
  },
] as const

/** The address fields are short; they pair two to a row above 640px. */
const HALF_WIDTH = new Set([
  'addressCity',
  'addressState',
  'addressPostalCode',
  'addressCountry',
  'contactEmail',
  'contactPhone',
])

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

  useActionToast(state, {
    title: 'Contact details saved',
    description: 'The public site is already showing them.',
  })

  return (
    <form action={action} className="mt-8">
      <div className="grid gap-6">
        {GROUPS.map((group) => (
          <section key={group.title} className="rounded-sm border border-beige bg-ivory p-6 sm:p-8">
            <h2 className="font-display text-[1.125rem] text-forest">{group.title}</h2>
            <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-earth-muted">
              {group.description}
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {group.fields.map((name) => {
                const field = SETTINGS_FIELDS.find((f) => f.name === name)
                if (!field) return null

                const fileValue = fileDefaults[field.name]
                const overridden = values[field.name] !== undefined

                return (
                  <Field
                    key={field.name}
                    label={field.label}
                    hint={field.hint || undefined}
                    error={err?.[field.name]}
                    note={!overridden && fileValue ? 'from site.yml' : undefined}
                    className={cn(!HALF_WIDTH.has(field.name) && 'sm:col-span-2')}
                  >
                    <Input
                      name={field.name}
                      type={field.type}
                      defaultValue={values[field.name] ?? ''}
                      placeholder={fileValue ?? ''}
                    />
                  </Field>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/*
        The save control follows the page on a long form so it is never a
        scroll away, and sits above the phone's bottom nav. The toast reports
        the result; this bar only reports the attempt.
      */}
      <div className="sticky bottom-20 z-30 mt-6 sm:bottom-6">
        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-beige bg-ivory/92 px-5 py-4 shadow-[0_8px_30px_-16px_rgb(20_18_15_/_0.35)] backdrop-blur-md">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
          <p className="hidden items-center gap-2 text-[0.8125rem] text-earth-muted sm:flex">
            <Icon name="alert" size={15} className="shrink-0 text-earth-muted/70" />
            Clear a field to fall back to <code className="font-mono">content/site.yml</code>.
          </p>
        </div>
      </div>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { saveHomepageSections, type HomepageState } from '@/lib/homepage/actions'
import { HOMEPAGE_SECTIONS, type HomepageSectionKey } from '@/lib/homepage/schema'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { useActionToast } from './useActionToast'

/**
 * Which homepage chapters are shown.
 *
 * Switches rather than checkboxes: each one takes effect on the live site, it
 * is not a value being collected. Unchecked switches submit nothing, so the
 * action reads "off" from absence and writes the whole set — see
 * lib/homepage/actions.ts.
 *
 * Only visibility. The words and pictures in each chapter live in
 * `content/homepage.yml`, because they are composed artwork and authored copy,
 * not fields.
 */
export function HomepageSectionsForm({
  values,
}: {
  /** The chapter's current state: the file's default, with any override on top. */
  values: Record<HomepageSectionKey, boolean>
}) {
  const [state, action, pending] = useActionState<HomepageState, FormData>(saveHomepageSections, {
    status: 'idle',
  })

  useActionToast(state, {
    title: 'Homepage updated',
    description: 'The public homepage already reflects it.',
  })

  return (
    <form action={action}>
      <ul className="grid gap-px overflow-clip rounded-xs border border-beige bg-beige">
        {HOMEPAGE_SECTIONS.map((section) => (
          <li
            key={section.key}
            className="flex items-start justify-between gap-5 bg-ivory px-4 py-4 sm:px-5"
          >
            <div className="min-w-0">
              <label
                htmlFor={`section-${section.key}`}
                className="text-[0.9375rem] font-medium text-forest"
              >
                {section.label}
              </label>
              <p className="mt-1 max-w-[58ch] text-[0.8125rem] leading-relaxed text-earth-muted">
                {section.description}
              </p>
            </div>
            <Switch
              id={`section-${section.key}`}
              name={section.key}
              defaultChecked={values[section.key]}
              className="mt-0.5"
            />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save homepage'}
        </Button>
        <p className="text-[0.8125rem] text-earth-muted">
          A hidden chapter is not deleted — switch it back on and it returns unchanged.
        </p>
      </div>
    </form>
  )
}

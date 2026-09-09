'use client'

import { useState } from 'react'
import { Field, Input } from '@/components/ui/Form'
import { slugify } from '@/lib/validation/common'
import { Icon } from '@/components/ui/Icon'

/**
 * Slug input that follows the title until it is edited by hand.
 *
 * Once a page is published its URL is a promise to anyone who linked to it, so
 * the slug deliberately stops auto-following as soon as either the editor
 * touches it or the record already exists.
 */
export function SlugField({
  name = 'slug',
  title,
  defaultValue = '',
  error,
  prefix,
  locked = false,
}: {
  name?: string
  title: string
  defaultValue?: string
  error?: string
  /** e.g. "/recipes/" — shown before the input so the URL is obvious. */
  prefix?: string
  /** True when editing an existing record: never auto-change a live URL. */
  locked?: boolean
}) {
  /*
   * Until the field is edited by hand, the slug is *derived* from the title
   * during render rather than mirrored into state by an effect. One source of
   * truth, and no cascading render on every keystroke in the title field.
   */
  const [manualSlug, setManualSlug] = useState(defaultValue)
  const [touched, setTouched] = useState(Boolean(defaultValue))

  const slug = touched || locked ? manualSlug : slugify(title)

  return (
    <Field
      label="URL slug"
      htmlFor={name}
      required
      error={error}
      hint={
        locked
          ? 'Changing this breaks any existing links to the page. Only change it if you know nothing points here yet.'
          : 'Lowercase letters, numbers and hyphens. Generated from the title until you edit it.'
      }
    >
      <div className="flex items-stretch">
        {prefix ? (
          <span className="inline-flex shrink-0 items-center rounded-l-xs border border-r-0 border-beige bg-ivory-soft px-3 font-mono text-[0.8125rem] text-earth-muted">
            {prefix}
          </span>
        ) : null}
        <Input
          id={name}
          name={name}
          value={slug}
          onChange={(event) => {
            setTouched(true)
            setManualSlug(event.target.value)
          }}
          required
          spellCheck={false}
          autoCapitalize="off"
          invalid={Boolean(error)}
          className={prefix ? 'rounded-l-none font-mono' : 'font-mono'}
        />
        {!locked && touched ? (
          <button
            type="button"
            onClick={() => {
              setTouched(false)
              setManualSlug(slugify(title))
            }}
            title="Regenerate from the title"
            aria-label="Regenerate slug from the title"
            className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest"
          >
            <Icon name="arrow-right" size={15} className="rotate-90" />
          </button>
        ) : null}
      </div>
    </Field>
  )
}

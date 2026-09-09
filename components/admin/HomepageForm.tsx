'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveHomepage } from '@/lib/actions/pages'
import { IDLE } from '@/lib/actions/state'
import { Alert } from '@/components/ui/Alert'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form'
import { AdminPanel } from './AdminShell'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { ImageField } from './ImageField'
import { RepeatableList } from './RepeatableList'
import { useActionToast } from './Toast'
import type { HomepageRow, MediaRow, Pillar } from '@/types/database'

function Save() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save homepage'}
    </button>
  )
}

const SECTIONS = [
  { key: 'products', label: 'Products' },
  { key: 'why', label: 'Why NEYORA' },
  { key: 'farm', label: 'Farm story' },
  { key: 'recipes', label: 'Recipe discovery' },
  { key: 'community', label: 'Testimonials' },
  { key: 'social', label: 'Social links' },
  { key: 'final_cta', label: 'Closing call to action' },
] as const

/**
 * Homepage editor.
 *
 * Every visible string on the homepage is a field here — which is the point of
 * the brief: "I should not need to modify source code for normal content
 * changes." The section toggles let you remove a whole block without deleting
 * the copy you wrote for it.
 */
export function HomepageForm({
  homepage,
  media,
}: {
  homepage: HomepageRow
  media: { hero: MediaRow | null; farm: MediaRow | null; cta: MediaRow | null; og: MediaRow | null }
}) {
  const [state, formAction] = useActionState(saveHomepage, IDLE)
  useActionToast(state)

  const [pillars, setPillars] = useState<Pillar[]>(homepage.why_pillars ?? [])
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of SECTIONS) {
      initial[section.key] = homepage.section_visibility?.[section.key] !== false
    }
    return initial
  })

  const error = (field: string) => state.errors?.[field]

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="Not saved">
          {state.message}
        </Alert>
      ) : null}
      {state.status === 'success' && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      <input type="hidden" name="section_visibility" value={JSON.stringify(visibility)} />
      <input type="hidden" name="why_pillars" value={JSON.stringify(pillars)} />

      <AdminPanel
        title="Hero"
        description="The first thing a visitor sees. The headline is set in the NEYORA wordmark style, so keep it to the brand name unless you have a reason not to."
      >
        <div className="flex flex-col gap-5">
          <Field label="Eyebrow" htmlFor="hero_eyebrow" hint="Small uppercase line above the headline.">
            <Input id="hero_eyebrow" name="hero_eyebrow" defaultValue={homepage.hero_eyebrow ?? ''} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Headline" htmlFor="hero_headline" required error={error('hero_headline')}>
              <Input
                id="hero_headline"
                name="hero_headline"
                required
                defaultValue={homepage.hero_headline}
                invalid={Boolean(error('hero_headline'))}
              />
            </Field>
            <Field label="Sub-headline" htmlFor="hero_subheadline" hint="Usually the tagline.">
              <Input
                id="hero_subheadline"
                name="hero_subheadline"
                defaultValue={homepage.hero_subheadline}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="hero_description" error={error('hero_description')}>
            <Textarea
              id="hero_description"
              name="hero_description"
              rows={3}
              defaultValue={homepage.hero_description ?? ''}
              maxLength={600}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Primary button label" htmlFor="hero_cta_label">
              <Input id="hero_cta_label" name="hero_cta_label" defaultValue={homepage.hero_cta_label ?? ''} />
            </Field>
            <Field
              label="Primary button link"
              htmlFor="hero_cta_href"
              hint="A path like /products, or a full https:// URL."
              error={error('hero_cta_href')}
            >
              <Input
                id="hero_cta_href"
                name="hero_cta_href"
                defaultValue={homepage.hero_cta_href ?? ''}
                invalid={Boolean(error('hero_cta_href'))}
                className="font-mono"
              />
            </Field>
            <Field label="Secondary button label" htmlFor="hero_secondary_cta_label">
              <Input
                id="hero_secondary_cta_label"
                name="hero_secondary_cta_label"
                defaultValue={homepage.hero_secondary_cta_label ?? ''}
              />
            </Field>
            <Field
              label="Secondary button link"
              htmlFor="hero_secondary_cta_href"
              error={error('hero_secondary_cta_href')}
            >
              <Input
                id="hero_secondary_cta_href"
                name="hero_secondary_cta_href"
                defaultValue={homepage.hero_secondary_cta_href ?? ''}
                invalid={Boolean(error('hero_secondary_cta_href'))}
                className="font-mono"
              />
            </Field>
          </div>

          <ImageField
            name="hero_image_id"
            label="Hero image"
            hint="The single most important image on the site. Landscape, 4:3 or wider."
            defaultMedia={media.hero}
            folder="hero"
          />

          <Field label="Image caption" htmlFor="hero_image_caption" hint="A short editorial line under the photograph.">
            <Input
              id="hero_image_caption"
              name="hero_image_caption"
              defaultValue={homepage.hero_image_caption ?? ''}
            />
          </Field>
        </div>
      </AdminPanel>

      <AdminPanel title="Sections shown" description="Turn a whole section off without losing the copy you wrote for it.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Checkbox
              key={section.key}
              label={section.label}
              checked={visibility[section.key] ?? true}
              onChange={(event) =>
                setVisibility((prev) => ({ ...prev, [section.key]: event.target.checked }))
              }
            />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Products section">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Eyebrow" htmlFor="products_eyebrow">
              <Input id="products_eyebrow" name="products_eyebrow" defaultValue={homepage.products_eyebrow ?? ''} />
            </Field>
            <Field label="Heading" htmlFor="products_heading">
              <Input id="products_heading" name="products_heading" defaultValue={homepage.products_heading ?? ''} />
            </Field>
          </div>
          <Field label="Description" htmlFor="products_description">
            <Textarea
              id="products_description"
              name="products_description"
              rows={2}
              defaultValue={homepage.products_description ?? ''}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button label" htmlFor="products_cta_label">
              <Input id="products_cta_label" name="products_cta_label" defaultValue={homepage.products_cta_label ?? ''} />
            </Field>
            <Field label="Button link" htmlFor="products_cta_href" error={error('products_cta_href')}>
              <Input
                id="products_cta_href"
                name="products_cta_href"
                defaultValue={homepage.products_cta_href ?? ''}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Why NEYORA"
        description="The pillars are numbered and shown across the dark green band. Four reads best; more than six starts to look like a list of features."
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Eyebrow" htmlFor="why_eyebrow">
              <Input id="why_eyebrow" name="why_eyebrow" defaultValue={homepage.why_eyebrow ?? ''} />
            </Field>
            <Field label="Heading" htmlFor="why_heading">
              <Input id="why_heading" name="why_heading" defaultValue={homepage.why_heading ?? ''} />
            </Field>
          </div>
          <Field label="Description" htmlFor="why_description">
            <Textarea id="why_description" name="why_description" rows={2} defaultValue={homepage.why_description ?? ''} />
          </Field>

          <RepeatableList<Pillar>
            items={pillars}
            onChange={setPillars}
            addLabel="Add pillar"
            emptyLabel="No pillars yet. These are the promises the brand is built on."
            itemLabel={(item, index) => item.title || `Pillar ${index + 1}`}
            makeEmpty={() => ({ title: '', description: '' })}
            max={8}
            render={(item, index, update) => (
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor={`pillar-title-${index}`} className="text-[0.6875rem] font-medium text-earth-muted">
                    Title
                  </label>
                  <Input
                    id={`pillar-title-${index}`}
                    value={item.title}
                    onChange={(event) => update({ title: event.target.value })}
                    className="mt-1 h-10"
                    placeholder="Quality without compromise"
                  />
                </div>
                <div>
                  <label htmlFor={`pillar-body-${index}`} className="text-[0.6875rem] font-medium text-earth-muted">
                    Description
                  </label>
                  <Textarea
                    id={`pillar-body-${index}`}
                    value={item.description}
                    onChange={(event) => update({ description: event.target.value })}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Farm story">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Eyebrow" htmlFor="farm_eyebrow">
              <Input id="farm_eyebrow" name="farm_eyebrow" defaultValue={homepage.farm_eyebrow ?? ''} />
            </Field>
            <Field label="Heading" htmlFor="farm_heading">
              <Input id="farm_heading" name="farm_heading" defaultValue={homepage.farm_heading ?? ''} />
            </Field>
          </div>
          <Field label="Standfirst" htmlFor="farm_description">
            <Textarea id="farm_description" name="farm_description" rows={2} defaultValue={homepage.farm_description ?? ''} />
          </Field>
          <RichMarkdownEditor
            name="farm_body"
            label="Body"
            hint="A short passage. Link out to the full farm page rather than telling the whole story here."
            defaultValue={homepage.farm_body ?? ''}
            rows={8}
          />
          <ImageField
            name="farm_image_id"
            label="Farm image"
            defaultMedia={media.farm}
            folder="farm"
            aspect="5 / 4"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button label" htmlFor="farm_cta_label">
              <Input id="farm_cta_label" name="farm_cta_label" defaultValue={homepage.farm_cta_label ?? ''} />
            </Field>
            <Field label="Button link" htmlFor="farm_cta_href" error={error('farm_cta_href')}>
              <Input id="farm_cta_href" name="farm_cta_href" defaultValue={homepage.farm_cta_href ?? ''} className="font-mono" />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Recipes section">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Eyebrow" htmlFor="recipes_eyebrow">
              <Input id="recipes_eyebrow" name="recipes_eyebrow" defaultValue={homepage.recipes_eyebrow ?? ''} />
            </Field>
            <Field label="Heading" htmlFor="recipes_heading">
              <Input id="recipes_heading" name="recipes_heading" defaultValue={homepage.recipes_heading ?? ''} />
            </Field>
          </div>
          <Field label="Description" htmlFor="recipes_description">
            <Textarea id="recipes_description" name="recipes_description" rows={2} defaultValue={homepage.recipes_description ?? ''} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button label" htmlFor="recipes_cta_label">
              <Input id="recipes_cta_label" name="recipes_cta_label" defaultValue={homepage.recipes_cta_label ?? ''} />
            </Field>
            <Field label="Button link" htmlFor="recipes_cta_href" error={error('recipes_cta_href')}>
              <Input id="recipes_cta_href" name="recipes_cta_href" defaultValue={homepage.recipes_cta_href ?? ''} className="font-mono" />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Community and social">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Community eyebrow" htmlFor="community_eyebrow">
              <Input id="community_eyebrow" name="community_eyebrow" defaultValue={homepage.community_eyebrow ?? ''} />
            </Field>
            <Field label="Community heading" htmlFor="community_heading">
              <Input id="community_heading" name="community_heading" defaultValue={homepage.community_heading ?? ''} />
            </Field>
          </div>
          <Field label="Community description" htmlFor="community_description">
            <Textarea
              id="community_description"
              name="community_description"
              rows={2}
              defaultValue={homepage.community_description ?? ''}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Social eyebrow" htmlFor="social_eyebrow">
              <Input id="social_eyebrow" name="social_eyebrow" defaultValue={homepage.social_eyebrow ?? ''} />
            </Field>
            <Field label="Social heading" htmlFor="social_heading">
              <Input id="social_heading" name="social_heading" defaultValue={homepage.social_heading ?? ''} />
            </Field>
            <Field label="Handle" htmlFor="social_handle" hint="e.g. @neyora">
              <Input id="social_handle" name="social_handle" defaultValue={homepage.social_handle ?? ''} />
            </Field>
          </div>
          <Field label="Social description" htmlFor="social_description">
            <Textarea id="social_description" name="social_description" rows={2} defaultValue={homepage.social_description ?? ''} />
          </Field>
        </div>
      </AdminPanel>

      <AdminPanel title="Closing call to action">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Eyebrow" htmlFor="final_cta_eyebrow">
              <Input id="final_cta_eyebrow" name="final_cta_eyebrow" defaultValue={homepage.final_cta_eyebrow ?? ''} />
            </Field>
            <Field label="Heading" htmlFor="final_cta_heading">
              <Input id="final_cta_heading" name="final_cta_heading" defaultValue={homepage.final_cta_heading ?? ''} />
            </Field>
          </div>
          <Field label="Description" htmlFor="final_cta_description">
            <Textarea
              id="final_cta_description"
              name="final_cta_description"
              rows={2}
              defaultValue={homepage.final_cta_description ?? ''}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button label" htmlFor="final_cta_label">
              <Input id="final_cta_label" name="final_cta_label" defaultValue={homepage.final_cta_label ?? ''} />
            </Field>
            <Field label="Button link" htmlFor="final_cta_href" error={error('final_cta_href')}>
              <Input id="final_cta_href" name="final_cta_href" defaultValue={homepage.final_cta_href ?? ''} className="font-mono" />
            </Field>
          </div>
          <ImageField
            name="final_cta_image_id"
            label="Background image"
            hint="Used at low opacity behind the text, so choose something with a simple composition."
            defaultMedia={media.cta}
            folder="hero"
            aspect="2 / 1"
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Homepage SEO">
        <div className="flex flex-col gap-5">
          <Field label="SEO title" htmlFor="seo_title" error={error('seo_title')}>
            <Input id="seo_title" name="seo_title" defaultValue={homepage.seo_title ?? ''} maxLength={120} />
          </Field>
          <Field label="SEO description" htmlFor="seo_description" error={error('seo_description')}>
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={2}
              defaultValue={homepage.seo_description ?? ''}
              maxLength={320}
            />
          </Field>
          <ImageField
            name="og_image_id"
            label="Social sharing image"
            hint="Shown when the homepage is shared. Falls back to the hero image."
            defaultMedia={media.og}
            folder="social"
            aspect="1200 / 630"
          />
        </div>
      </AdminPanel>

      <div className="sticky bottom-0 -mx-5 border-t border-beige bg-ivory/97 px-5 py-3.5 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-end">
          <Save />
        </div>
      </div>
    </form>
  )
}

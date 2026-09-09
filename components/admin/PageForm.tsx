'use client'

import { useActionState, useState } from 'react'
import { savePage } from '@/lib/actions/pages'
import { IDLE } from '@/lib/actions/state'
import { Alert } from '@/components/ui/Alert'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form'
import { AdminPanel } from './AdminShell'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { ImageField } from './ImageField'
import { SlugField } from './SlugField'
import { PublishBar } from './PublishBar'
import { useActionToast } from './Toast'
import type { ContentStatus, MediaRow, PageRow } from '@/types/database'

/** Slugs served by a route whose path differs from the slug. */
const SLUG_TO_PATH: Record<string, string> = {
  'faq-intro': '/faq',
  'contact-intro': '/contact',
}

export function PageForm({
  page,
  hero,
}: {
  page: (PageRow & { hero: MediaRow | null }) | null
  hero: MediaRow | null
}) {
  const [state, formAction] = useActionState(savePage, IDLE)
  useActionToast(state)

  const [title, setTitle] = useState(page?.title ?? '')
  const [status, setStatus] = useState<ContentStatus>(page?.status ?? 'draft')
  const [scheduledAt, setScheduledAt] = useState(page?.scheduled_at ?? null)

  const error = (field: string) => state.errors?.[field]
  const publicPath = page ? (SLUG_TO_PATH[page.slug] ?? `/${page.slug}`) : null

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {page ? <input type="hidden" name="id" value={page.id} /> : null}

      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="Not saved">
          {state.message}
        </Alert>
      ) : null}

      {page?.is_system ? (
        <Alert tone="info" title="This page has a fixed URL">
          A route in the application points at <code className="font-mono">{page.slug}</code>, so
          the slug cannot be changed and the page cannot be deleted. Everything else is yours to
          rewrite.
        </Alert>
      ) : null}

      <AdminPanel title="Header">
        <div className="flex flex-col gap-5">
          <Field
            label="Eyebrow"
            htmlFor="eyebrow"
            hint="The small uppercase line above the title. One or two words."
          >
            <Input id="eyebrow" name="eyebrow" defaultValue={page?.eyebrow ?? ''} maxLength={80} />
          </Field>

          <Field label="Title" htmlFor="title" required error={error('title')}>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              invalid={Boolean(error('title'))}
            />
          </Field>

          {page?.is_system ? (
            <>
              <input type="hidden" name="slug" value={page.slug} />
              <Field label="URL slug" htmlFor="slug-locked" hint="Fixed by the application route.">
                <Input id="slug-locked" value={page.slug} disabled readOnly className="font-mono" />
              </Field>
            </>
          ) : (
            <SlugField
              title={title}
              defaultValue={page?.slug ?? ''}
              error={error('slug')}
              prefix="/"
              locked={Boolean(page)}
            />
          )}

          <Field
            label="Subtitle"
            htmlFor="subtitle"
            hint="A sentence under the title. Also used as the meta description when no SEO description is set."
            error={error('subtitle')}
          >
            <Textarea
              id="subtitle"
              name="subtitle"
              rows={2}
              defaultValue={page?.subtitle ?? ''}
              maxLength={400}
            />
          </Field>

          <ImageField
            name="hero_image_id"
            label="Hero image"
            hint="Optional. Sits beside the title at the top of the page."
            defaultMedia={hero}
            folder="pages"
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Content" description="The body of the page, written in Markdown.">
        <RichMarkdownEditor
          name="body"
          label="Page content"
          hint="Headings, bold, italics, lists, tables, quotes, links and images are all supported. Raw HTML is stripped."
          defaultValue={page?.body ?? ''}
          rows={26}
        />
      </AdminPanel>

      <AdminPanel title="Search and social">
        <div className="flex flex-col gap-5">
          <Field label="SEO title" htmlFor="seo_title" error={error('seo_title')}>
            <Input id="seo_title" name="seo_title" defaultValue={page?.seo_title ?? ''} maxLength={120} />
          </Field>
          <Field label="SEO description" htmlFor="seo_description" error={error('seo_description')}>
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={2}
              defaultValue={page?.seo_description ?? ''}
              maxLength={320}
            />
          </Field>
          <Field label="Canonical URL" htmlFor="canonical_url" error={error('canonical_url')}>
            <Input
              id="canonical_url"
              name="canonical_url"
              type="url"
              defaultValue={page?.canonical_url ?? ''}
            />
          </Field>
          <ImageField
            name="og_image_id"
            label="Social sharing image"
            defaultMedia={null}
            folder="social"
            aspect="1200 / 630"
          />
          <Checkbox
            name="noindex"
            label="Hide from search engines"
            hint="Also removes the page from sitemap.xml."
            defaultChecked={page?.noindex ?? false}
          />
          <Field label="Sort order" htmlFor="sort_order">
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={page?.sort_order ?? 0}
              className="max-w-32"
            />
          </Field>
        </div>
      </AdminPanel>

      <PublishBar
        status={status}
        onStatusChange={setStatus}
        scheduledAt={scheduledAt}
        onScheduledAtChange={(value) => setScheduledAt(value || null)}
        scheduleError={error('scheduled_at')}
        publicHref={page && page.status === 'published' && publicPath ? publicPath : undefined}
      />
    </form>
  )
}

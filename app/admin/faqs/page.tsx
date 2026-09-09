import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { PublicationFields } from '@/components/admin/PublicationFields'
import { RichMarkdownEditor } from '@/components/admin/RichMarkdownEditor'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Field, Input } from '@/components/ui/Form'
import { StatusBadge, Badge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminFaqs } from '@/lib/content/admin'
import { deleteFaq, saveFaq } from '@/lib/actions/collections'

export const dynamic = 'force-dynamic'

/**
 * FAQ management.
 *
 * Editing is driven by `?edit=<id>` rather than client state: the form is
 * server-rendered with the row's values, works without JavaScript, and an
 * editor can bookmark or reload mid-edit without losing their place.
 */
export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>
}) {
  await requireAdmin('/admin/faqs')
  const sp = await searchParams

  const faqs = await listAdminFaqs()
  const editing = sp.edit ? faqs.find((f) => f.id === sp.edit) ?? null : null
  const showForm = Boolean(editing || sp.new)

  const categories = [...new Set(faqs.map((f) => f.category))]

  return (
    <>
      <AdminPageHeader
        title="FAQs"
        description="Shown on /faq, grouped by category, and published as FAQ structured data so answers can appear directly in search results."
        breadcrumbs={[{ label: 'FAQs' }]}
        actions={
          !showForm ? (
            <Link
              href="/admin/faqs?new=1"
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
            >
              <Icon name="plus" size={15} />
              Add question
            </Link>
          ) : null
        }
      />

      <AdminBody className="flex flex-col gap-6">
        {showForm ? (
          <AdminPanel
            title={editing ? 'Edit question' : 'New question'}
            description="Answers are written in Markdown, so you can use links, lists and bold text."
          >
            <SimpleForm
              action={saveFaq}
              cancelHref="/admin/faqs"
              submitLabel={editing ? 'Save question' : 'Add question'}
            >
              {(state) => (
                <>
                  {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                  <Field
                    label="Question"
                    htmlFor="question"
                    required
                    error={state.errors?.question}
                  >
                    <Input
                      id="question"
                      name="question"
                      required
                      defaultValue={editing?.question ?? ''}
                      invalid={Boolean(state.errors?.question)}
                      placeholder="How should I store fresh oyster mushrooms?"
                    />
                  </Field>

                  <RichMarkdownEditor
                    name="answer"
                    label="Answer"
                    hint="Be specific and honest. If the answer is “it depends”, say what it depends on."
                    defaultValue={editing?.answer ?? ''}
                    rows={10}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Category"
                      htmlFor="category"
                      hint={
                        categories.length > 0
                          ? `Existing: ${categories.join(', ')}`
                          : 'Groups questions on the FAQ page.'
                      }
                      error={state.errors?.category}
                    >
                      <Input
                        id="category"
                        name="category"
                        list="faq-categories"
                        defaultValue={editing?.category ?? 'General'}
                        invalid={Boolean(state.errors?.category)}
                      />
                    </Field>
                    <datalist id="faq-categories">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>

                    <Field
                      label="Sort order"
                      htmlFor="sort_order"
                      hint="Lower numbers appear first within the category."
                    >
                      <Input
                        id="sort_order"
                        name="sort_order"
                        type="number"
                        defaultValue={editing?.sort_order ?? 0}
                      />
                    </Field>
                  </div>

                  <PublicationFields
                    defaultStatus={editing?.status ?? 'published'}
                    defaultScheduledAt={editing?.scheduled_at ?? null}
                    scheduleError={state.errors?.scheduled_at}
                  />
                </>
              )}
            </SimpleForm>
          </AdminPanel>
        ) : null}

        <AdminPanel title={`All questions (${faqs.length})`}>
          {faqs.length === 0 ? (
            <EmptyState
              icon="alert"
              compact
              title="No questions yet"
              description="Add the questions customers actually ask. They also become structured data for search engines."
              actionLabel="Add the first question"
              actionHref="/admin/faqs?new=1"
            />
          ) : (
            <ul className="flex flex-col">
              {faqs.map((faq) => (
                <li
                  key={faq.id}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-beige/70 py-4 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="outline">{faq.category}</Badge>
                      <StatusBadge
                        status={faq.status}
                        isLive={isPublicationLive(faq.status, faq.scheduled_at)}
                      />
                      {faq.is_demo ? <Badge tone="golden">Demo</Badge> : null}
                    </div>
                    <p className="mt-2 text-[0.9375rem] font-medium text-earth">{faq.question}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/faqs?edit=${faq.id}`}
                      className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                    >
                      Edit
                    </Link>
                    <ConfirmButton
                      action={deleteFaq}
                      hiddenFields={{ id: faq.id }}
                      triggerLabel="Delete"
                      title="Delete this question?"
                      description={`“${faq.question}” will be removed from the FAQ page. This is a soft delete — the record is retained in the database.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </AdminBody>
    </>
  )
}

import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { PublicationFields } from '@/components/admin/PublicationFields'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminTestimonials } from '@/lib/content/admin'
import { deleteTestimonial, saveTestimonial } from '@/lib/actions/collections'

export const dynamic = 'force-dynamic'

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>
}) {
  await requireAdmin('/admin/testimonials')
  const sp = await searchParams

  const testimonials = await listAdminTestimonials()
  const editing = sp.edit ? testimonials.find((t) => t.id === sp.edit) ?? null : null
  const showForm = Boolean(editing || sp.new)

  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description="Featured testimonials appear in the community section of the homepage."
        breadcrumbs={[{ label: 'Testimonials' }]}
        actions={
          !showForm ? (
            <Link
              href="/admin/testimonials?new=1"
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
            >
              <Icon name="plus" size={15} />
              Add testimonial
            </Link>
          ) : null
        }
      />

      <AdminBody className="flex flex-col gap-6">
        {showForm ? (
          <AdminPanel
            title={editing ? 'Edit testimonial' : 'New testimonial'}
            description="Publish only what someone actually said, and only with their permission. Invented reviews are both dishonest and, in most markets, illegal."
          >
            <SimpleForm
              action={saveTestimonial}
              cancelHref="/admin/testimonials"
              submitLabel={editing ? 'Save testimonial' : 'Add testimonial'}
            >
              {(state) => (
                <>
                  {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                  <Field label="Quote" htmlFor="quote" required error={state.errors?.quote}>
                    <Textarea
                      id="quote"
                      name="quote"
                      rows={4}
                      required
                      defaultValue={editing?.quote ?? ''}
                      invalid={Boolean(state.errors?.quote)}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Author name"
                      htmlFor="author_name"
                      required
                      error={state.errors?.author_name}
                    >
                      <Input
                        id="author_name"
                        name="author_name"
                        required
                        defaultValue={editing?.author_name ?? ''}
                        invalid={Boolean(state.errors?.author_name)}
                      />
                    </Field>
                    <Field label="Role or title" htmlFor="author_role">
                      <Input
                        id="author_role"
                        name="author_role"
                        defaultValue={editing?.author_role ?? ''}
                        placeholder="Home cook"
                      />
                    </Field>
                    <Field label="Location" htmlFor="location">
                      <Input
                        id="location"
                        name="location"
                        defaultValue={editing?.location ?? ''}
                        placeholder="Bengaluru"
                      />
                    </Field>
                    <Field
                      label="Rating"
                      htmlFor="rating"
                      hint="1–5. Stored but not shown as stars — we do not publish an aggregate rating."
                    >
                      <Input
                        id="rating"
                        name="rating"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={editing?.rating ?? ''}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Checkbox
                      name="featured"
                      label="Show on the homepage"
                      defaultChecked={editing?.featured ?? false}
                    />
                  </div>

                  <Field label="Sort order" htmlFor="sort_order">
                    <Input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      defaultValue={editing?.sort_order ?? 0}
                      className="max-w-32"
                    />
                  </Field>

                  <PublicationFields
                    defaultStatus={editing?.status ?? 'draft'}
                    defaultScheduledAt={editing?.scheduled_at ?? null}
                    scheduleError={state.errors?.scheduled_at}
                  />
                </>
              )}
            </SimpleForm>
          </AdminPanel>
        ) : null}

        <AdminPanel title={`All testimonials (${testimonials.length})`}>
          {testimonials.length === 0 ? (
            <EmptyState
              icon="users"
              compact
              title="No testimonials yet"
              description="Add real feedback from customers who have given you permission to publish it."
              actionLabel="Add the first one"
              actionHref="/admin/testimonials?new=1"
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {testimonials.map((testimonial) => (
                <li
                  key={testimonial.id}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-beige/70 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={testimonial.status}
                        isLive={isPublicationLive(testimonial.status, testimonial.scheduled_at)}
                      />
                      {testimonial.featured ? <Badge tone="leaf">Homepage</Badge> : null}
                      {testimonial.is_demo ? <Badge tone="golden">Demo</Badge> : null}
                    </div>
                    <p className="mt-2 max-w-[70ch] text-[0.9375rem] leading-relaxed text-earth">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <p className="mt-1.5 text-[0.8125rem] text-earth-muted">
                      {[testimonial.author_name, testimonial.author_role, testimonial.location]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/testimonials?edit=${testimonial.id}`}
                      className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                    >
                      Edit
                    </Link>
                    <ConfirmButton
                      action={deleteTestimonial}
                      hiddenFields={{ id: testimonial.id }}
                      triggerLabel="Delete"
                      title="Delete this testimonial?"
                      description="It will be removed from the website. This is a soft delete — the record is retained in the database."
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

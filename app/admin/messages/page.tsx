import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SearchFilter } from '@/components/admin/SearchFilter'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, Textarea } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminMessages } from '@/lib/content/admin'
import { deleteMessage, updateMessageStatus } from '@/lib/actions/site'
import { formatDateTime, relativeTime } from '@/lib/utils/format'
import type { MessageStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<MessageStatus, 'warning' | 'neutral' | 'success' | 'outline' | 'danger'> = {
  new: 'warning',
  read: 'neutral',
  replied: 'success',
  archived: 'outline',
  spam: 'danger',
}

/**
 * Contact inbox.
 *
 * The contact form writes here instead of sending email, which keeps the build
 * free of any paid transactional-email dependency. Replies go out from your
 * own mail client via the mailto link.
 */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; open?: string }>
}) {
  await requireAdmin('/admin/messages')
  const sp = await searchParams

  const result = await listAdminMessages({
    search: sp.q,
    status: sp.status,
    page: Number(sp.page) || 1,
  })

  const open = sp.open ? result.rows.find((m) => m.id === sp.open) ?? null : null

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Submissions from the contact form. Nothing is emailed — the form writes here, so there is no paid email service to pay for or configure."
        breadcrumbs={[{ label: 'Messages' }]}
      />

      <AdminBody size="wide" className="flex flex-col gap-5">
        <SearchFilter
          basePath="/admin/messages"
          placeholder="Search by name, email or subject"
          statuses={[
            { value: 'new', label: 'New' },
            { value: 'read', label: 'Read' },
            { value: 'replied', label: 'Replied' },
            { value: 'archived', label: 'Archived' },
            { value: 'spam', label: 'Spam' },
          ]}
        />

        {open ? (
          <AdminPanel
            title={open.subject || `Message from ${open.name}`}
            description={`Received ${formatDateTime(open.created_at)}`}
            actions={
              <Link
                href="/admin/messages"
                className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
              >
                Close
              </Link>
            }
          >
            <div className="flex flex-col gap-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                    From
                  </dt>
                  <dd className="mt-1 text-[0.875rem] text-earth">{open.name}</dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                    Email
                  </dt>
                  <dd className="mt-1 text-[0.875rem]">
                    <a
                      href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject || 'Your message to NEYORA'}`)}`}
                      className="text-botanical underline decoration-botanical/40 underline-offset-2 hover:decoration-botanical"
                    >
                      {open.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                    Phone
                  </dt>
                  <dd className="mt-1 text-[0.875rem] text-earth">{open.phone || '—'}</dd>
                </div>
              </dl>

              <div className="rounded-sm border border-beige bg-ivory-soft px-4 py-3.5">
                <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-earth">
                  {open.message}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject || 'Your message to NEYORA'}`)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  <Icon name="mail" size={15} />
                  Reply by email
                </a>
                {open.phone ? (
                  <a
                    href={`https://wa.me/${open.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xs border border-beige px-4 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
                  >
                    <Icon name="whatsapp" size={15} />
                    WhatsApp
                  </a>
                ) : null}
              </div>

              <SimpleForm action={updateMessageStatus} submitLabel="Update">
                {() => (
                  <>
                    <input type="hidden" name="id" value={open.id} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Status" htmlFor="status">
                        <Select id="status" name="status" defaultValue={open.status}>
                          <option value="new">New</option>
                          <option value="read">Read</option>
                          <option value="replied">Replied</option>
                          <option value="archived">Archived</option>
                          <option value="spam">Spam</option>
                        </Select>
                      </Field>
                      <Field
                        label="Internal note"
                        htmlFor="admin_note"
                        hint="Only visible here. Never sent to the sender."
                      >
                        <Textarea
                          id="admin_note"
                          name="admin_note"
                          rows={2}
                          defaultValue={open.admin_note ?? ''}
                        />
                      </Field>
                    </div>
                  </>
                )}
              </SimpleForm>

              <div className="border-t border-beige pt-5">
                <ConfirmButton
                  action={deleteMessage}
                  hiddenFields={{ id: open.id }}
                  triggerLabel="Delete message"
                  title="Delete this message?"
                  description="It disappears from the inbox. This is a soft delete — the record is retained in the database."
                />
              </div>

              <p className="text-[0.75rem] leading-relaxed text-earth-muted">
                We store a salted, one-way hash of the sender&rsquo;s IP address purely to limit
                spam. The address itself is never recorded and cannot be recovered from the hash.
              </p>
            </div>
          </AdminPanel>
        ) : null}

        {result.rows.length === 0 ? (
          <EmptyState
            icon="mail"
            title={sp.q || sp.status ? 'No messages match' : 'No messages yet'}
            description="Submissions from the contact page will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-beige">
            <ul className="flex flex-col">
              {result.rows.map((message) => (
                <li
                  key={message.id}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-beige/80 bg-ivory px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[message.status]}>{message.status}</Badge>
                      <span className="text-[0.75rem] text-earth-muted">
                        {relativeTime(message.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.9375rem] font-medium text-earth">
                      {message.subject || `Message from ${message.name}`}
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-earth-muted">
                      {message.name} · {message.email}
                    </p>
                    <p className="mt-1.5 line-clamp-2 max-w-[80ch] text-[0.8125rem] leading-relaxed text-earth-soft">
                      {message.message}
                    </p>
                  </div>

                  <Link
                    href={`/admin/messages?open=${message.id}${sp.status ? `&status=${sp.status}` : ''}`}
                    className="inline-flex h-9 shrink-0 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/admin/messages"
          params={{ q: sp.q, status: sp.status }}
        />
      </AdminBody>
    </>
  )
}

import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminRedirects } from '@/lib/content/admin'
import { deleteRedirect, saveRedirect } from '@/lib/actions/site'
import { formatDateTime } from '@/lib/utils/format'
import { absoluteUrl } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * QR redirect management — the feature the packaging depends on.
 *
 * The printed code points at /go and never changes. This screen changes where
 * /go leads, which is the whole reason a label never needs reprinting.
 */
export default async function AdminRedirectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>
}) {
  await requireAdmin('/admin/redirects')
  const sp = await searchParams

  const redirects = await listAdminRedirects()
  const editing = sp.edit ? redirects.find((r) => r.id === sp.edit) ?? null : null
  const showForm = Boolean(editing || sp.new)
  const main = redirects.find((r) => r.source === 'go')

  return (
    <>
      <AdminPageHeader
        title="QR redirects"
        description="The QR code on your packaging points at a link you control. Change the destination here — the printed code never changes."
        breadcrumbs={[{ label: 'QR redirects' }]}
        actions={
          !showForm ? (
            <Link
              href="/admin/redirects?new=1"
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
            >
              <Icon name="plus" size={15} />
              New redirect
            </Link>
          ) : null
        }
      />

      <AdminBody className="flex flex-col gap-6">
        <Alert tone="info" title="What to print on your packaging">
          Print a QR code that resolves to{' '}
          <code className="font-mono font-semibold">{absoluteUrl('/go')}</code>. Never print a link
          to a specific recipe — you would be committing to it for the life of every label already
          in circulation.
        </Alert>

        {main ? (
          <AdminPanel title="The pack QR right now">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                  Scanning /go leads to
                </dt>
                <dd className="mt-1.5 font-mono text-[0.9375rem] text-forest">
                  {main.destination}
                </dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                  Total scans
                </dt>
                <dd className="mt-1.5 font-display text-xl text-forest tabular-nums">
                  {main.scan_count.toLocaleString('en-GB')}
                </dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                  Last scan
                </dt>
                <dd className="mt-1.5 text-[0.875rem] text-earth-soft">
                  {main.last_scan_at ? formatDateTime(main.last_scan_at) : 'Not yet scanned'}
                </dd>
              </div>
            </dl>
          </AdminPanel>
        ) : (
          <Alert tone="warning" title="No /go redirect exists">
            Create one with the source <code className="font-mono">go</code> so scans have somewhere
            to land. Until then, /go falls back to <code className="font-mono">/recipes</code>.
          </Alert>
        )}

        {showForm ? (
          <AdminPanel
            title={editing ? `Edit /${editing.source}` : 'New redirect'}
            description="Destinations must be a path on this site. External URLs are rejected, so a QR code can never be turned into an open redirector."
          >
            <SimpleForm
              action={saveRedirect}
              cancelHref="/admin/redirects"
              submitLabel={editing ? 'Save redirect' : 'Create redirect'}
            >
              {(state) => (
                <>
                  {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Source key"
                      htmlFor="source"
                      required
                      error={state.errors?.source}
                      hint="“go” is the main pack QR. Add others like “go/200g” or “go/spring” for a specific pack or campaign."
                    >
                      <div className="flex items-stretch">
                        <span className="inline-flex shrink-0 items-center rounded-l-xs border border-r-0 border-beige bg-ivory-soft px-3 font-mono text-[0.8125rem] text-earth-muted">
                          /
                        </span>
                        <Input
                          id="source"
                          name="source"
                          required
                          spellCheck={false}
                          defaultValue={editing?.source ?? 'go'}
                          readOnly={editing?.source === 'go'}
                          invalid={Boolean(state.errors?.source)}
                          className="rounded-l-none font-mono"
                        />
                      </div>
                    </Field>

                    <Field
                      label="Destination"
                      htmlFor="destination"
                      required
                      error={state.errors?.destination}
                      hint="A path on this site, e.g. /recipes or /recipes/garlic-butter-oyster-mushrooms"
                    >
                      <Input
                        id="destination"
                        name="destination"
                        required
                        spellCheck={false}
                        defaultValue={editing?.destination ?? '/recipes'}
                        invalid={Boolean(state.errors?.destination)}
                        className="font-mono"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Redirect type"
                      htmlFor="http_status"
                      error={state.errors?.http_status}
                      hint="Keep this at 302 for anything printed. A 301 is cached permanently by browsers, so a scanner that has already visited would keep going to the old destination even after you change it."
                    >
                      <Select
                        id="http_status"
                        name="http_status"
                        defaultValue={String(editing?.http_status ?? 302)}
                      >
                        <option value="302">302 — temporary (recommended)</option>
                        <option value="307">307 — temporary, preserves method</option>
                        <option value="301">301 — permanent (cached forever)</option>
                        <option value="308">308 — permanent, preserves method</option>
                      </Select>
                    </Field>

                    <Field label="Internal label" htmlFor="label" hint="For your own reference.">
                      <Input id="label" name="label" defaultValue={editing?.label ?? ''} />
                    </Field>
                  </div>

                  <Checkbox
                    name="enabled"
                    label="Enabled"
                    hint="A disabled redirect falls back to /recipes rather than erroring, so a scan is never a dead end."
                    defaultChecked={editing?.enabled ?? true}
                  />

                  <div className="rounded-sm border border-beige bg-ivory-soft p-4">
                    <p className="text-[0.8125rem] font-semibold text-earth">
                      Optional landing screen
                    </p>
                    <p className="mt-1 max-w-[70ch] text-[0.75rem] leading-relaxed text-earth-muted">
                      Fill in a title to show a mobile-first message before continuing, instead of
                      redirecting instantly. Useful for a seasonal note that would otherwise flash
                      past. Leave the title blank for an immediate redirect.
                    </p>

                    <div className="mt-4 flex flex-col gap-4">
                      <Field label="Landing title" htmlFor="landing_title">
                        <Input
                          id="landing_title"
                          name="landing_title"
                          defaultValue={editing?.landing_title ?? ''}
                          placeholder="Thanks for scanning"
                        />
                      </Field>
                      <Field label="Landing message" htmlFor="landing_body">
                        <Textarea
                          id="landing_body"
                          name="landing_body"
                          rows={2}
                          defaultValue={editing?.landing_body ?? ''}
                        />
                      </Field>
                    </div>
                  </div>

                  <Field label="Notes" htmlFor="note" hint="Why this exists, which packs carry it.">
                    <Textarea id="note" name="note" rows={2} defaultValue={editing?.note ?? ''} />
                  </Field>
                </>
              )}
            </SimpleForm>
          </AdminPanel>
        ) : null}

        <AdminPanel title={`All redirects (${redirects.length})`}>
          <ul className="flex flex-col">
            {redirects.map((redirect) => (
              <li
                key={redirect.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-beige/70 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[0.875rem] text-forest">
                    /{redirect.source}
                    <Icon name="arrow-right" size={14} className="text-earth-muted" />
                    {redirect.destination}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.75rem] text-earth-muted">
                    {redirect.enabled ? (
                      <Badge tone="success">Enabled</Badge>
                    ) : (
                      <Badge tone="neutral">Disabled</Badge>
                    )}
                    <Badge tone="outline">{redirect.http_status}</Badge>
                    {redirect.landing_title ? <Badge tone="leaf">Landing screen</Badge> : null}
                    <span>{redirect.scan_count.toLocaleString('en-GB')} scans</span>
                    {redirect.label ? <span>· {redirect.label}</span> : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/${redirect.source}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Test /${redirect.source}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest"
                  >
                    <Icon name="external" size={14} />
                  </Link>
                  <Link
                    href={`/admin/redirects?edit=${redirect.id}`}
                    className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                  >
                    Edit
                  </Link>
                  {redirect.source !== 'go' ? (
                    <ConfirmButton
                      action={deleteRedirect}
                      hiddenFields={{ id: redirect.id }}
                      triggerLabel="Delete"
                      title={`Delete /${redirect.source}?`}
                      description="Any printed code using this key will fall back to whatever /go currently points at. If labels are already in circulation, disable it instead."
                    />
                  ) : (
                    <span
                      title="The main pack QR cannot be deleted — every printed label depends on it."
                      className="text-[0.6875rem] tracking-[0.04em] text-earth-muted uppercase"
                    >
                      Protected
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </AdminBody>
    </>
  )
}

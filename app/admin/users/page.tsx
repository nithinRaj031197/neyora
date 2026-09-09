import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Field, Input, Select } from '@/components/ui/Form'
import { requireRole } from '@/lib/auth/session'
import { listAdminUsers } from '@/lib/content/admin'
import { inviteAdmin, revokeAdmin } from '@/lib/actions/site'
import { formatDate } from '@/lib/utils/format'
import { hasServiceRole } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ROLE_TONE = { owner: 'forest', admin: 'leaf', editor: 'outline' } as const

/**
 * Admin users.
 *
 * Accounts themselves live in Supabase Auth — this screen only grants and
 * revokes CMS access. Reimplementing password policy, email confirmation and
 * rate limiting here would be strictly worse than using what Supabase already
 * provides.
 */
export default async function AdminUsersPage() {
  const session = await requireRole('admin', '/admin/users')
  const users = await listAdminUsers()

  return (
    <>
      <AdminPageHeader
        title="Users & admins"
        description="Who can sign in to the CMS, and what they are allowed to do."
        breadcrumbs={[{ label: 'Users' }]}
      />

      <AdminBody className="flex flex-col gap-6">
        <Alert tone="info" title="Two steps, on purpose">
          Create the account in <strong>Supabase → Authentication → Users</strong> first, then grant
          it CMS access below. Passwords, email confirmation and rate limiting are Supabase&rsquo;s
          job; we do not duplicate them here.
        </Alert>

        {!hasServiceRole() ? (
          <Alert tone="warning" title="SUPABASE_SERVICE_ROLE_KEY is not set">
            Granting access needs it, because looking up an auth account by email is a privileged
            operation. Add it to your environment, or insert the row directly:
            <pre className="mt-3 overflow-x-auto rounded-xs bg-earth px-3 py-2 font-mono text-[0.75rem] text-ivory">
{`insert into public.admins (user_id, email, role)
select id, email, 'editor' from auth.users where email = 'them@example.com';`}
            </pre>
          </Alert>
        ) : null}

        <AdminPanel
          title="Grant CMS access"
          description="The account must already exist in Supabase Auth."
        >
          <SimpleForm action={inviteAdmin} submitLabel="Grant access">
            {(state) => (
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Email" htmlFor="email" required error={state.errors?.email}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    invalid={Boolean(state.errors?.email)}
                    placeholder="them@example.com"
                  />
                </Field>
                <Field label="Name" htmlFor="full_name">
                  <Input id="full_name" name="full_name" />
                </Field>
                <Field
                  label="Role"
                  htmlFor="role"
                  error={state.errors?.role}
                  hint="Editor: content only. Admin: also settings and users. Owner: everything."
                >
                  <Select id="role" name="role" defaultValue="editor">
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    {session.admin.role === 'owner' ? <option value="owner">Owner</option> : null}
                  </Select>
                </Field>
              </div>
            )}
          </SimpleForm>
        </AdminPanel>

        <AdminPanel title={`People with access (${users.length})`}>
          <ul className="flex flex-col">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-beige/70 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-medium text-earth">
                    {user.full_name || user.email}
                    <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
                    {user.id === session.admin.id ? <Badge tone="outline">You</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-earth-muted">
                    {user.email} · added {formatDate(user.created_at)}
                  </p>
                </div>

                {user.id === session.admin.id ? (
                  <span className="text-[0.6875rem] tracking-[0.04em] text-earth-muted uppercase">
                    Cannot revoke your own access
                  </span>
                ) : (
                  <ConfirmButton
                    action={revokeAdmin}
                    hiddenFields={{ id: user.id }}
                    triggerLabel="Revoke access"
                    title={`Revoke access for ${user.full_name || user.email}?`}
                    description="They will no longer be able to sign in to the CMS. Their Supabase Auth account is untouched, so access can be granted again later."
                    confirmLabel="Revoke access"
                  />
                )}
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-beige pt-4 text-[0.75rem] leading-relaxed text-earth-muted">
            The database refuses to remove or demote the last remaining owner, so it is not possible
            to lock yourself out of your own CMS.
          </p>
        </AdminPanel>
      </AdminBody>
    </>
  )
}

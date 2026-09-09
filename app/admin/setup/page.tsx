import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'
import { Alert } from '@/components/ui/Alert'
import { SetupForm } from '@/components/admin/SetupForm'
import { getAdminSession, getCurrentUser } from '@/lib/auth/session'
import { createReadOnlyClient } from '@/lib/supabase/server'

/**
 * First-run setup: promotes the signed-in account to owner.
 *
 * Not a backdoor. It requires an existing Supabase Auth session, a matching
 * `ADMIN_SETUP_TOKEN` from the server environment, and zero existing admins.
 * Once an owner exists the screen closes itself permanently.
 */
export const metadata: Metadata = {
  title: 'First-time setup — NEYORA CMS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  const user = await getCurrentUser()

  const supabase = createReadOnlyClient()
  const { data: bootstrapRequired } = await supabase.rpc('admin_bootstrap_required')
  const tokenConfigured = Boolean(process.env.ADMIN_SETUP_TOKEN)

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg">
        <Link href="/" className="inline-block">
          <Wordmark className="text-2xl" showTagline />
        </Link>

        <h1 className="mt-12 font-display text-[1.75rem] text-forest">First-time setup</h1>

        {bootstrapRequired === false ? (
          <div className="mt-6 flex flex-col gap-6">
            <Alert tone="info" title="Setup is already complete">
              This site has an administrator, so setup is permanently closed. Ask an existing owner
              to invite you from Admin → Users.
            </Alert>
            <Link
              href="/admin/sign-in"
              className="inline-flex h-11 w-fit items-center rounded-xs border border-forest/35 px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
            >
              Go to sign in
            </Link>
          </div>
        ) : !user ? (
          <div className="mt-6 flex flex-col gap-6">
            <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
              Setup promotes an existing account, so sign in first. Create the account in your
              Supabase dashboard under <strong>Authentication → Users</strong>, then come back here.
            </p>
            <Link
              href="/admin/sign-in?next=%2Fadmin%2Fsetup"
              className="inline-flex h-11 w-fit items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
            >
              Sign in first
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-7">
            <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
              You are signed in as <strong className="text-earth">{user.email}</strong>. Enter the
              setup token from your server environment to make this account the owner of the site.
            </p>

            {!tokenConfigured ? (
              <Alert tone="warning" title="ADMIN_SETUP_TOKEN is not set">
                Add <code className="font-mono">ADMIN_SETUP_TOKEN</code> to your environment (
                <code className="font-mono">openssl rand -hex 32</code> generates a good one),
                restart or redeploy, then reload this page.
              </Alert>
            ) : null}

            <SetupForm disabled={!tokenConfigured} />

            <div className="border-t border-beige pt-6">
              <h2 className="font-sans text-[0.8125rem] font-semibold text-earth">
                Prefer to do it in SQL?
              </h2>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-earth-muted">
                Run this in the Supabase SQL editor instead — it does exactly the same thing:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xs bg-earth px-3.5 py-3 font-mono text-[0.75rem] leading-relaxed text-ivory">
{`insert into public.admins (user_id, email, full_name, role)
select id, email, 'Your Name', 'owner'
from auth.users
where email = '${user.email ?? 'you@example.com'}';`}
              </pre>
            </div>
          </div>
        )}

        <p className="mt-12 border-t border-beige pt-6 text-[0.8125rem] leading-relaxed text-earth-muted">
          Once setup is done, remove <code className="font-mono">ADMIN_SETUP_TOKEN</code> from your
          host. It has no further use, and an unused secret is still a secret worth deleting.
        </p>
      </div>
    </main>
  )
}

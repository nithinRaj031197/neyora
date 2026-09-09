import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignInForm } from '@/components/admin/SignInForm'
import { Wordmark } from '@/components/ui/Wordmark'
import { getAdminSession, getCurrentUser } from '@/lib/auth/session'
import { createReadOnlyClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Sign in — NEYORA CMS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  const session = await getAdminSession()
  if (session) redirect(next?.startsWith('/admin') ? next : '/admin')

  // Signed in but not an admin: the useful next step is setup (if the site is
  // unclaimed) or asking an owner for access — not the sign-in form again.
  const user = await getCurrentUser()
  let bootstrapRequired = false
  if (user) {
    const supabase = createReadOnlyClient()
    const { data } = await supabase.rpc('admin_bootstrap_required')
    bootstrapRequired = data === true
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block">
          <Wordmark className="text-2xl" showTagline />
        </Link>

        <h1 className="mt-12 font-display text-[1.75rem] text-forest">
          {user ? 'Almost there' : 'Sign in to the CMS'}
        </h1>

        {user ? (
          <div className="mt-4 flex flex-col gap-5">
            <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
              You are signed in as <strong className="text-earth">{user.email}</strong>, but this
              account does not have CMS access yet.
            </p>

            {bootstrapRequired ? (
              <>
                <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
                  No administrator has been created for this site yet. If you have the setup token,
                  you can claim it now.
                </p>
                <Link
                  href="/admin/setup"
                  className="inline-flex h-11 w-fit items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  Run first-time setup
                </Link>
              </>
            ) : (
              <p className="text-[0.9375rem] leading-relaxed text-earth-soft">
                Ask an existing owner to invite you from <strong>Admin → Users</strong>.
              </p>
            )}

            <form action="/admin/auth/sign-out" method="post">
              <button
                type="submit"
                className="text-[0.875rem] text-botanical underline decoration-botanical/40 underline-offset-4 hover:decoration-botanical"
              >
                Sign out and use a different account
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[0.9375rem] text-earth-soft">
              Use the email and password of your Supabase Auth account.
            </p>
            <div className="mt-9">
              <SignInForm next={next} />
            </div>
          </>
        )}

        <p className="mt-12 border-t border-beige pt-6 text-[0.8125rem] leading-relaxed text-earth-muted">
          Accounts are created in your Supabase project (Authentication → Users), then granted CMS
          access here. See <code className="font-mono">README.md</code> for the full procedure.
        </p>
      </div>
    </main>
  )
}

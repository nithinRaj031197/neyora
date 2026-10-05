import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/auth/session'
import { countAdmins } from '@/lib/auth/admins'
import { isDatabaseConfigured } from '@/lib/db/mongo'
import { LoginForm } from '@/components/admin/LoginForm'

export const dynamic = 'force-dynamic'

/**
 * Admin sign-in.
 *
 * The photograph runs full-bleed and the panel sits on the left, because the
 * artwork is composed that way: the cluster is on the right and the left half
 * is soft bokeh. The form lands in the space the picture already left for it.
 *
 * The panel itself is near-opaque rather than frosted. The left side of the
 * image measures 106/255 mean luminance — bright enough that translucent
 * fields over it would be hard to read, and a login form is the last place to
 * trade legibility for an effect.
 */
export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect('/admin')

  /*
   * A first run with no accounts is a setup problem, not a wrong password.
   * Saying so saves an hour of guessing.
   *
   * "Not configured" and "configured but unreachable" are different failures
   * with different fixes, and collapsing them into one message sent someone to
   * check a .env.local file that was perfectly correct. They are now separate.
   */
  type DbState = 'ok' | 'not-configured' | 'unreachable'
  let dbState: DbState = 'ok'
  let noAccounts = false

  if (!isDatabaseConfigured()) {
    dbState = 'not-configured'
  } else {
    try {
      noAccounts = (await countAdmins()) === 0
    } catch (error) {
      dbState = 'unreachable'
      console.error('[admin] database unreachable at sign-in', error)
    }
  }

  return (
    <div className="relative isolate min-h-screen">
      {/* Full-bleed artwork. Fixed on desktop so the panel floats over it. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-clip">
        <img
          src="/images/admin/login.webp"
          alt=""
          width={2000}
          height={1302}
          className="h-full w-full object-cover object-right"
          fetchPriority="high"
        />
        {/*
          Two scrims. The vertical one keeps the whole frame from washing out;
          the horizontal one darkens the left, where the panel sits, and clears
          by 70% so the cluster on the right stays untouched.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/25 to-ink/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent to-70%" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[84rem] items-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-sm border border-beige/40 bg-ivory/97 p-8 shadow-none sm:p-10">
          <span
            className="brand-logo brand-logo--lockup text-[1.125rem]"
            role="img"
            aria-label="NEYORA — GROWN FOR LIFE."
          />

          <h1 className="mt-8 font-display text-[1.75rem] leading-tight text-forest">
            Admin sign in
          </h1>
          <p className="mt-2 text-[0.9375rem] text-earth-muted">
            Orders, settings and the content behind neyora.
          </p>

          {dbState === 'not-configured' ? (
            <p className="mt-6 rounded-xs bg-danger/10 px-3.5 py-3 text-[0.875rem] leading-relaxed text-danger">
              <code className="font-mono">MONGODB_URI</code> is not set. Add it to{' '}
              <code className="font-mono">.env.local</code> — see{' '}
              <code className="font-mono">docs/ORDERS.md</code>.
            </p>
          ) : dbState === 'unreachable' ? (
            <p className="mt-6 rounded-xs bg-danger/10 px-3.5 py-3 text-[0.875rem] leading-relaxed text-danger">
              <strong>Cannot reach the database.</strong> The connection string is
              set, so this is not a configuration problem — the server is refusing
              the connection. The usual cause is this machine&rsquo;s IP address
              missing from Atlas &rarr; Network Access, which happens whenever your
              IP changes. A paused cluster does the same.
            </p>
          ) : noAccounts ? (
            <p className="mt-6 rounded-xs bg-warning/10 px-3.5 py-3 text-[0.875rem] text-earth">
              No admin account exists yet. Create one with{' '}
              <code className="font-mono">npm run admin:create</code>.
            </p>
          ) : null}

          <LoginForm />

          <p className="mt-8 border-t border-beige pt-6 text-[0.8125rem] text-earth-muted">
            This area is private and is not indexed. If you have arrived here by
            accident,{' '}
            <Link href="/" className="underline underline-offset-4 hover:text-forest">
              return to the site
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

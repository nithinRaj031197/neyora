import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/auth/session'
import { signOut } from '@/lib/auth/actions'
import '../globals.css'

/**
 * The admin shell.
 *
 * `force-dynamic`: every page under /admin depends on who is asking, so none
 * of it may be prerendered or cached at the edge. Without this, a build could
 * bake one admin's view into static HTML.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'NEYORA admin',
  // Never let an order dashboard reach a search index.
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /*
   * A soft check, for chrome only — it decides whether to draw the header.
   * It is NOT the security boundary: a layout does not re-run on every nested
   * request, so each page and every Server Function does its own
   * requireAdmin(). See lib/auth/session.ts.
   */
  const admin = await getCurrentAdmin()

  return (
    <div className={admin ? 'min-h-screen bg-ivory-soft' : 'min-h-screen'}>
      {admin ? (
        <header className="border-b border-beige bg-ivory">
          <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between gap-6 px-5 sm:px-8">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="brand-logo brand-logo--wordmark text-[1rem]" aria-label="NEYORA admin" />
              <nav className="flex items-center gap-5 text-[0.875rem]">
                <Link href="/admin" className="text-earth-soft hover:text-forest">Orders</Link>
                <Link href="/admin/settings" className="text-earth-soft hover:text-forest">Settings</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-[0.8125rem] text-earth-muted sm:inline">
                {admin.name} · {admin.role}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press h-9 rounded-xs border border-forest/30 px-3.5 text-[0.8125rem] text-forest hover:bg-forest/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      ) : null}
      {/*
        Signed in, the shell constrains and pads its pages. Signed out there is
        only the login screen, which is full-bleed artwork and needs to reach
        the edges — so it is rendered unwrapped rather than being given a way
        to break out of a container that should not have been there.
      */}
      {admin ? (
        <main className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-8">{children}</main>
      ) : (
        <main>{children}</main>
      )}
    </div>
  )
}

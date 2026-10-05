import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/auth/session'
import { signOut } from '@/lib/auth/actions'
import { AdminNav } from '@/components/admin/AdminNav'
import { ToastProvider } from '@/components/ui/Toast'
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

  if (!admin) {
    /*
     * Signed out there is only the login screen, which is full-bleed artwork
     * and needs to reach the edges — so it is rendered unwrapped rather than
     * being given a way to break out of a container that should not have been
     * there.
     */
    return (
      <div className="min-h-screen">
        <main>{children}</main>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ivory-soft">
        {/*
          Sticky, translucent, hairline-bottomed. The admin scrolls long lists
          of orders; a header that leaves the screen costs a scroll to the top
          every time they want to switch section.
        */}
        <header className="sticky top-0 z-40 border-b border-beige bg-ivory/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-7">
              <Link
                href="/admin"
                className="brand-logo brand-logo--wordmark text-[1rem]"
                aria-label="NEYORA admin"
              />
              <div className="hidden sm:block">
                <AdminNav variant="rail" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-forest text-[0.8125rem] font-medium text-ivory"
              >
                {admin.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-[0.8125rem] text-earth-muted md:inline">
                {admin.name} · {admin.role}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press h-9 rounded-xs border border-forest/25 px-3.5 text-[0.8125rem] text-forest transition-colors duration-200 ease-(--ease-out-soft) hover:border-forest hover:bg-forest/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* pb-24 on a phone clears the fixed bottom nav. */}
        <main className="mx-auto w-full max-w-[72rem] px-5 pt-8 pb-24 sm:px-8 sm:pt-10 sm:pb-16">
          {children}
        </main>

        <div className="sm:hidden">
          <AdminNav variant="bar" />
        </div>
      </div>
    </ToastProvider>
  )
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ToastProvider } from '@/components/admin/Toast'
import { SessionKeeper } from '@/components/admin/SessionKeeper'
import { getAdminSession } from '@/lib/auth/session'
import { getSiteSettings } from '@/lib/content/site'
import { isSupabaseConfigured } from '@/lib/env'
import { SetupNotice } from '@/components/public/SetupNotice'

/**
 * Admin shell.
 *
 * `/admin/sign-in`, `/admin/setup` and `/admin/auth/*` need to render without
 * an admin session, so this layout renders the bare page when there is none
 * and each protected page calls `requireAdmin()` for itself. Authorisation is
 * therefore enforced per page on the server, never by this layout alone —
 * a layout can be skipped during client navigation, a page cannot.
 */
export const metadata: Metadata = {
  title: 'NEYORA CMS',
  // Never index, never store an admin page in a shared cache.
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupNotice />

  const session = await getAdminSession()

  if (!session) {
    return (
      <ToastProvider>
        <div className="min-h-dvh bg-ivory-soft">{children}</div>
      </ToastProvider>
    )
  }

  const settings = await getSiteSettings()

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col bg-ivory-soft lg:flex-row">
        <AdminSidebar
          role={session.admin.role}
          email={session.admin.email}
          fullName={session.admin.full_name}
          brandName={settings.brand_name}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SessionKeeper />
    </ToastProvider>
  )
}

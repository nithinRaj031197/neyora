/**
 * Request proxy (formerly `middleware.ts` — renamed in Next.js 16).
 *
 * Refreshes the Supabase auth cookie on every request and turns obvious
 * anonymous traffic away from /admin.
 *
 * This is a convenience layer, NOT the security boundary. Real authorisation
 * happens server-side in `requireAdmin()` / `authorizeAction()` and, beneath
 * that, in Row Level Security. A forged cookie gets past this file and still
 * cannot read or write a single row.
 *
 * Deployment note: Next.js 16 runs proxy files on the Node.js runtime only,
 * and OpenNext labels Node.js middleware on Cloudflare as experimental. If
 * that ever causes trouble, this file can be deleted outright — the app keeps
 * working, because authorisation does not depend on it and `SessionKeeper`
 * refreshes tokens from the browser. All that is lost is the pre-emptive
 * redirect and a server-side token rotation.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ADMIN_PATHS = ['/admin/sign-in', '/admin/setup', '/admin/auth']

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Newer projects issue NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; older ones use
  // NEXT_PUBLIC_SUPABASE_ANON_KEY. Both are accepted, newer wins. Written as
  // literal expressions so Next.js can inline them (see lib/env.ts).
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Not configured yet (fresh clone): let the app render its setup guidance.
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Touching getUser() is what triggers the refresh-token rotation.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (isAdminArea && !isPublicAdminPath && !user) {
    const signIn = request.nextUrl.clone()
    signIn.pathname = '/admin/sign-in'
    signIn.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(signIn)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. `/go` is included on
     * purpose so a QR scan still refreshes a signed-in admin's session.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|images/|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
}

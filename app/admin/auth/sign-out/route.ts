import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Sign out.
 *
 * POST only. A GET sign-out can be triggered by any image tag or link
 * prefetch on another site, which would log admins out at random.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = request.nextUrl.clone()
  url.pathname = '/admin/sign-in'
  url.search = ''
  return NextResponse.redirect(url, { status: 303 })
}

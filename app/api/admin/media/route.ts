import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth/session'

/**
 * Media list for the picker dialog.
 *
 * A route handler rather than props, because the picker is opened from deep
 * inside client-side forms (the Markdown toolbar, image fields) and needs to
 * fetch on demand rather than have every form page preload the whole library.
 *
 * Authorisation is checked here on the server, and the query runs with the
 * *user's* client rather than the service role, so RLS is a second gate.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const search = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const folder = request.nextUrl.searchParams.get('folder')?.trim() ?? ''
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 60))

  const supabase = await createClient()
  let query = supabase
    .from('media')
    .select('id, public_url, alt, title, width, height, mime_type, variants, folder, created_at')
    .is('deleted_at', null)

  if (folder) query = query.eq('folder', folder)
  if (search) {
    // Strip PostgREST filter metacharacters before interpolating.
    const term = search.replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${term}%,alt.ilike.%${term}%,path.ilike.%${term}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { media: data ?? [] },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

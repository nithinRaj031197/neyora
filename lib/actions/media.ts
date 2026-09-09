'use server'

/**
 * Media library actions.
 *
 * The image bytes never pass through here. The browser uploads them straight
 * to Supabase Storage using the anon key (Storage RLS allows admins to write
 * to the media bucket), and then calls `registerMedia` with just the metadata.
 * That keeps Server Action payloads tiny — which matters on Cloudflare
 * Workers, where request body limits and CPU time are both finite.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { authorizeAction } from '@/lib/auth/session'
import { mediaMetaSchema, mediaRegisterSchema } from '@/lib/validation/schemas'
import { fieldErrors } from '@/lib/validation/common'
import { fail, ok, type ActionState } from './state'
import { publicEnv } from '@/lib/env'
import type { MediaRow } from '@/types/database'

export async function registerMedia(input: unknown): Promise<ActionState<MediaRow>> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const parsed = mediaRegisterSchema.safeParse(input)
  if (!parsed.success) {
    return fail('That upload could not be recorded.', fieldErrors(parsed.error))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('media')
    .insert({
      bucket: publicEnv().mediaBucket,
      path: parsed.data.path,
      public_url: parsed.data.public_url,
      mime_type: parsed.data.mime_type,
      width: parsed.data.width,
      height: parsed.data.height,
      size_bytes: parsed.data.size_bytes,
      alt: parsed.data.alt || null,
      title: parsed.data.title,
      folder: parsed.data.folder || 'general',
      variants: parsed.data.variants,
      uploaded_by: auth.session.admin.id,
    })
    .select('*')
    .single()

  if (error) return fail(`Could not save the image record: ${error.message}`)

  revalidatePath('/admin/media')
  return ok('Image uploaded.', data)
}

export async function updateMediaMeta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) return fail(auth.error)

  const parsed = mediaMetaSchema.safeParse({
    id: String(formData.get('id') ?? ''),
    alt: String(formData.get('alt') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    folder: String(formData.get('folder') ?? 'general'),
  })

  if (!parsed.success) {
    return fail('Please check the highlighted fields.', fieldErrors(parsed.error))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('media')
    .update({
      alt: parsed.data.alt || null,
      title: parsed.data.title,
      description: parsed.data.description,
      folder: parsed.data.folder || 'general',
    })
    .eq('id', parsed.data.id)

  if (error) return fail(`Could not update the image: ${error.message}`)

  // Alt text appears on public pages, so those caches must drop.
  revalidatePath('/admin/media')
  revalidatePath('/', 'layout')
  return ok('Image details saved.')
}

/**
 * Deletes an image: soft-deletes the row, then removes the files.
 *
 * Order matters. The row goes first so the image disappears from the CMS
 * immediately even if Storage is slow or the service-role key is absent; the
 * files are cleaned up second, and a failure there leaves orphaned bytes
 * rather than a broken library. Nothing that references the image breaks,
 * because the FKs are `on delete set null`.
 */
export async function deleteMedia(formData: FormData): Promise<void> {
  const auth = await authorizeAction('editor')
  if (!auth.ok) throw new Error(auth.error)

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('No image id supplied.')

  const supabase = await createClient()

  const { data: media, error: readError } = await supabase
    .from('media')
    .select('bucket, path, variants')
    .eq('id', id)
    .maybeSingle()

  if (readError) throw new Error(`Could not read the image: ${readError.message}`)
  if (!media) throw new Error('That image no longer exists.')

  const { error } = await supabase
    .from('media')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Could not delete the image: ${error.message}`)

  // 'local' means a file committed to /public (the seeded placeholders) —
  // there is nothing in Storage to remove.
  if (media.bucket !== 'local' && hasServiceRole()) {
    const paths = [media.path, ...media.variants.map((v) => v.path)]
    const admin = createAdminClient()
    const { error: storageError } = await admin.storage.from(media.bucket).remove(paths)
    if (storageError) {
      console.error('[media] storage cleanup failed:', storageError.message)
    }
  }

  revalidatePath('/admin/media')
  revalidatePath('/', 'layout')
}

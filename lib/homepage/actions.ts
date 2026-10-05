'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import { HOMEPAGE_SECTION_KEYS, homepageOverrideSchema } from './schema'
import { writeHomepageOverride } from './repository'

export type HomepageState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'saved'; at: string }

/**
 * Save which homepage chapters are shown.
 *
 * Auth is checked HERE, not merely on the page that renders the form — a
 * Server Function is reachable by direct POST, so hiding the form protects
 * nobody.
 *
 * Every switch is written on every save, not only the ones that are on. An
 * unchecked checkbox is simply absent from the FormData, so "off" has to be
 * inferred from absence; writing the whole set keeps the document a complete
 * picture rather than a pile of the things that happen to be enabled.
 */
export async function saveHomepageSections(
  _previous: HomepageState,
  formData: FormData,
): Promise<HomepageState> {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' }
  }

  const parsed = homepageOverrideSchema.safeParse(
    Object.fromEntries(HOMEPAGE_SECTION_KEYS.map((key) => [key, formData.get(key) === 'on'])),
  )
  if (!parsed.success) {
    return { status: 'error', message: 'Could not read the form. Please try again.' }
  }

  try {
    await writeHomepageOverride(parsed.data, admin.email)
  } catch (error) {
    console.error('[homepage] save failed', error)
    return { status: 'error', message: 'Could not save. Please try again.' }
  }

  // Only the homepage renders these chapters, but it is prerendered — without
  // this the previously built HTML keeps serving and the change looks like it
  // silently failed.
  revalidatePath('/')

  return { status: 'saved', at: new Date().toISOString() }
}

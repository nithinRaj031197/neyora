'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import { SETTINGS_FIELDS, settingsOverrideSchema } from './schema'
import { writeSettingsOverride } from './repository'

export type SettingsState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'saved'; at: string }

/**
 * Save the contact details.
 *
 * Auth is checked HERE, not merely on the page that renders the form — a
 * Server Function is reachable by direct POST, so hiding the form protects
 * nobody.
 *
 * Afterwards every public page that shows contact details is revalidated.
 * Without that the site keeps serving the previously built HTML and the change
 * appears to have silently failed.
 */
export async function saveSettings(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  let admin
  try {
    admin = await requireAdmin()
  } catch (error) {
    console.error('[settings] auth check failed inside the action', error)
    return { status: 'error', message: 'Your session has expired. Please sign in again.' }
  }

  /*
   * Only the fields we own. `Object.fromEntries(formData)` also returns the
   * hidden inputs React puts in every Server Action form — $ACTION_ID_…,
   * $ACTION_REF_…, $ACTION_KEY — and the schema is strict, so passing the raw
   * FormData made every save fail as "unknown key" with no field to attach the
   * error to. Strictness is right; feeding it someone else's plumbing was not.
   */
  const submitted = Object.fromEntries(
    SETTINGS_FIELDS.map((field) => [field.name, String(formData.get(field.name) ?? '')]),
  )
  const parsed = settingsOverrideSchema.safeParse(submitted)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[issue.path.length - 1]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors }
  }

  try {
    await writeSettingsOverride(parsed.data, admin.email)
  } catch (error) {
    console.error('[settings] save failed', error)
    return { status: 'error', message: 'Could not save. Please try again.' }
  }

  // `layout` covers the header and footer, which carry contact details on
  // every page; the named routes render them in the body as well.
  revalidatePath('/', 'layout')
  revalidatePath('/contact')
  revalidatePath('/products/[slug]', 'page')

  return { status: 'saved', at: new Date().toISOString() }
}

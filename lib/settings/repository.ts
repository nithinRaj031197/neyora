import 'server-only'
import { db, isDatabaseConfigured } from '@/lib/db/mongo'
import { settingsOverrideSchema, type SettingsOverride } from './schema'

/**
 * The settings override document.
 *
 * Exactly one row, `_id: 'site'`. There is no history and no versioning
 * because there is nothing here worth a history — these are eleven contact
 * fields, and the file underneath is the real record.
 */

const DOC_ID = 'site'

interface SettingsDoc extends SettingsOverride {
  _id: string
  updatedAt: Date
  updatedBy: string
}

/**
 * Read the override, or an empty object.
 *
 * NEVER THROWS. This is called while rendering the footer of every public
 * page, so a database that is down, unreachable or simply not configured must
 * degrade to "no overrides" and let the site serve from `site.yml`. Taking the
 * whole site offline because a contact-details cache is unavailable would be a
 * far worse failure than showing a slightly stale phone number.
 */
export async function readSettingsOverride(): Promise<SettingsOverride> {
  if (!isDatabaseConfigured()) return {}
  try {
    const database = await db()
    const doc = await database.collection<SettingsDoc>('settings').findOne({ _id: DOC_ID })
    if (!doc) return {}

    const { _id, updatedAt, updatedBy, ...fields } = doc
    void _id
    void updatedAt
    void updatedBy

    // Re-validate on read. The document could have been edited directly in
    // Atlas, and a malformed WhatsApp number would render a broken link on
    // every page rather than failing loudly here.
    const parsed = settingsOverrideSchema.safeParse(fields)
    return parsed.success ? parsed.data : {}
  } catch (error) {
    console.error('[settings] could not read overrides, falling back to site.yml', error)
    return {}
  }
}

export async function writeSettingsOverride(
  input: SettingsOverride,
  updatedBy: string,
): Promise<void> {
  const database = await db()
  await database
    .collection<SettingsDoc>('settings')
    .updateOne(
      { _id: DOC_ID },
      { $set: { ...input, updatedAt: new Date(), updatedBy } },
      { upsert: true },
    )
}

export async function settingsLastUpdated(): Promise<{ at: Date; by: string } | null> {
  if (!isDatabaseConfigured()) return null
  try {
    const database = await db()
    const doc = await database.collection<SettingsDoc>('settings').findOne({ _id: DOC_ID })
    return doc?.updatedAt ? { at: doc.updatedAt, by: doc.updatedBy ?? 'unknown' } : null
  } catch {
    return null
  }
}

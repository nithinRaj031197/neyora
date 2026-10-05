import 'server-only'
import { db, isDatabaseConfigured } from '@/lib/db/mongo'
import { homepageOverrideSchema, type HomepageOverride } from './schema'

/**
 * The homepage visibility document.
 *
 * One row, `_id: 'homepage'`, in the same `settings` collection — it is the
 * same kind of thing: a small set of switches an admin owns, with the content
 * file underneath as the record.
 */

const DOC_ID = 'homepage'

interface HomepageDoc extends HomepageOverride {
  _id: string
  updatedAt: Date
  updatedBy: string
}

/**
 * Read the override, or an empty object.
 *
 * NEVER THROWS. This runs while rendering the homepage, so a database that is
 * down, unreachable or simply not configured must degrade to "no overrides"
 * and let the page render exactly what homepage.yml says. Blanking the
 * homepage because a switch table is unavailable would be a far worse failure
 * than showing a chapter someone meant to hide.
 */
export async function readHomepageOverride(): Promise<HomepageOverride> {
  if (!isDatabaseConfigured()) return {}
  try {
    const database = await db()
    const doc = await database.collection<HomepageDoc>('settings').findOne({ _id: DOC_ID })
    if (!doc) return {}

    const { _id, updatedAt, updatedBy, ...fields } = doc
    void _id
    void updatedAt
    void updatedBy

    // Re-validate on read: the document could have been edited directly in
    // Atlas, and an unknown key there should not reach the page.
    const parsed = homepageOverrideSchema.safeParse(fields)
    return parsed.success ? parsed.data : {}
  } catch (error) {
    console.error('[homepage] could not read section overrides, using homepage.yml', error)
    return {}
  }
}

export async function writeHomepageOverride(
  input: HomepageOverride,
  updatedBy: string,
): Promise<void> {
  const database = await db()
  await database
    .collection<HomepageDoc>('settings')
    .updateOne(
      { _id: DOC_ID },
      { $set: { ...input, updatedAt: new Date(), updatedBy } },
      { upsert: true },
    )
}

export async function homepageLastUpdated(): Promise<{ at: Date; by: string } | null> {
  if (!isDatabaseConfigured()) return null
  try {
    const database = await db()
    const doc = await database.collection<HomepageDoc>('settings').findOne({ _id: DOC_ID })
    return doc?.updatedAt ? { at: doc.updatedAt, by: doc.updatedBy ?? 'unknown' } : null
  } catch {
    return null
  }
}

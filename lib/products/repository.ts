import 'server-only'
import { db, isDatabaseConfigured } from '@/lib/db/mongo'
import { productOverrideSchema, type ProductOverride } from './schema'

/**
 * Product overrides, one document per slug.
 *
 * Reads NEVER throw. These run while rendering the shop, so a database that is
 * down must degrade to "no overrides" and let the Markdown files serve the
 * page. Taking the shop offline because an edit cache is unavailable would be
 * a far worse failure than showing yesterday's price.
 */

interface ProductDoc extends ProductOverride {
  _id: string
  updatedAt: Date
  updatedBy: string
}

async function collection() {
  const database = await db()
  return database.collection<ProductDoc>('products')
}

function clean(doc: ProductDoc | null): ProductOverride {
  if (!doc) return {}
  const { _id, updatedAt, updatedBy, ...fields } = doc
  void _id
  void updatedAt
  void updatedBy
  // Re-validate on read: the document could have been edited in Atlas, and a
  // malformed price would otherwise reach the shop.
  const parsed = productOverrideSchema.safeParse(fields)
  return parsed.success ? parsed.data : {}
}

/** Every override, keyed by slug. One read serves a whole page of products. */
export async function readProductOverrides(): Promise<Record<string, ProductOverride>> {
  if (!isDatabaseConfigured()) return {}
  try {
    const col = await collection()
    const docs = await col.find({}).toArray()
    return Object.fromEntries(docs.map((doc) => [doc._id, clean(doc)]))
  } catch (error) {
    console.error('[products] could not read overrides, falling back to files', error)
    return {}
  }
}

export async function writeProductOverride(
  slug: string,
  input: ProductOverride,
  updatedBy: string,
): Promise<void> {
  const col = await collection()
  await col.updateOne(
    { _id: slug },
    { $set: { ...input, updatedAt: new Date(), updatedBy } },
    { upsert: true },
  )
}

export async function productLastUpdated(
  slug: string,
): Promise<{ at: Date; by: string } | null> {
  if (!isDatabaseConfigured()) return null
  try {
    const col = await collection()
    const doc = await col.findOne({ _id: slug })
    return doc?.updatedAt ? { at: doc.updatedAt, by: doc.updatedBy ?? 'unknown' } : null
  } catch {
    return null
  }
}

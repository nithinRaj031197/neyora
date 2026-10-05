import { z } from 'zod'

/**
 * The product fields an admin may change from the portal.
 *
 * Same overlay as settings: the Markdown file in `content/products` stays the
 * default and the database only overrides it. Clearing a field returns it to
 * the file, and a database outage leaves the shop serving the file unchanged.
 *
 * Images are deliberately absent. They are committed files with known
 * dimensions, which is what keeps layout shift at zero; letting an admin paste
 * a URL would quietly give that up. They change by commit until there is a
 * real upload path.
 */

/** `""` clears the override. Null is accepted because the driver writes
 *  `undefined` as null, and rejecting it would silently void the whole doc. */
const overridableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = typeof v === 'string' ? v.trim() : ''
    return trimmed.length > 0 ? trimmed : undefined
  })

/** Money as whole rupees. `""` clears; 0 is rejected as almost certainly a slip. */
const overridablePrice = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return undefined
    const raw = typeof v === 'number' ? String(v) : v.trim()
    if (raw === '') return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? Math.round(n) : Number.NaN
  })
  .refine((n) => n === undefined || (Number.isInteger(n) && n > 0), 'Enter a whole number above 0')

/**
 * Mirrors `availabilitySchema` in lib/validation/content.ts exactly.
 *
 * It has to: an admin setting a value the content type does not know would
 * produce a product the rest of the site cannot render.
 */
export const AVAILABILITY = [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'seasonal',
  'coming_soon',
] as const
export type Availability = (typeof AVAILABILITY)[number]

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: 'In stock — orderable',
  low_stock: 'Low stock — orderable',
  out_of_stock: 'Out of stock — ordering disabled',
  seasonal: 'Seasonal — ordering disabled',
  coming_soon: 'Coming soon — ordering disabled',
}

export const productOverrideSchema = z
  .strictObject({
    name: overridableText,
    shortDescription: overridableText,
    /** What the customer pays. */
    price: overridablePrice,
    /** Shown struck through. Only rendered when genuinely above `price`. */
    mrp: overridablePrice,
    availability: z.enum(AVAILABILITY).optional(),
  })
  /*
   * A struck-through price below the selling price is not a discount, it is a
   * mistake — and on a public shop it is a misleading one. Caught here so it
   * can never be saved, rather than hidden at render time.
   */
  .refine(
    (v) => v.mrp === undefined || v.price === undefined || v.mrp > v.price,
    { message: 'The original price must be higher than the current price', path: ['mrp'] },
  )

export type ProductOverride = Partial<z.infer<typeof productOverrideSchema>>

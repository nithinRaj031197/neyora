/**
 * Shared Zod primitives. Every Server Action re-validates with these — the
 * client-side form validation is a courtesy to the user, not a guarantee.
 */
import { z } from 'zod'

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'A slug is required')
  .max(120, 'Slug must be 120 characters or fewer')
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens only')

export const contentStatusSchema = z.enum(['draft', 'scheduled', 'published'])
export const packSizeSchema = z.enum(['150g', '200g', '250g', '500g', 'flexible'])
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const adminRoleSchema = z.enum(['owner', 'admin', 'editor'])
export const availabilitySchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'seasonal',
  'coming_soon',
])
export const messageStatusSchema = z.enum(['new', 'read', 'replied', 'archived', 'spam'])

/** A blank form field should become NULL, not an empty string. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

export const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => v === null || v === undefined || UUID_PATTERN.test(v), {
    message: 'Must be a valid ID',
  })
  .transform((v) => v ?? null)

/**
 * Number field arriving from FormData: "" -> null, "12" -> 12.
 *
 * The `.nullable().optional()` pair must sit *outside* the transforms. Zod
 * decides whether an object key is optional from the outermost wrapper, so a
 * schema that merely accepts `undefined` inside a union is still a required
 * key — and an untouched number input sends nothing at all.
 */
export const optionalInt = (opts: { min?: number; max?: number } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      if (v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? Math.trunc(n) : Number.NaN
    })
    .refine((v) => v === null || !Number.isNaN(v), { message: 'Must be a whole number' })
    .refine((v) => v === null || opts.min === undefined || v >= opts.min, {
      message: `Must be ${opts.min} or more`,
    })
    .refine((v) => v === null || opts.max === undefined || v <= opts.max, {
      message: `Must be ${opts.max} or less`,
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null)

export const optionalDecimal = (opts: { min?: number } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      if (v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : Number.NaN
    })
    .refine((v) => v === null || !Number.isNaN(v), { message: 'Must be a number' })
    .refine((v) => v === null || opts.min === undefined || v >= opts.min, {
      message: `Must be ${opts.min} or more`,
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null)

/**
 * Checkbox from FormData.
 *
 * An unchecked box sends nothing, so "absent" must mean false — which makes
 * the outer `.optional()` load-bearing rather than cosmetic.
 */
export const checkbox = z
  .union([z.string(), z.boolean()])
  .nullable()
  .optional()
  .transform((v) => v === true || v === 'on' || v === 'true' || v === '1')

/**
 * Internal link or fully-qualified https URL.
 *
 * Rejecting `javascript:` and other schemes here is what stops an admin-authored
 * CTA — or a compromised admin account — from becoming a script-injection or
 * open-redirect vector when the value is rendered into an `href`.
 */
export const hrefSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === '' || v.startsWith('/') || /^https:\/\//i.test(v) || /^mailto:/i.test(v), {
    message: 'Use a path starting with / or a full https:// URL',
  })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)

/**
 * Redirect destinations must stay on our own origin — no open redirector.
 *
 * A leading slash alone is not sufficient: `//evil.example.com` starts with
 * one and a browser resolves it as an absolute URL on another host, and some
 * clients normalise `/\evil.example.com` the same way. Mirrors the
 * `redirects_destination_relative` constraint in the database.
 */
export const relativePathSchema = z
  .string()
  .trim()
  .min(1, 'A destination is required')
  .max(2048)
  .refine((v) => v.startsWith('/'), {
    message: 'Must be a path on this site, starting with /',
  })
  .refine((v) => !v.startsWith('//') && !v.startsWith('/\\'), {
    message:
      'That would send visitors to another website. Use a single leading slash, e.g. /recipes',
  })
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), {
    message: 'Remove any line breaks or control characters',
  })

/** Pragmatic email shape check; real verification is a reply landing. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'An email address is required')
  .max(254)
  .regex(EMAIL_PATTERN, 'Enter a valid email address')

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
    .replace(/-+$/g, '')
}

/** Flattens a ZodError into { field: message } for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    out[key] ??= issue.message
  }
  return out
}

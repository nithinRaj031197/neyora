import 'server-only'

/**
 * Server Action plumbing shared by every admin mutation.
 */
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { fieldErrors } from '@/lib/validation/common'
import { fail, type ActionState } from './state'

/**
 * FormData -> plain object.
 *
 * Fields listed in `jsonFields` are parsed from JSON: the repeatable editors
 * (ingredients, steps, nutrition, image order) keep their state in a client
 * component and submit it through one hidden input, which keeps the wire
 * format simple and the Zod schema the single validator.
 *
 * Fields in `arrayFields` collect every value with that name.
 */
export function formToObject(
  formData: FormData,
  options: { jsonFields?: string[]; arrayFields?: string[] } = {},
): Record<string, unknown> {
  const { jsonFields = [], arrayFields = [] } = options
  const out: Record<string, unknown> = {}

  for (const key of new Set(formData.keys())) {
    if (arrayFields.includes(key)) {
      out[key] = formData.getAll(key).map(String)
      continue
    }
    const value = formData.get(key)
    if (value instanceof File) continue
    out[key] = value === null ? undefined : String(value)
  }

  for (const key of jsonFields) {
    const raw = formData.get(key)
    if (raw === null) {
      out[key] = undefined
      continue
    }
    try {
      out[key] = JSON.parse(String(raw) || 'null') ?? undefined
    } catch {
      // Leave the raw string so Zod reports a type error against the field
      // rather than the whole form failing with an opaque message.
      out[key] = String(raw)
    }
  }

  // An unchecked checkbox sends nothing at all, so it must be defaulted here
  // or Zod would treat "absent" as "unspecified" instead of false.
  for (const key of arrayFields) out[key] ??= []

  return out
}

/** Parses with a schema, returning either the value or a populated ActionState. */
export function parseOrFail<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState<never> } {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    state: fail('Please check the highlighted fields.', fieldErrors(result.error)),
  }
}

/**
 * Invalidates the public pages a mutation could have changed.
 *
 * Called after every write. Public routes are cached with `revalidate`, so
 * without this an editor would publish a recipe and not see it for 5 minutes —
 * which reads as "the CMS is broken".
 */
export function revalidateContent(paths: string[]): void {
  const unique = new Set(['/', ...paths])
  for (const path of unique) {
    try {
      revalidatePath(path)
    } catch (error) {
      console.error('[revalidate] failed for', path, error)
    }
  }
}

/** Turns a Postgres error into something an editor can act on. */
export function describeDbError(error: { code?: string; message: string; details?: string | null }): {
  message: string
  errors?: Record<string, string>
} {
  switch (error.code) {
    case '23505':
    case '23000':
      break
    case '23514':
      return { message: `A value failed a database rule: ${error.message}` }
    case '42501':
      return {
        message:
          'The database refused this write. Your account may no longer have admin access — try signing out and back in.',
      }
    default:
      break
  }

  // 23505 is unique_violation; the constraint name tells us which field.
  if (error.code === '23505') {
    const isSlug = /slug/i.test(error.details ?? error.message)
    if (isSlug) {
      return {
        message: 'That slug is already in use.',
        errors: { slug: 'Already taken — try a different slug.' },
      }
    }
    return { message: `That value must be unique: ${error.details ?? error.message}` }
  }

  return { message: `Database error: ${error.message}` }
}

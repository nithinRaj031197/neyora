import { z } from 'zod'

/**
 * The settings an admin may change from the portal.
 *
 * A deliberately small list. `content/site.yml` still holds everything —
 * brand name, SEO defaults, social links, the QR destination — and remains the
 * default for every field below. This document only ever *overrides* it.
 *
 * That direction matters. The site keeps building and serving correctly with
 * no database at all: if Mongo is unreachable, or nobody has ever opened the
 * settings page, every page falls back to the file. An admin edit is an
 * override, never the only copy.
 *
 * Only the details that genuinely change without a deploy are here. A phone
 * number changes; a brand name does not.
 */

/**
 * `""` means "clear this override and fall back to site.yml".
 *
 * Accepts null as well as undefined. The MongoDB driver writes `undefined` as
 * `null`, so a cleared field comes back as null on the next read — and an
 * `.optional()`-only schema rejects null, which made the whole document fail
 * validation and silently fall back to the file. The same shape as
 * `optionalString` in lib/validation/content.ts, for the same reason.
 */
const overridable = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = typeof v === 'string' ? v.trim() : ''
    return trimmed.length > 0 ? trimmed.slice(0, 200) : undefined
  })

export const settingsOverrideSchema = z.strictObject({
  contactEmail: overridable.refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Enter a valid email address',
  ),
  /** Free-form: this is displayed, not dialled programmatically. */
  contactPhone: overridable,
  /**
   * Digits and country code only — wa.me rejects '+', spaces and dashes, and
   * it fails by opening a broken chat rather than erroring, so it is worth
   * being strict here.
   */
  /*
   * Must START with a country code. `^\d{10,15}$` was too loose: a bare
   * 10-digit Indian mobile passed validation, and wa.me then opened a broken
   * chat rather than erroring — so every order button on the site was dead
   * and nothing said so. 91 followed by a 10-digit mobile beginning 6-9 is
   * the shape that actually works.
   */
  whatsappNumber: overridable.refine(
    (v) => v === undefined || /^(?:91[6-9]\d{9}|[1-9]\d{9,14})$/.test(v),
    'Include the country code — e.g. 919876543210, not 9876543210',
  ),
  whatsappMessage: overridable,
  businessHours: overridable,
  addressLine1: overridable,
  addressLine2: overridable,
  addressCity: overridable,
  addressState: overridable,
  addressPostalCode: overridable,
  addressCountry: overridable,
})

/*
 * Every key optional. Zod infers each as `string | undefined` (present but
 * possibly undefined), which would force the repository to name all eleven
 * fields just to return "no overrides".
 */
export type SettingsOverride = Partial<z.infer<typeof settingsOverrideSchema>>

/** The fields the form posts, in the order they are shown. */
export const SETTINGS_FIELDS = [
  { name: 'contactEmail', label: 'Contact email', type: 'email', hint: 'Shown in the footer and on the contact page.' },
  { name: 'contactPhone', label: 'Phone number', type: 'tel', hint: 'As you want it displayed, e.g. +91 98765 43210.' },
  { name: 'whatsappNumber', label: 'WhatsApp number', type: 'tel', hint: 'Digits only with country code, Must start with the country code, e.g. 919876543210 — not 9876543210. Every WhatsApp button uses this.' },
  { name: 'whatsappMessage', label: 'WhatsApp opening message', type: 'text', hint: 'Pre-filled when a customer taps a WhatsApp button.' },
  { name: 'businessHours', label: 'Business hours', type: 'text', hint: '' },
  { name: 'addressLine1', label: 'Address line 1', type: 'text', hint: '' },
  { name: 'addressLine2', label: 'Address line 2', type: 'text', hint: '' },
  { name: 'addressCity', label: 'City', type: 'text', hint: '' },
  { name: 'addressState', label: 'State', type: 'text', hint: '' },
  { name: 'addressPostalCode', label: 'Postal code', type: 'text', hint: '' },
  { name: 'addressCountry', label: 'Country', type: 'text', hint: '' },
] as const satisfies readonly { name: keyof SettingsOverride; label: string; type: string; hint: string }[]

import { z } from 'zod'

/**
 * Which homepage chapters are shown.
 *
 * The same overlay as settings and products: `content/homepage.yml` carries
 * the default for every chapter in its own `enabled` flag, and this document
 * only ever overrides it. With no database, or before anyone has saved, the
 * homepage is exactly what the file says.
 *
 * Visibility only. Nothing here edits a chapter's words or pictures — those
 * are composed artwork and authored copy, and a toggle is the one decision
 * that genuinely changes without a deploy.
 */

export const HOMEPAGE_SECTIONS = [
  {
    key: 'hero',
    label: 'Hero banner',
    description: 'The opening full-screen campaign frame.',
  },
  {
    key: 'nature',
    label: 'From nature',
    description: 'Good food starts with how it is grown.',
  },
  {
    key: 'mushroom',
    label: 'The mushroom',
    description: 'The dark macro chapter — gills, cap, scent.',
  },
  {
    key: 'journey',
    label: 'Grown to table',
    description: 'The four-stage process: grown, harvested, packed, at your table.',
  },
  {
    key: 'product',
    label: 'What we grow',
    description: 'The featured product, with its price and order button.',
  },
  {
    key: 'food',
    label: 'Food and recipes',
    description: 'Recipe cards and the link into the recipe index.',
  },
  /*
   * No `farm` entry. The chapter exists in homepage.yml and has a component,
   * but the homepage does not render it — so a switch for it would be a
   * control that changes nothing, which reads as broken. Add it here when the
   * chapter goes back on the page.
   */
  {
    key: 'quality',
    label: 'Quality',
    description: 'Standards, and the customer quote beside them.',
  },
  {
    key: 'finalCta',
    label: 'Talk to us',
    description: '“Ready to cook better?” — the closing call to action above the footer.',
  },
] as const satisfies readonly { key: string; label: string; description: string }[]

export type HomepageSectionKey = (typeof HOMEPAGE_SECTIONS)[number]['key']

export const HOMEPAGE_SECTION_KEYS = HOMEPAGE_SECTIONS.map((s) => s.key) as HomepageSectionKey[]

/**
 * Null is accepted alongside undefined because the MongoDB driver writes
 * `undefined` as null — and a schema that rejected null would fail the whole
 * document on the next read, silently reverting every toggle at once.
 */
const toggle = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((v) => (typeof v === 'boolean' ? v : undefined))

export const homepageOverrideSchema = z.strictObject(
  Object.fromEntries(HOMEPAGE_SECTION_KEYS.map((key) => [key, toggle])) as Record<
    HomepageSectionKey,
    typeof toggle
  >,
)

export type HomepageOverride = Partial<Record<HomepageSectionKey, boolean>>

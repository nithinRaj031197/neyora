/**
 * Zod schemas for every admin form and public submission.
 *
 * These are the single source of truth. Server Actions parse raw FormData
 * through them before a value is allowed anywhere near the database, so the
 * client cannot bypass a rule by editing the DOM or posting directly.
 */
import { z } from 'zod'
import {
  adminRoleSchema,
  availabilitySchema,
  checkbox,
  contentStatusSchema,
  difficultySchema,
  emailSchema,
  hrefSchema,
  messageStatusSchema,
  optionalDecimal,
  optionalInt,
  optionalText,
  optionalUuid,
  packSizeSchema,
  relativePathSchema,
  slugSchema,
} from './common'

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const seoFields = {
  seo_title: optionalText(120),
  seo_description: optionalText(320),
  canonical_url: hrefSchema,
  og_image_id: optionalUuid,
}

/**
 * Publication state, cross-validated: choosing "Scheduled" without a date is
 * the one mistake that would silently leave content invisible forever.
 */
const publicationFields = {
  status: contentStatusSchema,
  scheduled_at: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === undefined ? null : v))
    .nullable(),
}

function refinePublication<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const v = val as { status?: string; scheduled_at?: string | null }
    if (v.status === 'scheduled' && !v.scheduled_at) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduled_at'],
        message: 'Pick a date and time to publish, or save as a draft instead.',
      })
    }
    if (v.status === 'scheduled' && v.scheduled_at) {
      const when = new Date(v.scheduled_at)
      if (Number.isNaN(when.getTime())) {
        ctx.addIssue({ code: 'custom', path: ['scheduled_at'], message: 'Not a valid date and time.' })
      }
    }
  })
}

export const ingredientSchema = z.object({
  qty: z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => {
      if (v === null || v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : null
    })
    .nullable(),
  unit: z.string().trim().max(24).default(''),
  item: z.string().trim().min(1, 'Name the ingredient').max(160),
  note: z.string().trim().max(240).default(''),
  // Unmeasured lines ("salt, to taste") must not be multiplied when scaling.
  scalable: z.boolean().default(true),
  group: z.string().trim().max(80).default(''),
})

export const recipeStepSchema = z.object({
  title: z.string().trim().max(120).default(''),
  body: z.string().trim().min(1, 'Describe the step').max(2000),
  duration_minutes: optionalInt({ min: 0, max: 1440 }),
  media_id: optionalUuid,
})

export const nutritionSchema = z.object({
  basis: z.string().trim().max(120).default(''),
  per: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(40),
        unit: z.string().trim().max(24).default(''),
      }),
    )
    .max(30)
    .default([]),
  note: z.string().trim().max(400).default(''),
})

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export const recipeSchema = refinePublication(
  z.object({
    title: z.string().trim().min(2, 'Give the recipe a title').max(180),
    slug: slugSchema,
    excerpt: optionalText(320),
    body: z.string().max(80_000, 'That is a very long recipe — 80,000 characters is the limit').default(''),

    category_id: optionalUuid,
    cover_image_id: optionalUuid,

    prep_time_minutes: optionalInt({ min: 0, max: 10_080 }),
    cook_time_minutes: optionalInt({ min: 0, max: 10_080 }),
    servings: optionalInt({ min: 1, max: 100 }),
    servings_label: optionalText(80),
    difficulty: difficultySchema,
    cuisine: optionalText(80),
    course: optionalText(80),

    recommended_pack_size: packSizeSchema,
    base_pack_grams: optionalInt({ min: 1, max: 100_000 }),
    is_scalable: checkbox,
    primary_product_id: optionalUuid,

    ingredients: z.array(ingredientSchema).max(120).default([]),
    steps: z.array(recipeStepSchema).max(80).default([]),
    nutrition: nutritionSchema.default({ basis: '', per: [], note: '' }),
    equipment: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    tips: optionalText(4000),
    tag_ids: z.array(z.string()).max(40).default([]),

    featured: checkbox,
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    noindex: checkbox,
    ...seoFields,
    ...publicationFields,
  }),
)

export type RecipeInput = z.infer<typeof recipeSchema>

export const recipePackVariantSchema = z.object({
  recipe_id: z.string().uuid(),
  pack_size: packSizeSchema,
  pack_grams: optionalInt({ min: 1, max: 100_000 }),
  servings: optionalInt({ min: 1, max: 100 }),
  ingredients: z.array(ingredientSchema).max(120).default([]),
  note: optionalText(1000),
})

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productSchema = refinePublication(
  z.object({
    name: z.string().trim().min(2, 'Give the product a name').max(180),
    slug: slugSchema,
    short_description: optionalText(320),
    description: z.string().max(80_000).default(''),

    category_id: optionalUuid,
    variety: optionalText(160),
    origin: optionalText(160),

    weight_grams: optionalInt({ min: 1, max: 1_000_000 }),
    weight_label: optionalText(40),
    price: optionalDecimal({ min: 0 }),
    mrp: optionalDecimal({ min: 0 }),
    currency: z.string().trim().length(3).toUpperCase().default('INR'),
    unit_label: optionalText(40),

    nutrition: nutritionSchema.default({ basis: '', per: [], note: '' }),
    highlights: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    storage_notes: optionalText(8000),
    shelf_life: optionalText(160),
    availability: availabilitySchema,

    image_ids: z.array(z.string()).max(20).default([]),

    featured: checkbox,
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    ...seoFields,
    ...publicationFields,
  }),
).superRefine((val, ctx) => {
  // A "discount" where the MRP is below the selling price is always a typo.
  if (val.price !== null && val.mrp !== null && val.mrp < val.price) {
    ctx.addIssue({
      code: 'custom',
      path: ['mrp'],
      message: 'MRP is lower than the selling price. Swap the two values?',
    })
  }
})

export type ProductInput = z.infer<typeof productSchema>

// ---------------------------------------------------------------------------
// Categories, tags, pages
// ---------------------------------------------------------------------------

export const categorySchema = refinePublication(
  z.object({
    name: z.string().trim().min(1, 'Name the category').max(120),
    slug: slugSchema,
    description: optionalText(1000),
    image_id: optionalUuid,
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    seo_title: optionalText(120),
    seo_description: optionalText(320),
    ...publicationFields,
  }),
)

export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Name the tag').max(80),
  slug: slugSchema,
})

export const pageSchema = refinePublication(
  z.object({
    title: z.string().trim().min(1, 'Give the page a title').max(180),
    slug: slugSchema,
    eyebrow: optionalText(80),
    subtitle: optionalText(400),
    body: z.string().max(200_000).default(''),
    hero_image_id: optionalUuid,
    noindex: checkbox,
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    ...seoFields,
    ...publicationFields,
  }),
)

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

export const homepageSchema = z.object({
  hero_eyebrow: optionalText(120),
  hero_headline: z.string().trim().min(1, 'The hero needs a headline').max(180),
  hero_subheadline: z.string().trim().max(180).default(''),
  hero_description: optionalText(600),
  hero_image_id: optionalUuid,
  hero_image_caption: optionalText(200),
  hero_cta_label: optionalText(60),
  hero_cta_href: hrefSchema,
  hero_secondary_cta_label: optionalText(60),
  hero_secondary_cta_href: hrefSchema,

  products_eyebrow: optionalText(120),
  products_heading: optionalText(180),
  products_description: optionalText(600),
  products_cta_label: optionalText(60),
  products_cta_href: hrefSchema,

  why_eyebrow: optionalText(120),
  why_heading: optionalText(180),
  why_description: optionalText(600),
  why_pillars: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Each pillar needs a title').max(120),
        description: z.string().trim().max(600).default(''),
      }),
    )
    .max(8)
    .default([]),

  farm_eyebrow: optionalText(120),
  farm_heading: optionalText(180),
  farm_description: optionalText(600),
  farm_body: optionalText(4000),
  farm_image_id: optionalUuid,
  farm_cta_label: optionalText(60),
  farm_cta_href: hrefSchema,

  recipes_eyebrow: optionalText(120),
  recipes_heading: optionalText(180),
  recipes_description: optionalText(600),
  recipes_cta_label: optionalText(60),
  recipes_cta_href: hrefSchema,

  community_eyebrow: optionalText(120),
  community_heading: optionalText(180),
  community_description: optionalText(600),

  social_eyebrow: optionalText(120),
  social_heading: optionalText(180),
  social_description: optionalText(600),
  social_handle: optionalText(80),

  final_cta_eyebrow: optionalText(120),
  final_cta_heading: optionalText(180),
  final_cta_description: optionalText(600),
  final_cta_label: optionalText(60),
  final_cta_href: hrefSchema,
  final_cta_image_id: optionalUuid,

  section_visibility: z.record(z.string(), z.boolean()).default({}),

  seo_title: optionalText(120),
  seo_description: optionalText(320),
  og_image_id: optionalUuid,
})

// ---------------------------------------------------------------------------
// Site settings, social links, redirects
// ---------------------------------------------------------------------------

export const siteSettingsSchema = z.object({
  brand_name: z.string().trim().min(1, 'The brand needs a name').max(80),
  tagline: z.string().trim().max(120).default(''),
  brand_description: optionalText(600),

  contact_email: optionalText(254),
  contact_phone: optionalText(40),
  // Digits only, with country code. wa.me rejects '+', spaces and dashes.
  whatsapp_number: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s+()-]/g, ''))
    .refine((v) => v === '' || /^\d{8,15}$/.test(v), {
      message: 'Digits only, including the country code — e.g. 919876543210',
    })
    .transform((v) => (v === '' ? null : v)),
  whatsapp_message: optionalText(400),

  address_line1: optionalText(200),
  address_line2: optionalText(200),
  city: optionalText(120),
  state: optionalText(120),
  postal_code: optionalText(20),
  country: optionalText(120),
  google_maps_url: hrefSchema,
  business_hours: optionalText(240),

  footer_tagline: optionalText(200),
  footer_note: optionalText(600),
  copyright_holder: optionalText(120),

  announcement_text: optionalText(200),
  announcement_href: hrefSchema,
  announcement_enabled: checkbox,

  default_seo_title: optionalText(120),
  default_seo_description: optionalText(320),
  default_og_image_id: optionalUuid,
  organization_legal_name: optionalText(180),
})

export const socialLinkSchema = z.object({
  platform: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
  label: z.string().trim().min(1, 'The link needs a label').max(60),
  url: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === '' || /^https:\/\//i.test(v), { message: 'Must be a full https:// URL' }),
  handle: optionalText(80),
  sort_order: optionalInt({ min: -999, max: 999 }),
  enabled: checkbox,
})

export const redirectSchema = z
  .object({
    source: z
      .string()
      .trim()
      .min(1, 'A source key is required')
      .max(120)
      .regex(
        /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/,
        'Lowercase letters, numbers, hyphens and slashes only — e.g. go or go/200g',
      ),
    destination: relativePathSchema,
    http_status: z.coerce.number().int().refine((v) => [301, 302, 307, 308].includes(v), {
      message: 'Choose 301, 302, 307 or 308',
    }),
    enabled: checkbox,
    label: optionalText(120),
    note: optionalText(1000),
    landing_title: optionalText(120),
    landing_body: optionalText(1000),
  })
  .superRefine((val, ctx) => {
    // A 301 is cached indefinitely by browsers. For a QR code that must stay
    // re-pointable, that is a trap worth naming out loud.
    if (val.http_status === 301 && val.source === 'go') {
      ctx.addIssue({
        code: 'custom',
        path: ['http_status'],
        message:
          'Use 302 for the packaging QR. A 301 is cached permanently by browsers, so scanners that have already visited would keep going to the old destination.',
      })
    }
  })

// ---------------------------------------------------------------------------
// FAQs, testimonials
// ---------------------------------------------------------------------------

export const faqSchema = refinePublication(
  z.object({
    question: z.string().trim().min(3, 'Write the question').max(300),
    answer: z.string().max(20_000).default(''),
    category: z.string().trim().min(1).max(80).default('General'),
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    ...publicationFields,
  }),
)

export const testimonialSchema = refinePublication(
  z.object({
    quote: z.string().trim().min(3, 'Add the quote').max(1200),
    author_name: z.string().trim().min(1, 'Who said it?').max(120),
    author_role: optionalText(120),
    location: optionalText(120),
    rating: optionalInt({ min: 1, max: 5 }),
    avatar_id: optionalUuid,
    featured: checkbox,
    sort_order: optionalInt({ min: -9999, max: 9999 }),
    ...publicationFields,
  }),
)

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const mediaMetaSchema = z.object({
  id: z.string().uuid(),
  alt: z.string().trim().max(300).default(''),
  title: optionalText(200),
  description: optionalText(1000),
  folder: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and hyphens only')
    .default('general'),
})

export const mediaRegisterSchema = z.object({
  path: z.string().trim().min(1).max(400),
  public_url: z.string().trim().min(1).max(1000),
  mime_type: z.string().trim().min(1).max(80),
  width: optionalInt({ min: 1, max: 30_000 }),
  height: optionalInt({ min: 1, max: 30_000 }),
  size_bytes: optionalInt({ min: 0 }),
  alt: z.string().trim().max(300).default(''),
  title: optionalText(200),
  folder: z.string().trim().max(60).default('general'),
  variants: z
    .array(
      z.object({
        width: z.number().int().min(1).max(30_000),
        path: z.string().min(1).max(400),
        bytes: z.number().int().min(0).optional(),
        url: z.string().max(1000).optional(),
      }),
    )
    .max(8)
    .default([]),
})

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

export const adminInviteSchema = z.object({
  email: emailSchema,
  full_name: optionalText(160),
  role: adminRoleSchema,
})

export const adminUpdateSchema = z.object({
  id: z.string().uuid(),
  full_name: optionalText(160),
  role: adminRoleSchema,
})

// ---------------------------------------------------------------------------
// Public submissions
// ---------------------------------------------------------------------------

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Please tell us your name').max(120),
  email: emailSchema,
  phone: optionalText(40),
  subject: optionalText(200),
  message: z
    .string()
    .trim()
    .min(10, 'Please give us a little more detail (at least 10 characters)')
    .max(5000, 'Please keep it under 5,000 characters'),
  // Honeypot: a real person never fills a field they cannot see.
  website: z.string().max(200).optional().default(''),
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Passwords are at least 8 characters').max(200),
})

export const adminSetupSchema = z.object({
  token: z.string().trim().min(16, 'That token is too short to be correct').max(256),
  full_name: optionalText(160),
})

export const contactStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: messageStatusSchema,
  admin_note: optionalText(2000),
})

export const analyticsEventSchema = z.object({
  event_name: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{1,48}$/, 'Invalid event name'),
  path: z.string().trim().max(400).optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
})

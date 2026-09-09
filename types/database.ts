/**
 * Typed schema for the NEYORA Supabase project.
 *
 * Hand-maintained so a fresh clone type-checks without a database connection.
 * Once your project is linked you can regenerate it from the live schema:
 *
 *   npm run db:types        # supabase gen types typescript --linked
 *
 * Keep it in sync with supabase/migrations/*.
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

export type ContentStatus = 'draft' | 'scheduled' | 'published'
export type AdminRole = 'owner' | 'admin' | 'editor'
export type RecipeDifficulty = 'easy' | 'medium' | 'hard'
export type PackSize = '150g' | '200g' | '250g' | '500g' | 'flexible'
export type MessageStatus = 'new' | 'read' | 'replied' | 'archived' | 'spam'
export type AvailabilityStatus =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'seasonal'
  | 'coming_soon'

/**
 * Foreign key metadata. PostgREST's type inference uses this to resolve
 * embedded selects such as `select('media(*)')`, so any table we embed
 * through must declare its relationships.
 */
type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

/** Generated columns and DB defaults make most fields optional on write. */
type Writable<
  Row,
  Required extends keyof Row = never,
  Generated extends keyof Row = never,
  Rels extends Relationship[] = [],
> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>
  Update: Partial<Omit<Row, Generated>>
  Relationships: Rels
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export type AdminRow = {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: AdminRole
  last_seen_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MediaVariant = {
  width: number
  path: string
  bytes?: number
  url?: string
}

export type MediaRow = {
  id: string
  bucket: string
  path: string
  public_url: string
  mime_type: string
  width: number | null
  height: number | null
  size_bytes: number | null
  alt: string | null
  title: string | null
  description: string | null
  variants: MediaVariant[]
  folder: string
  uploaded_by: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SiteSettingsRow = {
  id: number
  brand_name: string
  tagline: string
  brand_description: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  whatsapp_message: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  google_maps_url: string | null
  business_hours: string | null
  footer_tagline: string | null
  footer_note: string | null
  copyright_holder: string | null
  announcement_text: string | null
  announcement_href: string | null
  announcement_enabled: boolean
  default_seo_title: string | null
  default_seo_description: string | null
  default_og_image_id: string | null
  organization_legal_name: string | null
  extras: Json
  created_at: string
  updated_at: string
}

export type PageSection = {
  kind: string
  heading?: string
  body?: string
  items?: { title?: string; description?: string }[]
  media_id?: string
}

export type PageRow = {
  id: string
  slug: string
  title: string
  eyebrow: string | null
  subtitle: string | null
  body: string
  hero_image_id: string | null
  sections: PageSection[]
  seo_title: string | null
  seo_description: string | null
  canonical_url: string | null
  og_image_id: string | null
  noindex: boolean
  is_system: boolean
  sort_order: number
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Pillar = {
  title: string
  description: string
}

export type HomepageRow = {
  id: number
  hero_eyebrow: string | null
  hero_headline: string
  hero_subheadline: string
  hero_description: string | null
  hero_image_id: string | null
  hero_image_caption: string | null
  hero_cta_label: string | null
  hero_cta_href: string | null
  hero_secondary_cta_label: string | null
  hero_secondary_cta_href: string | null
  products_eyebrow: string | null
  products_heading: string | null
  products_description: string | null
  products_cta_label: string | null
  products_cta_href: string | null
  why_eyebrow: string | null
  why_heading: string | null
  why_description: string | null
  why_pillars: Pillar[]
  farm_eyebrow: string | null
  farm_heading: string | null
  farm_description: string | null
  farm_body: string | null
  farm_image_id: string | null
  farm_cta_label: string | null
  farm_cta_href: string | null
  recipes_eyebrow: string | null
  recipes_heading: string | null
  recipes_description: string | null
  recipes_cta_label: string | null
  recipes_cta_href: string | null
  community_eyebrow: string | null
  community_heading: string | null
  community_description: string | null
  social_eyebrow: string | null
  social_heading: string | null
  social_description: string | null
  social_handle: string | null
  final_cta_eyebrow: string | null
  final_cta_heading: string | null
  final_cta_description: string | null
  final_cta_label: string | null
  final_cta_href: string | null
  final_cta_image_id: string | null
  section_visibility: Record<string, boolean>
  seo_title: string | null
  seo_description: string | null
  og_image_id: string | null
  created_at: string
  updated_at: string
}

export type CategoryRow = {
  id: string
  slug: string
  name: string
  description: string | null
  image_id: string | null
  sort_order: number
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RecipeCategoryRow = {
  id: string
  slug: string
  name: string
  description: string | null
  image_id: string | null
  sort_order: number
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  seo_title: string | null
  seo_description: string | null
}

export type NutritionFact = {
  label: string
  value: string
  unit?: string
  dv?: string
}

export type Nutrition = {
  basis?: string
  per?: NutritionFact[]
  note?: string
}

export type ProductRow = {
  id: string
  slug: string
  name: string
  short_description: string | null
  description: string
  category_id: string | null
  variety: string | null
  origin: string | null
  weight_grams: number | null
  weight_label: string | null
  price: number | null
  mrp: number | null
  currency: string
  unit_label: string | null
  nutrition: Nutrition
  highlights: string[]
  storage_notes: string | null
  shelf_life: string | null
  availability: AvailabilityStatus
  featured: boolean
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  canonical_url: string | null
  og_image_id: string | null
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProductImageRow = {
  id: string
  product_id: string
  media_id: string
  sort_order: number
  is_primary: boolean
  created_at: string
}

export type RecipeTagRow = {
  id: string
  slug: string
  name: string
  created_at: string
  updated_at: string
}

/**
 * One line of a recipe's ingredient list.
 *
 * `qty` is numeric and `scalable` marks what may be multiplied, which is what
 * makes automatic pack-size scaling possible later without a schema change.
 * `qty: null` means an unmeasured ingredient ("Salt, to taste").
 */
export type Ingredient = {
  qty: number | null
  unit: string
  item: string
  note?: string
  scalable: boolean
  group?: string
}

export type RecipeStep = {
  title?: string
  body: string
  /** Nullable as well as optional: an empty number input yields null. */
  duration_minutes?: number | null
  media_id?: string | null
}

export type RecipeRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  category_id: string | null
  cover_image_id: string | null
  og_image_id: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  /** Generated column: prep + cook. Never written directly. */
  total_time_minutes: number
  servings: number | null
  servings_label: string | null
  difficulty: RecipeDifficulty
  cuisine: string | null
  course: string | null
  recommended_pack_size: PackSize
  base_pack_grams: number | null
  is_scalable: boolean
  primary_product_id: string | null
  ingredients: Ingredient[]
  steps: RecipeStep[]
  nutrition: Nutrition
  equipment: string[]
  tips: string | null
  featured: boolean
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  canonical_url: string | null
  noindex: boolean
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  view_count: number
  created_by: string | null
  updated_by: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RecipeTagMapRow = {
  recipe_id: string
  tag_id: string
}

export type RecipePackVariantRow = {
  id: string
  recipe_id: string
  pack_size: PackSize
  pack_grams: number | null
  servings: number | null
  ingredients: Ingredient[]
  note: string | null
  created_at: string
  updated_at: string
}

export type FaqRow = {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TestimonialRow = {
  id: string
  quote: string
  author_name: string
  author_role: string | null
  location: string | null
  rating: number | null
  avatar_id: string | null
  featured: boolean
  sort_order: number
  status: ContentStatus
  published_at: string | null
  scheduled_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SocialLinkRow = {
  id: string
  platform: string
  label: string
  url: string
  handle: string | null
  sort_order: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export type RedirectRow = {
  id: string
  source: string
  destination: string
  http_status: number
  enabled: boolean
  label: string | null
  note: string | null
  landing_title: string | null
  landing_body: string | null
  scan_count: number
  last_scan_at: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ContactMessageRow = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  source: string | null
  status: MessageStatus
  admin_note: string | null
  ip_hash: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type AnalyticsEventRow = {
  id: number
  event_name: string
  path: string | null
  referrer_host: string | null
  props: Json
  session_hash: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      admins: Writable<AdminRow, 'user_id' | 'email', 'id' | 'created_at' | 'updated_at'>
      media: Writable<MediaRow, 'path' | 'public_url' | 'mime_type', 'id' | 'created_at' | 'updated_at'>
      site_settings: Writable<SiteSettingsRow, never, 'created_at' | 'updated_at'>
      pages: Writable<PageRow, 'slug' | 'title', 'id' | 'created_at' | 'updated_at'>
      homepage: Writable<HomepageRow, never, 'created_at' | 'updated_at'>
      product_categories: Writable<CategoryRow, 'slug' | 'name', 'id' | 'created_at' | 'updated_at'>
      products: Writable<
        ProductRow,
        'slug' | 'name',
        'id' | 'created_at' | 'updated_at',
        [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
        ]
      >
      product_images: Writable<
        ProductImageRow,
        'product_id' | 'media_id',
        'id' | 'created_at',
        [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_images_media_id_fkey'
            columns: ['media_id']
            isOneToOne: false
            referencedRelation: 'media'
            referencedColumns: ['id']
          },
        ]
      >
      recipe_categories: Writable<RecipeCategoryRow, 'slug' | 'name', 'id' | 'created_at' | 'updated_at'>
      recipe_tags: Writable<RecipeTagRow, 'slug' | 'name', 'id' | 'created_at' | 'updated_at'>
      recipes: Writable<
        RecipeRow,
        'slug' | 'title',
        'id' | 'created_at' | 'updated_at' | 'total_time_minutes',
        [
          {
            foreignKeyName: 'recipes_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'recipe_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipes_cover_image_id_fkey'
            columns: ['cover_image_id']
            isOneToOne: false
            referencedRelation: 'media'
            referencedColumns: ['id']
          },
        ]
      >
      recipe_tag_map: Writable<
        RecipeTagMapRow,
        'recipe_id' | 'tag_id',
        never,
        [
          {
            foreignKeyName: 'recipe_tag_map_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_tag_map_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'recipe_tags'
            referencedColumns: ['id']
          },
        ]
      >
      recipe_pack_variants: Writable<
        RecipePackVariantRow,
        'recipe_id' | 'pack_size',
        'id' | 'created_at' | 'updated_at',
        [
          {
            foreignKeyName: 'recipe_pack_variants_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
        ]
      >
      faqs: Writable<FaqRow, 'question', 'id' | 'created_at' | 'updated_at'>
      testimonials: Writable<TestimonialRow, 'quote' | 'author_name', 'id' | 'created_at' | 'updated_at'>
      social_links: Writable<SocialLinkRow, 'platform' | 'label', 'id' | 'created_at' | 'updated_at'>
      redirects: Writable<RedirectRow, 'source' | 'destination', 'id' | 'created_at' | 'updated_at'>
      contact_messages: Writable<
        ContactMessageRow,
        'name' | 'email' | 'message',
        'id' | 'created_at' | 'updated_at'
      >
      analytics_events: Writable<AnalyticsEventRow, 'event_name', 'id' | 'created_at'>
    }
    Views: Record<never, never>
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      is_admin_manager: { Args: Record<never, never>; Returns: boolean }
      admin_bootstrap_required: { Args: Record<never, never>; Returns: boolean }
      register_scan: { Args: { p_source: string }; Returns: undefined }
      increment_recipe_view: { Args: { p_slug: string }; Returns: undefined }
      purge_demo_content: { Args: Record<never, never>; Returns: string }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      content_status: ContentStatus
      admin_role: AdminRole
      recipe_difficulty: RecipeDifficulty
      pack_size: PackSize
      message_status: MessageStatus
      availability_status: AvailabilityStatus
    }
    CompositeTypes: Record<never, never>
  }
}

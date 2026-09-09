import 'server-only'

/**
 * Admin-side queries.
 *
 * These use the *authenticated* client, never the service role. Every read
 * therefore passes through the `<table>_admin_all` RLS policies, so a user
 * whose admin row was revoked immediately stops seeing draft content — even
 * if their session cookie is still valid.
 */
import { createClient } from '@/lib/supabase/server'
import { assertNoError } from './errors'
import type {
  AdminRow,
  CategoryRow,
  ContactMessageRow,
  ContentStatus,
  FaqRow,
  HomepageRow,
  MediaRow,
  PageRow,
  ProductRow,
  RecipeCategoryRow,
  RecipePackVariantRow,
  RecipeRow,
  RecipeTagRow,
  RedirectRow,
  SocialLinkRow,
  TestimonialRow,
} from '@/types/database'

export interface AdminListOptions {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface AdminListResult<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function range(options: AdminListOptions) {
  const pageSize = Math.min(100, Math.max(5, options.pageSize ?? 25))
  const page = Math.max(1, options.page ?? 1)
  return { page, pageSize, from: (page - 1) * pageSize, to: (page - 1) * pageSize + pageSize - 1 }
}

function paginate<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number,
): AdminListResult<T> {
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

/** Only accept a status we actually have, so a stray query param cannot error. */
function validStatus(status?: string): ContentStatus | null {
  return status === 'draft' || status === 'scheduled' || status === 'published' ? status : null
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export interface AdminRecipeListRow {
  id: string
  slug: string
  title: string
  status: ContentStatus
  featured: boolean
  sort_order: number
  published_at: string | null
  scheduled_at: string | null
  updated_at: string
  view_count: number
  is_demo: boolean
  recommended_pack_size: RecipeRow['recommended_pack_size']
  category: { name: string } | null
}

export async function listAdminRecipes(
  options: AdminListOptions = {},
): Promise<AdminListResult<AdminRecipeListRow>> {
  const supabase = await createClient()
  const { page, pageSize, from, to } = range(options)

  let query = supabase
    .from('recipes')
    .select(
      'id, slug, title, status, featured, sort_order, published_at, scheduled_at, updated_at, view_count, is_demo, recommended_pack_size, recipe_categories(name)',
      { count: 'exact' },
    )
    .is('deleted_at', null)

  const status = validStatus(options.status)
  if (status) query = query.eq('status', status)
  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`)
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to)

  assertNoError('admin recipes', error)

  const rows = (data ?? []).map((row) => {
    const { recipe_categories, ...rest } = row as typeof row & {
      recipe_categories: { name: string } | null
    }
    return { ...rest, category: recipe_categories } as AdminRecipeListRow
  })

  return paginate(rows, count ?? rows.length, page, pageSize)
}

export interface AdminRecipe extends RecipeRow {
  tag_ids: string[]
  cover: MediaRow | null
  pack_variants: RecipePackVariantRow[]
}

export async function getAdminRecipe(id: string): Promise<AdminRecipe | null> {
  const supabase = await createClient()

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  assertNoError('admin recipe', error)
  if (!recipe) return null

  const [tagRes, coverRes, variantRes] = await Promise.all([
    supabase.from('recipe_tag_map').select('tag_id').eq('recipe_id', id),
    recipe.cover_image_id
      ? supabase.from('media').select('*').eq('id', recipe.cover_image_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('recipe_pack_variants').select('*').eq('recipe_id', id).order('pack_size'),
  ])
  assertNoError('admin recipe tags', tagRes.error)
  assertNoError('admin recipe cover', coverRes.error)
  assertNoError('admin recipe variants', variantRes.error)

  return {
    ...recipe,
    tag_ids: (tagRes.data ?? []).map((row) => row.tag_id),
    cover: (coverRes.data as MediaRow | null) ?? null,
    pack_variants: (variantRes.data ?? []) as RecipePackVariantRow[],
  }
}

export async function getAdminRecipeCategories(): Promise<RecipeCategoryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipe_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
  assertNoError('admin recipe categories', error)
  return data ?? []
}

export async function getAdminRecipeTags(): Promise<RecipeTagRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('recipe_tags').select('*').order('name')
  assertNoError('admin recipe tags list', error)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface AdminProductListRow {
  id: string
  slug: string
  name: string
  status: ContentStatus
  featured: boolean
  sort_order: number
  price: number | null
  currency: string
  weight_label: string | null
  availability: ProductRow['availability']
  updated_at: string
  is_demo: boolean
}

export async function listAdminProducts(
  options: AdminListOptions = {},
): Promise<AdminListResult<AdminProductListRow>> {
  const supabase = await createClient()
  const { page, pageSize, from, to } = range(options)

  let query = supabase
    .from('products')
    .select(
      'id, slug, name, status, featured, sort_order, price, currency, weight_label, availability, updated_at, is_demo',
      { count: 'exact' },
    )
    .is('deleted_at', null)

  const status = validStatus(options.status)
  if (status) query = query.eq('status', status)
  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
  }

  const { data, error, count } = await query.order('sort_order').range(from, to)
  assertNoError('admin products', error)
  return paginate((data ?? []) as AdminProductListRow[], count ?? 0, page, pageSize)
}

export interface AdminProduct extends ProductRow {
  image_ids: string[]
  images: MediaRow[]
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const supabase = await createClient()
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  assertNoError('admin product', error)
  if (!product) return null

  const { data: images, error: imageError } = await supabase
    .from('product_images')
    .select('media_id, sort_order, media(*)')
    .eq('product_id', id)
    .order('sort_order')
  assertNoError('admin product images', imageError)

  const rows = images ?? []
  return {
    ...product,
    image_ids: rows.map((row) => row.media_id),
    images: rows
      .map((row) => (row as unknown as { media: MediaRow | null }).media)
      .filter((m): m is MediaRow => Boolean(m)),
  }
}

export async function getAdminProductCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
  assertNoError('admin product categories', error)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Pages, homepage, FAQs, testimonials
// ---------------------------------------------------------------------------

export async function listAdminPages(): Promise<PageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
    .order('title')
  assertNoError('admin pages', error)
  return data ?? []
}

export async function getAdminPage(id: string): Promise<(PageRow & { hero: MediaRow | null }) | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pages').select('*').eq('id', id).maybeSingle()
  assertNoError('admin page', error)
  if (!data) return null

  if (!data.hero_image_id) return { ...data, hero: null }
  const { data: hero } = await supabase
    .from('media')
    .select('*')
    .eq('id', data.hero_image_id)
    .maybeSingle()
  return { ...data, hero: (hero as MediaRow | null) ?? null }
}

export async function getAdminHomepage(): Promise<HomepageRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('homepage').select('*').eq('id', 1).maybeSingle()
  assertNoError('admin homepage', error)
  return data ?? null
}

export async function listAdminFaqs(): Promise<FaqRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .is('deleted_at', null)
    .order('category')
    .order('sort_order')
  assertNoError('admin faqs', error)
  return data ?? []
}

export async function listAdminTestimonials(): Promise<TestimonialRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
  assertNoError('admin testimonials', error)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Media, redirects, social, messages, admins
// ---------------------------------------------------------------------------

export async function listAdminMedia(
  options: AdminListOptions & { folder?: string } = {},
): Promise<AdminListResult<MediaRow>> {
  const supabase = await createClient()
  const { page, pageSize, from, to } = range({ ...options, pageSize: options.pageSize ?? 36 })

  let query = supabase.from('media').select('*', { count: 'exact' }).is('deleted_at', null)

  if (options.folder) query = query.eq('folder', options.folder)
  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${term}%,alt.ilike.%${term}%,path.ilike.%${term}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  assertNoError('admin media', error)
  return paginate(data ?? [], count ?? 0, page, pageSize)
}

export async function listMediaFolders(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('media').select('folder').is('deleted_at', null)
  assertNoError('media folders', error)
  return [...new Set((data ?? []).map((row) => row.folder))].sort()
}

export async function listAdminRedirects(): Promise<RedirectRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('redirects').select('*').order('source')
  assertNoError('admin redirects', error)
  return data ?? []
}

export async function listAdminSocialLinks(): Promise<SocialLinkRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('social_links').select('*').order('sort_order')
  assertNoError('admin social links', error)
  return data ?? []
}

export async function listAdminMessages(
  options: AdminListOptions = {},
): Promise<AdminListResult<ContactMessageRow>> {
  const supabase = await createClient()
  const { page, pageSize, from, to } = range(options)

  let query = supabase
    .from('contact_messages')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  const allowed = ['new', 'read', 'replied', 'archived', 'spam']
  if (options.status && allowed.includes(options.status)) {
    query = query.eq('status', options.status as ContactMessageRow['status'])
  }
  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,subject.ilike.%${term}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  assertNoError('admin messages', error)
  return paginate(data ?? [], count ?? 0, page, pageSize)
}

export async function listAdminUsers(): Promise<AdminRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .is('deleted_at', null)
    .order('created_at')
  assertNoError('admin users', error)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardStats {
  recipes: { total: number; published: number; drafts: number; scheduled: number }
  products: { total: number; published: number }
  media: number
  newMessages: number
  qr: { source: string; destination: string; scans: number; lastScanAt: string | null } | null
  topRecipes: { slug: string; title: string; views: number }[]
  recentEvents: { event_name: string; count: number }[]
}

/**
 * Dashboard counters.
 *
 * All `head: true` count queries, so Postgres returns numbers rather than
 * rows — the whole dashboard costs a handful of cheap counts even with
 * thousands of records.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const [
    recipesTotal,
    recipesPublished,
    recipesDrafts,
    recipesScheduled,
    productsTotal,
    productsPublished,
    mediaTotal,
    newMessages,
    qrRes,
    topRecipesRes,
  ] = await Promise.all([
    supabase.from('recipes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'published'),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'draft'),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'scheduled'),
    supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'published'),
    supabase.from('media').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'new'),
    supabase
      .from('redirects')
      .select('source, destination, scan_count, last_scan_at')
      .eq('source', 'go')
      .maybeSingle(),
    supabase
      .from('recipes')
      .select('slug, title, view_count')
      .is('deleted_at', null)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(5),
  ])

  const qr = qrRes.data
    ? {
        source: qrRes.data.source,
        destination: qrRes.data.destination,
        scans: qrRes.data.scan_count,
        lastScanAt: qrRes.data.last_scan_at,
      }
    : null

  return {
    recipes: {
      total: recipesTotal.count ?? 0,
      published: recipesPublished.count ?? 0,
      drafts: recipesDrafts.count ?? 0,
      scheduled: recipesScheduled.count ?? 0,
    },
    products: { total: productsTotal.count ?? 0, published: productsPublished.count ?? 0 },
    media: mediaTotal.count ?? 0,
    newMessages: newMessages.count ?? 0,
    qr,
    topRecipes: (topRecipesRes.data ?? []).map((row) => ({
      slug: row.slug,
      title: row.title,
      views: row.view_count,
    })),
    recentEvents: [],
  }
}

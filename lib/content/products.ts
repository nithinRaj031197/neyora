import 'server-only'

/**
 * Public product queries.
 *
 * Nothing here assumes mushrooms. `product_categories` is a first-class table
 * and every filter goes through it, so adding greens or honey is a content
 * change, not a code change.
 */
import { cache } from 'react'
import { createReadOnlyClient } from '@/lib/supabase/server'
import { assertNoError } from './errors'
import { nowIso } from './visibility'
import { isSupabaseConfigured } from '@/lib/env'
import type { CategoryRow, MediaRow, ProductRow } from '@/types/database'

const CARD_COLUMNS =
  'id, slug, name, short_description, category_id, weight_label, weight_grams, price, mrp, currency, availability, featured, sort_order, og_image_id, is_demo'

export interface ProductCard {
  id: string
  slug: string
  name: string
  short_description: string | null
  category_id: string | null
  weight_label: string | null
  weight_grams: number | null
  price: number | null
  mrp: number | null
  currency: string
  availability: ProductRow['availability']
  featured: boolean
  sort_order: number
  og_image_id: string | null
  is_demo: boolean
}

export interface ProductCardWithMedia extends ProductCard {
  cover: MediaRow | null
  category: Pick<CategoryRow, 'id' | 'slug' | 'name'> | null
}

export interface ProductDetail extends ProductRow {
  images: MediaRow[]
  og: MediaRow | null
  category: CategoryRow | null
}

export const getProductCategories = cache(async (): Promise<CategoryRow[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .order('sort_order')
  assertNoError('product_categories', error)
  return data ?? []
})

/**
 * A product's cover image is the primary row in `product_images`, which is a
 * separate table — so it needs its own resolution pass rather than a column.
 */
async function hydrateProductCards(rows: ProductCard[]): Promise<ProductCardWithMedia[]> {
  if (rows.length === 0) return []
  const supabase = createReadOnlyClient()
  const productIds = rows.map((r) => r.id)
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((v): v is string => !!v))]

  const [imgRes, catRes] = await Promise.all([
    supabase
      .from('product_images')
      .select('product_id, media_id, sort_order, is_primary, media(*)')
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true }),
    categoryIds.length
      ? supabase.from('product_categories').select('id, slug, name').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  assertNoError('product card images', imgRes.error)
  assertNoError('product card categories', catRes.error)

  const coverByProduct = new Map<string, MediaRow>()
  for (const row of imgRes.data ?? []) {
    const r = row as unknown as { product_id: string; media: MediaRow | null }
    if (r.media && !coverByProduct.has(r.product_id)) coverByProduct.set(r.product_id, r.media)
  }

  const cats = new Map(
    (catRes.data ?? []).map((c) => [c.id, c as Pick<CategoryRow, 'id' | 'slug' | 'name'>]),
  )

  return rows.map((r) => ({
    ...r,
    cover: coverByProduct.get(r.id) ?? null,
    category: r.category_id ? cats.get(r.category_id) ?? null : null,
  }))
}

export async function listProducts(
  options: { categorySlug?: string; featuredOnly?: boolean; limit?: number } = {},
): Promise<ProductCardWithMedia[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()

  let categoryId: string | null = null
  if (options.categorySlug) {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .not('published_at', 'is', null)
      .lte('published_at', nowIso())
      .maybeSingle()
    assertNoError('product category by slug', error)
    if (!data) return []
    categoryId = data.id
  }

  let query = supabase
    .from('products')
    .select(CARD_COLUMNS)
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (options.featuredOnly) query = query.eq('featured', true)

  const { data, error } = await query
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(options.limit ?? 48)

  assertNoError('products list', error)
  return hydrateProductCards((data ?? []) as unknown as ProductCard[])
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = createReadOnlyClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .maybeSingle()
  assertNoError('product by slug', error)
  if (!product) return null

  const [imgRes, catRes, ogRes] = await Promise.all([
    supabase
      .from('product_images')
      .select('media(*), sort_order, is_primary')
      .eq('product_id', product.id)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true }),
    product.category_id
      ? supabase.from('product_categories').select('*').eq('id', product.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    product.og_image_id
      ? supabase.from('media').select('*').eq('id', product.og_image_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  assertNoError('product images', imgRes.error)
  assertNoError('product category', catRes.error)
  assertNoError('product og image', ogRes.error)

  const images = (imgRes.data ?? [])
    .map((row) => (row as unknown as { media: MediaRow | null }).media)
    .filter((m): m is MediaRow => Boolean(m))

  return {
    ...product,
    images,
    og: (ogRes.data as MediaRow | null) ?? null,
    category: (catRes.data as CategoryRow | null) ?? null,
  }
})

export async function getAllPublishedProductSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('products')
    .select('slug, updated_at')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
  assertNoError('product slugs', error)
  return data ?? []
}

export function availabilityLabel(status: ProductRow['availability']): string {
  return {
    in_stock: 'In season',
    low_stock: 'Limited availability',
    out_of_stock: 'Currently unavailable',
    seasonal: 'Seasonal',
    coming_soon: 'Coming soon',
  }[status]
}

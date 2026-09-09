import 'server-only'

/**
 * Public recipe queries.
 *
 * Every one of these runs on the anon key, so Row Level Security — not this
 * code — is what guarantees a draft never leaks. The explicit `.eq('status',
 * 'published')` filters are belt and braces, and they let Postgres use the
 * partial indexes from migration 0003.
 */
import { cache } from 'react'
import { createReadOnlyClient } from '@/lib/supabase/server'
import { assertNoError } from './errors'
import { nowIso } from './visibility'
import { isSupabaseConfigured } from '@/lib/env'
import type {
  MediaRow,
  PackSize,
  RecipeCategoryRow,
  RecipePackVariantRow,
  RecipeRow,
  RecipeTagRow,
} from '@/types/database'

/** Columns a card needs. Recipe `body` can be tens of kilobytes — never list it. */
const CARD_COLUMNS =
  'id, slug, title, excerpt, cover_image_id, category_id, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, difficulty, recommended_pack_size, featured, sort_order, published_at, is_demo'

export interface RecipeCard {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_id: string | null
  category_id: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  total_time_minutes: number
  servings: number | null
  difficulty: RecipeRow['difficulty']
  recommended_pack_size: PackSize
  featured: boolean
  sort_order: number
  published_at: string | null
  is_demo: boolean
}

export interface RecipeCardWithMedia extends RecipeCard {
  cover: MediaRow | null
  category: Pick<RecipeCategoryRow, 'id' | 'slug' | 'name'> | null
}

export interface RecipeDetail extends RecipeRow {
  cover: MediaRow | null
  og: MediaRow | null
  category: RecipeCategoryRow | null
  tags: RecipeTagRow[]
  pack_variants: RecipePackVariantRow[]
}

export const getRecipeCategories = cache(async (): Promise<RecipeCategoryRow[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('recipe_categories')
    .select('*')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  assertNoError('recipe_categories', error)
  return data ?? []
})

export const getRecipeTags = cache(async (): Promise<RecipeTagRow[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase.from('recipe_tags').select('*').order('name')
  assertNoError('recipe_tags', error)
  return data ?? []
})

export interface RecipeListOptions {
  categorySlug?: string
  tagSlug?: string
  packSize?: PackSize
  featuredOnly?: boolean
  search?: string
  limit?: number
  offset?: number
  excludeSlug?: string
}

export interface RecipeListResult {
  recipes: RecipeCardWithMedia[]
  total: number
}

/**
 * Hydrates cards with their cover image and category in two extra queries
 * total — not two per card. `!inner` on the tag join is what lets Postgres
 * filter by tag inside the same statement.
 */
async function hydrateCards(rows: RecipeCard[]): Promise<RecipeCardWithMedia[]> {
  if (rows.length === 0) return []

  const supabase = createReadOnlyClient()
  const mediaIds = [...new Set(rows.map((r) => r.cover_image_id).filter((v): v is string => !!v))]
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((v): v is string => !!v))]

  const [mediaRes, catRes] = await Promise.all([
    mediaIds.length
      ? supabase.from('media').select('*').in('id', mediaIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as MediaRow[], error: null }),
    categoryIds.length
      ? supabase.from('recipe_categories').select('id, slug, name').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  assertNoError('recipe card media', mediaRes.error)
  assertNoError('recipe card categories', catRes.error)

  const media = new Map((mediaRes.data ?? []).map((m) => [m.id, m as MediaRow]))
  const cats = new Map(
    (catRes.data ?? []).map((c) => [
      c.id,
      c as Pick<RecipeCategoryRow, 'id' | 'slug' | 'name'>,
    ]),
  )

  return rows.map((r) => ({
    ...r,
    cover: r.cover_image_id ? media.get(r.cover_image_id) ?? null : null,
    category: r.category_id ? cats.get(r.category_id) ?? null : null,
  }))
}

export async function listRecipes(options: RecipeListOptions = {}): Promise<RecipeListResult> {
  if (!isSupabaseConfigured()) return { recipes: [], total: 0 }

  const {
    categorySlug,
    tagSlug,
    packSize,
    featuredOnly,
    search,
    limit = 24,
    offset = 0,
    excludeSlug,
  } = options

  const supabase = createReadOnlyClient()

  // Resolve slug filters to ids first — one cheap query each, and it keeps the
  // main query index-friendly.
  let categoryId: string | null = null
  if (categorySlug) {
    const { data, error } = await supabase
      .from('recipe_categories')
      .select('id')
      .eq('slug', categorySlug)
      .not('published_at', 'is', null)
      .lte('published_at', nowIso())
      .maybeSingle()
    assertNoError('recipe category by slug', error)
    if (!data) return { recipes: [], total: 0 }
    categoryId = data.id
  }

  let query = tagSlug
    ? supabase
        .from('recipes')
        .select(`${CARD_COLUMNS}, recipe_tag_map!inner(tag_id, recipe_tags!inner(slug))`, {
          count: 'exact',
        })
        .eq('recipe_tag_map.recipe_tags.slug', tagSlug)
    : supabase.from('recipes').select(CARD_COLUMNS, { count: 'exact' })

  query = query
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (packSize) query = query.eq('recommended_pack_size', packSize)
  if (featuredOnly) query = query.eq('featured', true)
  if (excludeSlug) query = query.neq('slug', excludeSlug)
  if (search?.trim()) {
    const term = search.trim().replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`)
  }

  const { data, error, count } = await query
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  assertNoError('recipes list', error)

  const rows = (data ?? []) as unknown as RecipeCard[]
  return { recipes: await hydrateCards(rows), total: count ?? rows.length }
}

export const getRecipeBySlug = cache(async (slug: string): Promise<RecipeDetail | null> => {
  if (!isSupabaseConfigured()) return null

  const supabase = createReadOnlyClient()
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .maybeSingle()
  assertNoError('recipe by slug', error)
  if (!recipe) return null

  const mediaIds = [recipe.cover_image_id, recipe.og_image_id].filter(
    (v): v is string => Boolean(v),
  )

  const [mediaRes, catRes, tagRes, variantRes] = await Promise.all([
    mediaIds.length
      ? supabase.from('media').select('*').in('id', mediaIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as MediaRow[], error: null }),
    recipe.category_id
      ? supabase.from('recipe_categories').select('*').eq('id', recipe.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('recipe_tag_map').select('recipe_tags(*)').eq('recipe_id', recipe.id),
    supabase
      .from('recipe_pack_variants')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('pack_size'),
  ])

  assertNoError('recipe media', mediaRes.error)
  assertNoError('recipe category', catRes.error)
  assertNoError('recipe tags', tagRes.error)
  assertNoError('recipe pack variants', variantRes.error)

  const media = new Map((mediaRes.data ?? []).map((m) => [m.id, m as MediaRow]))
  const tags = (tagRes.data ?? [])
    .map((row) => (row as { recipe_tags: RecipeTagRow | null }).recipe_tags)
    .filter((t): t is RecipeTagRow => Boolean(t))

  return {
    ...recipe,
    cover: recipe.cover_image_id ? media.get(recipe.cover_image_id) ?? null : null,
    og: recipe.og_image_id ? media.get(recipe.og_image_id) ?? null : null,
    category: (catRes.data as RecipeCategoryRow | null) ?? null,
    tags,
    pack_variants: (variantRes.data ?? []) as RecipePackVariantRow[],
  }
})

export const getRecipeCategoryBySlug = cache(
  async (slug: string): Promise<RecipeCategoryRow | null> => {
    if (!isSupabaseConfigured()) return null
    const supabase = createReadOnlyClient()
    const { data, error } = await supabase
      .from('recipe_categories')
      .select('*')
      .eq('slug', slug)
      .not('published_at', 'is', null)
      .lte('published_at', nowIso())
      .is('deleted_at', null)
      .maybeSingle()
    assertNoError('recipe category by slug', error)
    return data ?? null
  },
)

/** Same category first, then anything else recent. Never the current recipe. */
export async function getRelatedRecipes(
  recipe: Pick<RecipeRow, 'slug' | 'category_id'>,
  limit = 3,
): Promise<RecipeCardWithMedia[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()

  const base = supabase
    .from('recipes')
    .select(CARD_COLUMNS)
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .neq('slug', recipe.slug)

  const { data: sameCategory, error } = recipe.category_id
    ? await base
        .eq('category_id', recipe.category_id)
        .order('published_at', { ascending: false })
        .limit(limit)
    : { data: [], error: null }
  assertNoError('related recipes (category)', error)

  let rows = (sameCategory ?? []) as unknown as RecipeCard[]

  if (rows.length < limit) {
    const exclude = [recipe.slug, ...rows.map((r) => r.slug)]
    const { data: fill, error: fillError } = await supabase
      .from('recipes')
      .select(CARD_COLUMNS)
      .not('published_at', 'is', null)
      .lte('published_at', nowIso())
      .is('deleted_at', null)
      .not('slug', 'in', `(${exclude.map((s) => `"${s}"`).join(',')})`)
      .order('published_at', { ascending: false })
      .limit(limit - rows.length)
    assertNoError('related recipes (fill)', fillError)
    rows = [...rows, ...((fill ?? []) as unknown as RecipeCard[])]
  }

  return hydrateCards(rows)
}

/** Slugs for sitemap.xml. */
export async function getAllPublishedRecipeSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('recipes')
    .select('slug, updated_at')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .eq('noindex', false)
    .order('published_at', { ascending: false })
  assertNoError('recipe slugs', error)
  return data ?? []
}

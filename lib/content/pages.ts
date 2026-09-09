import 'server-only'

/**
 * Editorial pages, the homepage singleton, FAQs and testimonials.
 */
import { cache } from 'react'
import { createReadOnlyClient } from '@/lib/supabase/server'
import { assertNoError } from './errors'
import { nowIso } from './visibility'
import { isSupabaseConfigured } from '@/lib/env'
import type { FaqRow, HomepageRow, MediaRow, PageRow, TestimonialRow } from '@/types/database'

export interface PageWithMedia extends PageRow {
  hero: MediaRow | null
  og: MediaRow | null
}

export const getPageBySlug = cache(async (slug: string): Promise<PageWithMedia | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = createReadOnlyClient()

  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .maybeSingle()
  assertNoError(`page ${slug}`, error)
  if (!page) return null

  const ids = [page.hero_image_id, page.og_image_id].filter((v): v is string => Boolean(v))
  if (ids.length === 0) return { ...page, hero: null, og: null }

  const { data: media, error: mediaError } = await supabase
    .from('media')
    .select('*')
    .in('id', ids)
    .is('deleted_at', null)
  assertNoError(`page ${slug} media`, mediaError)

  const map = new Map((media ?? []).map((m) => [m.id, m]))
  return {
    ...page,
    hero: page.hero_image_id ? map.get(page.hero_image_id) ?? null : null,
    og: page.og_image_id ? map.get(page.og_image_id) ?? null : null,
  }
})

export const getHomepage = cache(async (): Promise<HomepageRow | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase.from('homepage').select('*').eq('id', 1).maybeSingle()
  assertNoError('homepage', error)
  return data ?? null
})

export const getFaqs = cache(async (): Promise<FaqRow[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .is('deleted_at', null)
    .order('category')
    .order('sort_order')
  assertNoError('faqs', error)
  return data ?? []
})

/** Groups FAQs by category, first-appearance order preserved. */
export function groupFaqs(faqs: FaqRow[]): { category: string; items: FaqRow[] }[] {
  const groups: { category: string; items: FaqRow[] }[] = []
  for (const faq of faqs) {
    const existing = groups.find((g) => g.category === faq.category)
    if (existing) existing.items.push(faq)
    else groups.push({ category: faq.category, items: [faq] })
  }
  return groups
}

export const getTestimonials = cache(
  async (options: { featuredOnly?: boolean; limit?: number } = {}): Promise<TestimonialRow[]> => {
    if (!isSupabaseConfigured()) return []
    const supabase = createReadOnlyClient()
    let query = supabase
      .from('testimonials')
      .select('*')
      .not('published_at', 'is', null)
      .lte('published_at', nowIso())
      .is('deleted_at', null)
    if (options.featuredOnly) query = query.eq('featured', true)
    const { data, error } = await query.order('sort_order').limit(options.limit ?? 12)
    assertNoError('testimonials', error)
    return data ?? []
  },
)

export async function getAllPublishedPageSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('pages')
    .select('slug, updated_at')
    .not('published_at', 'is', null)
    .lte('published_at', nowIso())
    .eq('noindex', false)
    .is('deleted_at', null)
  assertNoError('page slugs', error)
  return data ?? []
}

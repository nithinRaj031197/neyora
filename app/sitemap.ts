import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/env'
import {
  getAllPages,
  getPublishedProducts,
  getPublishedRecipes,
  getRecipeCategories,
} from '@/lib/content'

/**
 * Sitemap, built from the content files.
 *
 * Pages flagged `noindex` are excluded: listing a URL here while telling
 * robots not to index it is a contradiction search engines report as an error.
 */

/** Slugs whose content is served by a route with a different path. */
const SLUG_TO_PATH: Record<string, string> = {
  'faq-intro': '/faq',
  'contact-intro': '/contact',
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/products'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/recipes'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  for (const page of getAllPages()) {
    if (page.seo?.noindex) continue
    const path = SLUG_TO_PATH[page.slug] ?? `/${page.slug}`
    entries.push({
      url: absoluteUrl(path),
      lastModified: page.updatedAt ? new Date(page.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: path === '/about' || path === '/farm' ? 0.7 : 0.5,
    })
  }

  for (const product of await getPublishedProducts()) {
    entries.push({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const category of getRecipeCategories()) {
    entries.push({
      url: absoluteUrl(`/recipes/category/${category.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  for (const recipe of getPublishedRecipes()) {
    if (recipe.seo?.noindex) continue
    entries.push({
      url: absoluteUrl(`/recipes/${recipe.slug}`),
      lastModified: recipe.updatedAt ? new Date(recipe.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // De-duplicate: a page could share a path with a hardcoded entry above.
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const url = String(entry.url)
    if (seen.has(url)) return false
    seen.add(url)
    return true
  })
}

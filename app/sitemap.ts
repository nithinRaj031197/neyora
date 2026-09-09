import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/env'
import { getAllPublishedRecipeSlugs, getRecipeCategories } from '@/lib/content/recipes'
import { getAllPublishedProductSlugs } from '@/lib/content/products'
import { getAllPublishedPageSlugs } from '@/lib/content/pages'

/**
 * Dynamic sitemap.
 *
 * Built from the database, so publishing a recipe puts it in the sitemap with
 * no deploy. Pages flagged `noindex` are excluded by the queries themselves —
 * listing a URL here while telling robots not to index it is a contradiction
 * search engines report as an error.
 *
 * Revalidated hourly: frequent enough for new content, cheap enough that a
 * crawler cannot turn it into a database load problem.
 */
export const revalidate = 3600

/** Slugs whose content is surfaced by a route with a different path. */
const SLUG_TO_PATH: Record<string, string> = {
  'faq-intro': '/faq',
  'contact-intro': '/contact',
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const [recipes, products, pages, recipeCategories] = await Promise.all([
    getAllPublishedRecipeSlugs(),
    getAllPublishedProductSlugs(),
    getAllPublishedPageSlugs(),
    getRecipeCategories(),
  ])

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/products'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/recipes'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  for (const page of pages) {
    const path = SLUG_TO_PATH[page.slug] ?? `/${page.slug}`
    entries.push({
      url: absoluteUrl(path),
      lastModified: new Date(page.updated_at),
      changeFrequency: 'monthly',
      priority: path === '/about' || path === '/farm' ? 0.7 : 0.5,
    })
  }

  for (const product of products) {
    entries.push({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: new Date(product.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const category of recipeCategories) {
    entries.push({
      url: absoluteUrl(`/recipes/category/${category.slug}`),
      lastModified: new Date(category.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  for (const recipe of recipes) {
    entries.push({
      url: absoluteUrl(`/recipes/${recipe.slug}`),
      lastModified: new Date(recipe.updated_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // De-duplicate: a page row could share a path with a hardcoded entry above.
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const url = String(entry.url)
    if (seen.has(url)) return false
    seen.add(url)
    return true
  })
}

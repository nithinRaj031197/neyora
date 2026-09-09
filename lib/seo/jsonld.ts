import 'server-only'

/**
 * JSON-LD structured data builders.
 *
 * Recipe markup is the reason this file matters commercially: it is what makes
 * a recipe eligible for Google's rich results, and it needs the *structured*
 * ingredient and step arrays — the Markdown body alone cannot produce it.
 * That is why the schema stores both representations.
 */
import { absoluteUrl } from '@/lib/env'
import { excerptFromMarkdown, markdownToPlainText } from '@/lib/markdown/plain'
import { isoDuration } from '@/lib/utils/format'
import { bestFallbackSrc } from '@/lib/media'
import { formatQuantity } from '@/lib/utils/format'
import type {
  FaqRow,
  MediaRow,
  ProductRow,
  RecipeCategoryRow,
  RecipeRow,
  RecipeTagRow,
  SiteSettingsRow,
  SocialLinkRow,
} from '@/types/database'

type Json = Record<string, unknown>

function abs(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('http') ? url : absoluteUrl(url)
}

function imageUrls(...media: (MediaRow | null | undefined)[]): string[] {
  return media
    .filter((m): m is MediaRow => Boolean(m))
    .map((m) => abs(bestFallbackSrc(m)))
    .filter((u): u is string => Boolean(u))
}

export function organizationJsonLd(
  settings: SiteSettingsRow,
  socials: SocialLinkRow[],
  logo?: MediaRow | null,
): Json {
  const address = [
    settings.address_line1,
    settings.address_line2,
    settings.city,
    settings.state,
    settings.postal_code,
    settings.country,
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${absoluteUrl('/')}#organization`,
    name: settings.brand_name,
    legalName: settings.organization_legal_name ?? settings.brand_name,
    slogan: settings.tagline || undefined,
    description: settings.brand_description ?? settings.default_seo_description ?? undefined,
    url: absoluteUrl('/'),
    logo: logo ? abs(bestFallbackSrc(logo)) : abs('/brand/neyora-mark.svg'),
    ...(address.length
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress:
              [settings.address_line1, settings.address_line2].filter(Boolean).join(', ') ||
              undefined,
            addressLocality: settings.city ?? undefined,
            addressRegion: settings.state ?? undefined,
            postalCode: settings.postal_code ?? undefined,
            addressCountry: settings.country ?? undefined,
          },
        }
      : {}),
    ...(settings.contact_email || settings.contact_phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: settings.contact_email ?? undefined,
            telephone: settings.contact_phone ?? undefined,
            availableLanguage: ['en'],
          },
        }
      : {}),
    sameAs: socials.filter((s) => s.enabled && s.url).map((s) => s.url),
  }
}

export function websiteJsonLd(settings: SiteSettingsRow): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: settings.brand_name,
    url: absoluteUrl('/'),
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
    inLanguage: 'en',
  }
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/**
 * Recipe markup.
 *
 * Google requires recipeIngredient as flat strings and recipeInstructions as
 * HowToStep objects. We build both from the structured JSONB, so what a
 * search engine sees is exactly what the page shows.
 */
export function recipeJsonLd(args: {
  recipe: RecipeRow
  cover: MediaRow | null
  category: RecipeCategoryRow | null
  tags: RecipeTagRow[]
  settings: SiteSettingsRow
}): Json {
  const { recipe, cover, category, tags, settings } = args
  const url = absoluteUrl(`/recipes/${recipe.slug}`)

  const ingredientStrings = recipe.ingredients.map((ing) =>
    [formatQuantity(ing.qty), ing.unit, ing.item, ing.note ? `(${ing.note})` : '']
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )

  const instructions = recipe.steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.title || `Step ${index + 1}`,
    text: step.body,
    url: `${url}#step-${index + 1}`,
  }))

  const nutrition = recipe.nutrition?.per ?? []
  const nutritionFact = (label: string) =>
    nutrition.find((n) => n.label.toLowerCase().includes(label))

  const energy = nutritionFact('energy') ?? nutritionFact('calorie')
  const protein = nutritionFact('protein')
  const carbs = nutritionFact('carbohydrate')
  const fat = nutritionFact('fat')
  const fibre = nutritionFact('fibre') ?? nutritionFact('fiber')

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${url}#recipe`,
    name: recipe.title,
    description: recipe.excerpt || excerptFromMarkdown(recipe.body, 300),
    image: imageUrls(cover),
    url,
    author: { '@type': 'Organization', name: settings.brand_name, url: absoluteUrl('/') },
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
    datePublished: recipe.published_at ?? undefined,
    dateModified: recipe.updated_at,
    prepTime: isoDuration(recipe.prep_time_minutes),
    cookTime: isoDuration(recipe.cook_time_minutes),
    totalTime: isoDuration(recipe.total_time_minutes),
    recipeYield: recipe.servings
      ? `${recipe.servings} ${recipe.servings === 1 ? 'serving' : 'servings'}`
      : undefined,
    recipeCategory: category?.name ?? recipe.course ?? undefined,
    recipeCuisine: recipe.cuisine ?? undefined,
    keywords: tags.map((t) => t.name).join(', ') || undefined,
    suitableForDiet: tags.some((t) => t.slug === 'vegetarian')
      ? 'https://schema.org/VegetarianDiet'
      : undefined,
    recipeIngredient: ingredientStrings.filter(Boolean),
    recipeInstructions: instructions.length > 0 ? instructions : undefined,
    ...(energy || protein
      ? {
          nutrition: {
            '@type': 'NutritionInformation',
            calories: energy ? `${energy.value} ${energy.unit || 'kcal'}`.trim() : undefined,
            proteinContent: protein ? `${protein.value} ${protein.unit || 'g'}`.trim() : undefined,
            carbohydrateContent: carbs ? `${carbs.value} ${carbs.unit || 'g'}`.trim() : undefined,
            fatContent: fat ? `${fat.value} ${fat.unit || 'g'}`.trim() : undefined,
            fiberContent: fibre ? `${fibre.value} ${fibre.unit || 'g'}`.trim() : undefined,
            servingSize: recipe.nutrition?.basis ?? undefined,
          },
        }
      : {}),
    // Deliberately no aggregateRating: inventing review counts to win a star
    // rating in search results is a policy violation and a lie.
  }
}

export function productJsonLd(args: {
  product: ProductRow
  images: MediaRow[]
  settings: SiteSettingsRow
}): Json {
  const { product, images, settings } = args
  const url = absoluteUrl(`/products/${product.slug}`)

  const availability = {
    in_stock: 'https://schema.org/InStock',
    low_stock: 'https://schema.org/LimitedAvailability',
    out_of_stock: 'https://schema.org/OutOfStock',
    seasonal: 'https://schema.org/LimitedAvailability',
    coming_soon: 'https://schema.org/PreOrder',
  }[product.availability]

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: product.short_description || excerptFromMarkdown(product.description, 300),
    image: imageUrls(...images),
    url,
    sku: product.slug,
    brand: { '@type': 'Brand', name: settings.brand_name },
    category: product.category_id ? undefined : undefined,
    ...(product.weight_grams
      ? {
          weight: {
            '@type': 'QuantitativeValue',
            value: product.weight_grams,
            unitCode: 'GRM',
          },
        }
      : {}),
    ...(product.variety ? { additionalProperty: [
      { '@type': 'PropertyValue', name: 'Variety', value: product.variety },
    ] } : {}),
    ...(product.price !== null
      ? {
          offers: {
            '@type': 'Offer',
            url,
            price: product.price,
            priceCurrency: product.currency,
            availability,
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': `${absoluteUrl('/')}#organization` },
          },
        }
      : {}),
  }
}

export function faqJsonLd(faqs: FaqRow[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: markdownToPlainText(faq.answer) },
    })),
  }
}

export function articleJsonLd(args: {
  title: string
  description: string
  path: string
  image: MediaRow | null
  publishedAt: string | null
  modifiedAt: string
  settings: SiteSettingsRow
}): Json {
  const { title, description, path, image, publishedAt, modifiedAt, settings } = args
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: imageUrls(image),
    url: absoluteUrl(path),
    datePublished: publishedAt ?? undefined,
    dateModified: modifiedAt,
    author: { '@type': 'Organization', name: settings.brand_name },
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
  }
}

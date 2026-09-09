import 'server-only'

/**
 * JSON-LD structured data builders.
 *
 * Recipe markup is the reason this file matters commercially: it makes a
 * recipe eligible for Google's rich results, and it needs the *structured*
 * ingredient and step arrays. The Markdown body alone cannot produce it —
 * which is why the content model stores both.
 */
import { absoluteUrl } from '@/lib/env'
import { excerptFromMarkdown, markdownToPlainText } from '@/lib/markdown/plain'
import { formatQuantity, isoDuration } from '@/lib/utils/format'
import type {
  Category,
  Faq,
  Image,
  Page,
  Product,
  Recipe,
  SiteSettings,
  SocialLink,
} from '@/types/content'

type Json = Record<string, unknown>

function abs(path?: string): string | undefined {
  if (!path) return undefined
  return path.startsWith('http') ? path : absoluteUrl(path)
}

function imageUrls(...images: (Image | undefined)[]): string[] {
  return images.filter((i): i is Image => Boolean(i)).map((i) => abs(i.src)!) 
}

export function organizationJsonLd(settings: SiteSettings, socials: SocialLink[]): Json {
  const { address } = settings
  const hasAddress = Object.values(address).some(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${absoluteUrl('/')}#organization`,
    name: settings.brandName,
    legalName: settings.seo.organizationLegalName ?? settings.brandName,
    slogan: settings.tagline || undefined,
    description: settings.brandDescription ?? settings.seo.defaultDescription,
    url: absoluteUrl('/'),
    logo: abs(settings.seo.defaultOgImage ?? '/brand/neyora-mark.svg'),
    ...(hasAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: [address.line1, address.line2].filter(Boolean).join(', ') || undefined,
            addressLocality: address.city,
            addressRegion: address.state,
            postalCode: address.postalCode,
            addressCountry: address.country,
          },
        }
      : {}),
    ...(settings.contactEmail || settings.contactPhone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: settings.contactEmail,
            telephone: settings.contactPhone,
            availableLanguage: ['en'],
          },
        }
      : {}),
    sameAs: socials.filter((s) => s.enabled && s.url).map((s) => s.url),
  }
}

export function websiteJsonLd(settings: SiteSettings): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: settings.brandName,
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
 * Google requires `recipeIngredient` as flat strings and `recipeInstructions`
 * as HowToStep objects with per-step anchors. Both are built from the
 * structured arrays, so what a search engine sees is exactly what the page
 * shows.
 */
export function recipeJsonLd(args: {
  recipe: Recipe
  category: Category | null
  settings: SiteSettings
}): Json {
  const { recipe, category, settings } = args
  const url = absoluteUrl(`/recipes/${recipe.slug}`)

  const ingredientStrings = recipe.ingredients
    .map((ing) =>
      [formatQuantity(ing.qty), ing.unit, ing.item, ing.note ? `(${ing.note})` : '']
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)

  const instructions = recipe.steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.title || `Step ${index + 1}`,
    text: step.body,
    url: `${url}#step-${index + 1}`,
  }))

  const facts = recipe.nutrition?.per ?? []
  const fact = (label: string) => facts.find((n) => n.label.toLowerCase().includes(label))

  const energy = fact('energy') ?? fact('calorie')
  const protein = fact('protein')
  const carbs = fact('carbohydrate')
  const fat = fact('fat')
  const fibre = fact('fibre') ?? fact('fiber')

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${url}#recipe`,
    name: recipe.title,
    description: recipe.excerpt || excerptFromMarkdown(recipe.body, 300),
    image: imageUrls(recipe.cover),
    url,
    author: { '@type': 'Organization', name: settings.brandName, url: absoluteUrl('/') },
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
    datePublished: recipe.publishedAt,
    dateModified: recipe.updatedAt ?? recipe.publishedAt,
    prepTime: isoDuration(recipe.prepTimeMinutes),
    cookTime: isoDuration(recipe.cookTimeMinutes),
    totalTime: isoDuration(recipe.totalTimeMinutes),
    recipeYield: recipe.servings
      ? `${recipe.servings} ${recipe.servings === 1 ? 'serving' : 'servings'}`
      : undefined,
    recipeCategory: category?.name ?? recipe.course,
    recipeCuisine: recipe.cuisine,
    keywords: recipe.tags.join(', ') || undefined,
    suitableForDiet: recipe.tags.includes('vegetarian')
      ? 'https://schema.org/VegetarianDiet'
      : undefined,
    recipeIngredient: ingredientStrings,
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
            servingSize: recipe.nutrition?.basis,
          },
        }
      : {}),
    // Deliberately no aggregateRating: inventing review counts to win a star
    // rating in search results is a policy violation and a lie.
  }
}

export function productJsonLd(args: { product: Product; settings: SiteSettings }): Json {
  const { product, settings } = args
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
    description: product.shortDescription || excerptFromMarkdown(product.body, 300),
    image: imageUrls(...product.images),
    url,
    sku: product.slug,
    brand: { '@type': 'Brand', name: settings.brandName },
    ...(product.weightGrams
      ? { weight: { '@type': 'QuantitativeValue', value: product.weightGrams, unitCode: 'GRM' } }
      : {}),
    ...(product.variety
      ? {
          additionalProperty: [
            { '@type': 'PropertyValue', name: 'Variety', value: product.variety },
          ],
        }
      : {}),
    ...(product.price !== undefined
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

export function faqJsonLd(faqs: Faq[]): Json {
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

export function articleJsonLd(args: { page: Page; settings: SiteSettings; path: string }): Json {
  const { page, settings, path } = args
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.seo?.description || page.subtitle || excerptFromMarkdown(page.body),
    image: imageUrls(page.hero),
    url: absoluteUrl(path),
    datePublished: page.publishedAt,
    dateModified: page.updatedAt ?? page.publishedAt,
    author: { '@type': 'Organization', name: settings.brandName },
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
  }
}

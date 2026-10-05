import type { Metadata } from 'next'
import { Hero } from '@/components/home/Hero'
import { Nature } from '@/components/home/Nature'
import { Mushroom } from '@/components/home/Mushroom'
import { Journey } from '@/components/home/Journey'
import { ProductMoment } from '@/components/home/ProductMoment'
import { Food } from '@/components/home/Food'
import { Quality } from '@/components/home/Quality'
import { FinalFrame } from '@/components/home/FinalFrame'
import {
  getHomepage,
  getHomepageVisibility,
  getProductBySlug,
  getPublishedProducts,
  getRecipeCategories,
  getSiteSettings,
  getTestimonials,
  queryRecipes,
  whatsappLink,
} from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * The homepage — eight public V1 visual chapters.
 *
 * This file is assembly only. Every word, image and button label comes from
 * content/homepage.yml; each chapter owns its own composition; and the
 * light → dark → light rhythm is the order below:
 *
 *   01 Hero          dark, full viewport
 *   02 From nature   warm ivory, widening reveal
 *   03 The mushroom  dark, macro, nearly still
 *   04 The journey   beige, sticky four-stage sequence
 *   05 The product   warm ivory, large, buyable
 *   06 Food          dark, cinematic, editorial recipes
 *   07 Quality       warm ivory, calm
 *   08 Final frame   dark, the closing shot
 *
 * The Farm chapter remains implemented and content-driven, but is hidden from
 * the public V1 homepage until the farm story is ready to re-open.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const home = getHomepage()

  return buildMetadata({
    title: settings.seo.defaultTitle ?? settings.brandName,
    image: home.hero.image,
    seo: home.seo,
    path: '/',
    settings,
    // The homepage title is already the brand; appending it would repeat.
    appendBrand: false,
  })
}

export default async function HomePage() {
  const settings = await getSiteSettings()
  const home = getHomepage()

  /*
   * Visibility is a separate read because an admin can switch a chapter off
   * without a deploy. The file's own `enabled` flag is still the default; this
   * only overrides it, so the page renders correctly with no database.
   */
  const show = await getHomepageVisibility()

  // The featured product: the one named in the chapter, else the first
  // featured one, else simply the first published. Never an empty chapter.
  const product =
    (home.product.productSlug ? await getProductBySlug(home.product.productSlug) : null) ??
    (await getPublishedProducts())[0] ??
    null

  // Every variety on sale, so the homepage can introduce both rather than
  // leaving the second one to be found in the shop.
  const varieties = (await getPublishedProducts())
    .filter((p) => p.varietyLabel && p.category === product?.category)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const recipes = show.food ? queryRecipes({ limit: 3 }).recipes : []
  const recipeCategories = getRecipeCategories()
  const testimonial = getTestimonials({ featuredOnly: true, limit: 1 })[0]

  return (
    <div className="neyora-home">
      {show.hero ? <Hero hero={home.hero} /> : null}

      {show.nature ? (
        // Nutrition comes from the product, not a second copy in the
        // homepage file — one place to correct when the lab report lands.
        <Nature nature={home.nature} nutrition={product?.nutrition} />
      ) : null}

      {show.mushroom ? <Mushroom mushroom={home.mushroom} /> : null}

      {show.journey ? <Journey journey={home.journey} /> : null}

      {show.product && product ? (
        <ProductMoment
          chapter={home.product}
          product={product}
          varieties={varieties}
          whatsapp={await whatsappLink(
            `Hi ${settings.brandName}, I would like to order ${product.name}${
              product.weightLabel ? ` (${product.weightLabel})` : ''
            }.`,
          )}
        />
      ) : null}

      {show.food && recipes.length > 0 ? (
        <Food food={home.food} recipes={recipes} categories={recipeCategories} />
      ) : null}

      {show.quality ? (
        <Quality quality={home.quality} testimonial={testimonial} />
      ) : null}

      {show.finalCta ? (
        <FinalFrame
          finalCta={home.finalCta}
          brandName={settings.brandName}
          tagline={settings.tagline}
        />
      ) : null}
    </div>
  )
}

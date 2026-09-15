import type { Metadata } from 'next'
import { Hero } from '@/components/home/Hero'
import { Nature } from '@/components/home/Nature'
import { Mushroom } from '@/components/home/Mushroom'
import { Journey } from '@/components/home/Journey'
import { ProductMoment } from '@/components/home/ProductMoment'
import { Food } from '@/components/home/Food'
import { Farm } from '@/components/home/Farm'
import { Quality } from '@/components/home/Quality'
import { FinalFrame } from '@/components/home/FinalFrame'
import {
  getHomepage,
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
 * The homepage — nine visual chapters.
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
 *   07 The farm      earthy, quiet
 *   08 Quality       warm ivory, calm
 *   09 Final frame   dark, the closing shot
 */
export function generateMetadata(): Metadata {
  const settings = getSiteSettings()
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

export default function HomePage() {
  const settings = getSiteSettings()
  const home = getHomepage()

  // The featured product: the one named in the chapter, else the first
  // featured one, else simply the first published. Never an empty chapter.
  const product =
    (home.product.productSlug ? getProductBySlug(home.product.productSlug) : null) ??
    getPublishedProducts()[0] ??
    null

  const recipes = home.food.enabled ? queryRecipes({ limit: 3 }).recipes : []
  const recipeCategories = getRecipeCategories()
  const testimonial = getTestimonials({ featuredOnly: true, limit: 1 })[0]

  return (
    <>
      {home.hero.enabled ? <Hero hero={home.hero} /> : null}

      {home.nature.enabled ? <Nature nature={home.nature} /> : null}

      {home.mushroom.enabled ? <Mushroom mushroom={home.mushroom} /> : null}

      {home.journey.enabled ? <Journey journey={home.journey} /> : null}

      {home.product.enabled && product ? (
        <ProductMoment
          chapter={home.product}
          product={product}
          whatsapp={whatsappLink(
            `Hi ${settings.brandName}, I would like to order ${product.name}${
              product.weightLabel ? ` (${product.weightLabel})` : ''
            }.`,
          )}
        />
      ) : null}

      {home.food.enabled && recipes.length > 0 ? (
        <Food food={home.food} recipes={recipes} categories={recipeCategories} />
      ) : null}

      {home.farm.enabled ? <Farm farm={home.farm} /> : null}

      {home.quality.enabled ? (
        <Quality quality={home.quality} testimonial={testimonial} />
      ) : null}

      {home.finalCta.enabled ? (
        <FinalFrame
          finalCta={home.finalCta}
          brandName={settings.brandName}
          tagline={settings.tagline}
        />
      ) : null}
    </>
  )
}

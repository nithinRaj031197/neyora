import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeader } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/Button'
import { Picture } from '@/components/ui/Picture'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { Wordmark } from '@/components/ui/Wordmark'
import { RecipeCard } from '@/components/public/RecipeCard'
import { ProductCard } from '@/components/public/ProductCard'
import {
  getHomepage,
  getProductCategories,
  getRecipeCategories,
  getSiteSettings,
  getSocialLinks,
  getTestimonials,
  queryProducts,
  queryRecipes,
} from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * Homepage.
 *
 * Every headline, paragraph, CTA label and image comes from
 * content/homepage.yml. There is no marketing copy in this file.
 */
export function generateMetadata(): Metadata {
  const settings = getSiteSettings()
  const homepage = getHomepage()

  return buildMetadata({
    title: settings.seo.defaultTitle ?? settings.brandName,
    image: homepage.hero.image,
    seo: homepage.seo,
    path: '/',
    settings,
    // The homepage title is already the brand; appending it would repeat.
    appendBrand: false,
  })
}

export default function HomePage() {
  const home = getHomepage()
  const socials = getSocialLinks()

  const products = home.products.enabled ? queryProducts({ limit: 3 }) : []
  const recipes = home.recipes.enabled ? queryRecipes({ limit: 3 }).recipes : []
  const testimonials = home.community.enabled
    ? getTestimonials({ featuredOnly: true, limit: 3 })
    : []

  const recipeCategories = getRecipeCategories()
  const productCategories = getProductCategories()

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative border-b border-beige bg-ivory" aria-labelledby="hero-heading">
        <Container size="wide" className="pt-16 pb-0 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="animate-rise">
              {home.hero.eyebrow ? <p className="eyebrow">{home.hero.eyebrow}</p> : null}

              <h1 id="hero-heading" className="mt-6">
                <Wordmark
                  as="span"
                  brandName={home.hero.headline}
                  className="text-(length:--text-display-xl) leading-[0.9]"
                />
                {home.hero.subheadline ? (
                  <span className="mt-4 block font-display text-(length:--text-display-md) leading-none font-light tracking-[0.06em] text-earth-soft">
                    {home.hero.subheadline}
                  </span>
                ) : null}
              </h1>

              {home.hero.description ? (
                <p className="animate-rise animate-rise-delay-1 mt-8 max-w-[50ch] text-[1.125rem] leading-relaxed text-earth-soft">
                  {home.hero.description}
                </p>
              ) : null}

              <div className="animate-rise animate-rise-delay-2 mt-10 flex flex-wrap gap-3">
                {home.hero.ctaLabel && home.hero.ctaHref ? (
                  <ButtonLink href={home.hero.ctaHref} size="lg">
                    {home.hero.ctaLabel}
                  </ButtonLink>
                ) : null}
                {home.hero.secondaryCtaLabel && home.hero.secondaryCtaHref ? (
                  <ButtonLink href={home.hero.secondaryCtaHref} variant="secondary" size="lg">
                    {home.hero.secondaryCtaLabel}
                  </ButtonLink>
                ) : null}
              </div>
            </div>

            <figure className="animate-rise animate-rise-delay-1">
              <Picture
                image={home.hero.image}
                aspect="4 / 3"
                sizes="(max-width: 1024px) 100vw, 52vw"
                priority
                wrapperClassName="rounded-t-sm lg:rounded-sm"
              />
              {home.hero.image?.caption ? (
                <figcaption className="mt-3 text-[0.8125rem] text-earth-muted">
                  {home.hero.image.caption}
                </figcaption>
              ) : null}
            </figure>
          </div>

          <hr className="neyora-rule mt-16 lg:mt-20" />
        </Container>
      </section>

      {/* ------------------------------------------------------------ Products */}
      {home.products.enabled && products.length > 0 ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="products-heading">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeader
              id="products-heading"
              eyebrow={home.products.eyebrow}
              heading={home.products.heading}
              description={home.products.description}
            />
            {home.products.ctaLabel && home.products.ctaHref ? (
              <ButtonLink href={home.products.ctaHref} variant="secondary">
                {home.products.ctaLabel}
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {products.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={product}
                category={productCategories.find((c) => c.slug === product.category) ?? null}
                priority={index === 0}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- Why NEYORA */}
      {home.why.enabled && home.why.pillars.length > 0 ? (
        <Section tone="forest" containerSize="wide" ariaLabelledby="why-heading">
          <SectionHeader
            id="why-heading"
            eyebrow={home.why.eyebrow}
            heading={home.why.heading}
            description={home.why.description}
            invert
          />

          <ol className="mt-16 grid gap-px overflow-hidden border-t border-ivory/15 sm:grid-cols-2 lg:grid-cols-4">
            {home.why.pillars.map((pillar, index) => (
              <li
                key={pillar.title}
                className="border-b border-ivory/15 pt-8 pb-8 sm:border-r sm:pr-8 sm:last:border-r-0 lg:pr-10"
              >
                <span aria-hidden="true" className="font-display text-sm text-golden">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-[1.375rem] leading-snug text-ivory">
                  {pillar.title}
                </h3>
                <p className="mt-3 max-w-[40ch] text-[0.9375rem] leading-relaxed text-ivory/65">
                  {pillar.description}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* --------------------------------------------------------------- Farm */}
      {home.farm.enabled && (home.farm.heading || home.farm.image) ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="farm-heading">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <Picture
              image={home.farm.image}
              aspect="5 / 4"
              sizes="(max-width: 1024px) 100vw, 52vw"
              wrapperClassName="rounded-sm"
            />

            <div>
              <SectionHeader
                id="farm-heading"
                eyebrow={home.farm.eyebrow}
                heading={home.farm.heading}
                description={home.farm.description}
              />
              {home.farm.body ? (
                <MarkdownRenderer
                  content={home.farm.body}
                  variant="compact"
                  className="mt-6 max-w-[52ch]"
                />
              ) : null}
              {home.farm.ctaLabel && home.farm.ctaHref ? (
                <div className="mt-9">
                  <ButtonLink href={home.farm.ctaHref} variant="secondary">
                    {home.farm.ctaLabel}
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ Recipes */}
      {home.recipes.enabled && recipes.length > 0 ? (
        <Section tone="ivory-soft" containerSize="wide" ariaLabelledby="recipes-heading">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeader
              id="recipes-heading"
              eyebrow={home.recipes.eyebrow}
              heading={home.recipes.heading}
              description={home.recipes.description}
            />
            {home.recipes.ctaLabel && home.recipes.ctaHref ? (
              <ButtonLink href={home.recipes.ctaHref} variant="secondary">
                {home.recipes.ctaLabel}
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.slug}
                recipe={recipe}
                category={recipeCategories.find((c) => c.slug === recipe.category) ?? null}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- Community */}
      {home.community.enabled && testimonials.length > 0 ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="community-heading">
          <SectionHeader
            id="community-heading"
            eyebrow={home.community.eyebrow}
            heading={home.community.heading}
            description={home.community.description}
          />

          <ul className="mt-14 grid gap-px border-t border-beige lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.authorName}
                className="border-b border-beige py-9 lg:border-r lg:pr-10 lg:last:border-r-0"
              >
                <blockquote>
                  <p className="font-display text-[1.25rem] leading-snug text-forest">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <footer className="mt-6 text-[0.875rem] text-earth-muted">
                    <cite className="font-sans font-medium text-earth not-italic">
                      {testimonial.authorName}
                    </cite>
                    {testimonial.authorRole || testimonial.location ? (
                      <span className="mt-0.5 block">
                        {[testimonial.authorRole, testimonial.location].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------- Social */}
      {home.social.enabled && socials.length > 0 ? (
        <Section tone="beige" containerSize="wide" size="compact" ariaLabelledby="social-heading">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeader
              id="social-heading"
              eyebrow={home.social.eyebrow}
              heading={home.social.heading}
              description={home.social.description}
            />

            <ul className="flex flex-wrap gap-2.5">
              {socials.map((social) => (
                <li key={social.platform}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center gap-2.5 rounded-xs border border-forest/25 px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
                  >
                    <Icon name={socialIconName(social.platform)} size={18} />
                    {social.handle || social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- Final CTA */}
      {home.finalCta.enabled && home.finalCta.heading ? (
        <section className="relative overflow-hidden bg-earth" aria-labelledby="final-cta-heading">
          {home.finalCta.image ? (
            <>
              <Picture
                image={home.finalCta.image}
                alt=""
                sizes="100vw"
                wrapperClassName="absolute inset-0"
                className="opacity-30"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-earth/55" />
            </>
          ) : null}

          <Container size="wide" className="relative py-(--spacing-section) text-center">
            <div className="mx-auto max-w-2xl">
              {home.finalCta.eyebrow ? (
                <p className="eyebrow text-leaf">{home.finalCta.eyebrow}</p>
              ) : null}
              <h2
                id="final-cta-heading"
                className="mt-5 text-(length:--text-display-lg) text-ivory"
              >
                {home.finalCta.heading}
              </h2>
              {home.finalCta.description ? (
                <p className="mx-auto mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ivory/75">
                  {home.finalCta.description}
                </p>
              ) : null}

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {home.finalCta.ctaLabel && home.finalCta.ctaHref ? (
                  <ButtonLink href={home.finalCta.ctaHref} variant="inverse" size="lg">
                    {home.finalCta.ctaLabel}
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/contact" variant="inverse-outline" size="lg">
                  Talk to us
                </ButtonLink>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* A quiet, permanent pointer to the packaging QR experience. */}
      <Section tone="ivory" size="compact" containerSize="wide">
        <div className="flex flex-col items-start gap-4 border border-beige px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-start gap-4">
            <Icon name="qr" size={26} className="mt-0.5 text-leaf" />
            <div>
              <h2 className="font-sans text-[0.9375rem] font-semibold text-forest">
                There is a QR code on every pack
              </h2>
              <p className="mt-1 max-w-[52ch] text-[0.9375rem] text-earth-soft">
                Scan it to jump straight to whatever we think is most useful this season.
              </p>
            </div>
          </div>
          <Link
            href="/go"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xs border border-forest/30 px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
          >
            Try it
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </Section>
    </>
  )
}

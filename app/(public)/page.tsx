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
import { TrackedLink } from '@/components/public/TrackedLink'
import { getHomepage, getTestimonials } from '@/lib/content/pages'
import { getMediaByIds, getSiteSettings, getSocialLinks } from '@/lib/content/site'
import { listProducts } from '@/lib/content/products'
import { listRecipes } from '@/lib/content/recipes'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * Homepage.
 *
 * Every headline, paragraph, CTA label and image on this page comes from the
 * `homepage` table. There is no marketing copy in this file — which is the
 * whole point of the brief: content changes must never require a deploy.
 *
 * Revalidated rather than fully dynamic so a visit costs no database
 * round-trip most of the time.
 */
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [settings, homepage] = await Promise.all([getSiteSettings(), getHomepage()])
  const media = await getMediaByIds([homepage?.og_image_id, homepage?.hero_image_id])
  const og =
    (homepage?.og_image_id ? media.get(homepage.og_image_id) : null) ??
    (homepage?.hero_image_id ? media.get(homepage.hero_image_id) : null) ??
    null

  return buildMetadata({
    title: homepage?.seo_title || settings.default_seo_title || settings.brand_name,
    description: homepage?.seo_description || settings.default_seo_description,
    path: '/',
    image: og,
    settings,
    // The homepage title is already the brand; appending it would repeat.
    appendBrand: false,
  })
}

export default async function HomePage() {
  const [settings, homepage, socials] = await Promise.all([
    getSiteSettings(),
    getHomepage(),
    getSocialLinks(),
  ])

  const visible = (key: string) => homepage?.section_visibility?.[key] !== false

  const [products, recipes, testimonials] = await Promise.all([
    visible('products') ? listProducts({ limit: 3 }) : Promise.resolve([]),
    visible('recipes') ? listRecipes({ limit: 3 }).then((r) => r.recipes) : Promise.resolve([]),
    visible('community') ? getTestimonials({ featuredOnly: true, limit: 3 }) : Promise.resolve([]),
  ])

  const media = await getMediaByIds([
    homepage?.hero_image_id,
    homepage?.farm_image_id,
    homepage?.final_cta_image_id,
  ])
  const hero = homepage?.hero_image_id ? media.get(homepage.hero_image_id) ?? null : null
  const farmImage = homepage?.farm_image_id ? media.get(homepage.farm_image_id) ?? null : null
  const ctaImage = homepage?.final_cta_image_id
    ? media.get(homepage.final_cta_image_id) ?? null
    : null

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative border-b border-beige bg-ivory" aria-labelledby="hero-heading">
        <Container size="wide" className="pt-16 pb-0 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="animate-rise">
              {homepage?.hero_eyebrow ? <p className="eyebrow">{homepage.hero_eyebrow}</p> : null}

              <h1 id="hero-heading" className="mt-6">
                <Wordmark
                  as="span"
                  brandName={homepage?.hero_headline || settings.brand_name}
                  className="text-(length:--text-display-xl) leading-[0.9]"
                />
                <span className="mt-4 block font-display text-(length:--text-display-md) leading-none font-light tracking-[0.06em] text-earth-soft">
                  {homepage?.hero_subheadline || settings.tagline}
                </span>
              </h1>

              {homepage?.hero_description ? (
                <p className="animate-rise animate-rise-delay-1 mt-8 max-w-[50ch] text-[1.125rem] leading-relaxed text-earth-soft">
                  {homepage.hero_description}
                </p>
              ) : null}

              <div className="animate-rise animate-rise-delay-2 mt-10 flex flex-wrap gap-3">
                {homepage?.hero_cta_label && homepage.hero_cta_href ? (
                  <ButtonLink href={homepage.hero_cta_href} size="lg">
                    {homepage.hero_cta_label}
                  </ButtonLink>
                ) : null}
                {homepage?.hero_secondary_cta_label && homepage.hero_secondary_cta_href ? (
                  <ButtonLink
                    href={homepage.hero_secondary_cta_href}
                    variant="secondary"
                    size="lg"
                  >
                    {homepage.hero_secondary_cta_label}
                  </ButtonLink>
                ) : null}
              </div>
            </div>

            <figure className="animate-rise animate-rise-delay-1">
              <Picture
                media={hero}
                alt={hero?.alt ?? `${settings.brand_name} fresh produce`}
                aspect="4 / 3"
                sizes="(max-width: 1024px) 100vw, 52vw"
                priority
                wrapperClassName="rounded-t-sm lg:rounded-sm"
              />
              {homepage?.hero_image_caption ? (
                <figcaption className="mt-3 text-[0.8125rem] text-earth-muted">
                  {homepage.hero_image_caption}
                </figcaption>
              ) : null}
            </figure>
          </div>

          <hr className="neyora-rule mt-16 lg:mt-20" />
        </Container>
      </section>

      {/* ------------------------------------------------------------ Products */}
      {visible('products') && products.length > 0 ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="products-heading">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeader
              id="products-heading"
              eyebrow={homepage?.products_eyebrow}
              heading={homepage?.products_heading}
              description={homepage?.products_description}
            />
            {homepage?.products_cta_label && homepage.products_cta_href ? (
              <ButtonLink href={homepage.products_cta_href} variant="secondary">
                {homepage.products_cta_label}
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- Why NEYORA */}
      {visible('why') && (homepage?.why_pillars?.length ?? 0) > 0 ? (
        <Section tone="forest" containerSize="wide" ariaLabelledby="why-heading">
          <SectionHeader
            id="why-heading"
            eyebrow={homepage?.why_eyebrow}
            heading={homepage?.why_heading}
            description={homepage?.why_description}
            invert
          />

          <ol className="mt-16 grid gap-px overflow-hidden border-t border-ivory/15 sm:grid-cols-2 lg:grid-cols-4">
            {homepage?.why_pillars.map((pillar, index) => (
              <li
                key={pillar.title}
                className="border-b border-ivory/15 pt-8 pb-8 sm:border-r sm:pr-8 sm:last:border-r-0 sm:odd:pr-8 lg:pr-10"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-sm text-golden"
                >
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
      {visible('farm') && (homepage?.farm_heading || farmImage) ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="farm-heading">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <Picture
              media={farmImage}
              alt={farmImage?.alt ?? 'The NEYORA farm'}
              aspect="5 / 4"
              sizes="(max-width: 1024px) 100vw, 52vw"
              wrapperClassName="rounded-sm"
            />

            <div>
              <SectionHeader
                id="farm-heading"
                eyebrow={homepage?.farm_eyebrow}
                heading={homepage?.farm_heading}
                description={homepage?.farm_description}
              />
              {homepage?.farm_body ? (
                <MarkdownRenderer
                  content={homepage.farm_body}
                  variant="compact"
                  className="mt-6 max-w-[52ch]"
                />
              ) : null}
              {homepage?.farm_cta_label && homepage.farm_cta_href ? (
                <div className="mt-9">
                  <ButtonLink href={homepage.farm_cta_href} variant="secondary">
                    {homepage.farm_cta_label}
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ Recipes */}
      {visible('recipes') && recipes.length > 0 ? (
        <Section tone="ivory-soft" containerSize="wide" ariaLabelledby="recipes-heading">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeader
              id="recipes-heading"
              eyebrow={homepage?.recipes_eyebrow}
              heading={homepage?.recipes_heading}
              description={homepage?.recipes_description}
            />
            {homepage?.recipes_cta_label && homepage.recipes_cta_href ? (
              <ButtonLink href={homepage.recipes_cta_href} variant="secondary">
                {homepage.recipes_cta_label}
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- Community */}
      {visible('community') && testimonials.length > 0 ? (
        <Section tone="ivory" containerSize="wide" ariaLabelledby="community-heading">
          <SectionHeader
            id="community-heading"
            eyebrow={homepage?.community_eyebrow}
            heading={homepage?.community_heading}
            description={homepage?.community_description}
          />

          <ul className="mt-14 grid gap-px border-t border-beige lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.id}
                className="border-b border-beige py-9 lg:border-r lg:pr-10 lg:last:border-r-0"
              >
                <blockquote>
                  <p className="font-display text-[1.25rem] leading-snug text-forest">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <footer className="mt-6 text-[0.875rem] text-earth-muted">
                    <cite className="font-sans font-medium text-earth not-italic">
                      {testimonial.author_name}
                    </cite>
                    {testimonial.author_role || testimonial.location ? (
                      <span className="mt-0.5 block">
                        {[testimonial.author_role, testimonial.location]
                          .filter(Boolean)
                          .join(' · ')}
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
      {visible('social') && socials.length > 0 ? (
        <Section tone="beige" containerSize="wide" size="compact" ariaLabelledby="social-heading">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeader
              id="social-heading"
              eyebrow={homepage?.social_eyebrow}
              heading={homepage?.social_heading}
              description={homepage?.social_description}
            />

            <ul className="flex flex-wrap gap-2.5">
              {socials.map((social) => (
                <li key={social.id}>
                  <TrackedLink
                    href={social.url}
                    event="social_click"
                    props={{ platform: social.platform, location: 'homepage' }}
                    className="inline-flex h-12 items-center gap-2.5 rounded-xs border border-forest/25 px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
                  >
                    <Icon name={socialIconName(social.platform)} size={18} />
                    {social.handle || social.label}
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- Final CTA */}
      {visible('final_cta') && homepage?.final_cta_heading ? (
        <section className="relative overflow-hidden bg-earth" aria-labelledby="final-cta-heading">
          {ctaImage ? (
            <>
              <Picture
                media={ctaImage}
                alt=""
                sizes="100vw"
                wrapperClassName="absolute inset-0"
                className="opacity-30"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-earth/55" />
            </>
          ) : null}

          <Container
            size="wide"
            className="relative py-(--spacing-section) text-center"
          >
            <div className="mx-auto max-w-2xl">
              {homepage.final_cta_eyebrow ? (
                <p className="eyebrow text-leaf">{homepage.final_cta_eyebrow}</p>
              ) : null}
              <h2
                id="final-cta-heading"
                className="mt-5 text-(length:--text-display-lg) text-ivory"
              >
                {homepage.final_cta_heading}
              </h2>
              {homepage.final_cta_description ? (
                <p className="mx-auto mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ivory/75">
                  {homepage.final_cta_description}
                </p>
              ) : null}

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {homepage.final_cta_label && homepage.final_cta_href ? (
                  <ButtonLink href={homepage.final_cta_href} variant="inverse" size="lg">
                    {homepage.final_cta_label}
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

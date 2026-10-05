import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { Eyebrow } from './Display'
import { VarietyPicker } from '@/components/public/VarietyPicker'
import { formatPrice } from '@/lib/utils/format'
import { availabilityLabel } from '@/lib/content'
import type { Product, ProductChapter } from '@/types/content'
import type { WhatsAppLink } from '@/lib/content'

/**
 * Chapter 05 — the product.
 *
 * The one chapter that has to convert. The pack is shown large, on warm
 * ivory, with the headline set as display type rather than a label — the
 * product is the subject of a campaign here, not a row in a catalogue.
 *
 * There is no cart: NEYORA sells fresh produce through WhatsApp, so the
 * primary action is a conversation.
 */
export function ProductMoment({
  chapter,
  product,
  varieties,
  whatsapp,
}: {
  chapter: ProductChapter
  product: Product
  /**
   * Every variety on sale, not just the featured one.
   *
   * The chapter headline is the only place on the homepage that names what we
   * grow, and naming one variety there left the second discoverable only by
   * going to the shop — which most visitors never do.
   */
  varieties: Product[]
  whatsapp: WhatsAppLink | null
}) {
  const price = formatPrice(product.price ?? null, product.currency)
  const showMrp =
    product.mrp !== undefined && product.price !== undefined && product.mrp > product.price
  const mrp = showMrp ? formatPrice(product.mrp!, product.currency) : null
  const saving = showMrp
    ? Math.round(((product.mrp! - product.price!) / product.mrp!) * 100)
    : null

  // Authored with real line breaks in the YAML, so the break is a choice.
  const headingLines = (chapter.heading ?? '').split('\n').filter(Boolean)

  return (
    <section
      aria-labelledby="product-heading"
      className="overflow-clip bg-ivory py-(--spacing-section)"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* The pack, large. Deliberately not inside a card. */}
          <div className="lg:col-span-6">
            <Picture
              image={product.images[0]}
              sizes="(max-width: 1024px) 100vw, 48vw"
              aspect="4 / 5"
              wrapperClassName="scene-wipe overflow-clip rounded-sm bg-beige-soft"
              className="scene-zoom"
            />

            {product.images.length > 1 ? (
              <ul className="mt-4 grid grid-cols-3 gap-4">
                {product.images.slice(1, 4).map((image) => (
                  <li key={image.src}>
                    <Picture
                      image={image}
                      sizes="16vw"
                      aspect="1 / 1"
                      wrapperClassName="scene-fade overflow-clip rounded-xs bg-beige-soft"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-12 lg:col-span-5 lg:col-start-8 lg:mt-0">
            {chapter.eyebrow ? <Eyebrow>{chapter.eyebrow}</Eyebrow> : null}

            <h2 id="product-heading" className="display display-md mt-6 text-forest">
              {headingLines.map((line) => (
                <span key={line} className="scene-line scene-rise block">
                  {line}
                </span>
              ))}
            </h2>

            {chapter.body ? (
              <p className="scene-rise mt-8 max-w-[44ch] text-[1.0625rem] leading-relaxed text-earth-soft">
                {chapter.body}
              </p>
            ) : null}

            <div className="scene-rise mt-10 border-t border-beige pt-8">
              <p className="font-display text-[1.75rem] leading-none text-forest">
                {product.name}
              </p>
              {product.weightLabel ? (
                <p className="mt-2 text-[0.875rem] tracking-[0.12em] text-earth-muted uppercase">
                  {product.weightLabel}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                {price ? (
                  <p className="font-display text-(length:--text-display-sm) text-forest">
                    {price}
                  </p>
                ) : null}
                {mrp ? (
                  <p className="text-[0.9375rem] text-earth-muted line-through">{mrp}</p>
                ) : null}
                {saving ? <Badge tone="leaf">{saving}% off</Badge> : null}
                <Badge tone={product.availability === 'in_stock' ? 'success' : 'golden'}>
                  {availabilityLabel(product.availability)}
                </Badge>
              </div>

              {/*
                Ordering goes to the product page, not to WhatsApp. A wa.me
                "order" produced no row, no reference, no payment state and no
                admin alert — so the website is now the one path, and WhatsApp
                is where questions go.
              */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/products/${product.slug}`}
                  className="press cta-arrow inline-flex h-14 flex-1 items-center justify-center gap-2.5 rounded-xs border border-forest bg-forest px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  {chapter.ctaLabel ?? 'Order now'}
                  <Icon name="arrow-right" size={18} />
                </Link>
                {whatsapp ? (
                  <a
                    href={whatsapp.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex h-14 items-center justify-center gap-2.5 rounded-xs border border-forest/35 px-7 text-[0.875rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
                  >
                    <Icon name="whatsapp" size={19} />
                    Ask a question
                  </a>
                ) : null}
              </div>

              {/*
                Both varieties, on the homepage. Neither is marked current —
                this is a first introduction, not a selection.
              */}
              <VarietyPicker varieties={varieties} currentSlug="" />
            </div>

            {product.highlights.length > 0 ? (
              <ul className="scene-fade mt-8 flex flex-col gap-2.5">
                {product.highlights.slice(0, 4).map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5 text-[0.9375rem] text-earth-soft">
                    <Icon name="check" size={15} className="mt-1 shrink-0 text-botanical" />
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

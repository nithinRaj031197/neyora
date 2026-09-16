# NEYORA Master Context

This document is canonical for the current NEYORA website implementation.

## Brand

Brand: NEYORA
Tagline: GROWN FOR LIFE.
Parent company: ANWETICO

Do not rename or modify ANWETICO.

NEYORA begins with Fresh Oyster Mushrooms, but it is not architected as a
mushroom-only brand. The site must be able to expand into premium natural foods
and fresh produce without renaming core concepts or rebuilding the content
model.

NEYORA is premium, natural, fresh, modern, trustworthy, health-conscious,
transparent, responsible, customer-first, global, and approachable.

NEYORA is not a technology brand.

## Visual System

Use the established palette:

| Token | Hex |
| --- | --- |
| Deep Forest Green | `#123C2A` |
| Botanical Green | `#3F7D3A` |
| Fresh Leaf | `#8BAF35` |
| Golden Green | `#C6B83A` |
| Warm Ivory | `#F6F0E3` |
| Mushroom Beige | `#D8C9B5` |
| Earth | `#2B2923` |

The existing dark ink treatment may remain where it supports the verified
cinematic rhythm.

Do not introduce blue, cyan, aqua, teal, neon colors, tech gradients,
glassmorphism, or generic startup gradients. Do not casually change established
brand typography without first determining why it needs to change.

## Homepage Story

Preserve the nine-chapter narrative:

1. Hero
2. From Nature
3. Mushroom
4. Journey
5. Product
6. Food
7. Farm
8. Quality
9. Final Frame

The rhythm should broadly progress:

dark -> ivory/light -> dark -> mushroom beige -> ivory -> dark -> earth/natural
-> ivory -> dark

Do not convert these chapters into conventional boxed sections. Each chapter
should feel visually distinct while belonging to the same NEYORA campaign.

## Photography

The current SVG assets are placeholders. Do not design around placeholder
artwork.

Final imagery must feel photorealistic, editorial, premium FMCG campaign,
natural-light, organic, tactile, cinematic, food-first, and cohesive across the
whole site.

Avoid generic stock photography, AI-plastic mushrooms, CGI-looking food,
over-saturated food, fake packaging, and unrelated visual styles.

All imagery should feel like one NEYORA campaign.

## Canonical Image Manifest

| Area | Path | Ratio | Notes |
| --- | --- | --- | --- |
| Hero | `/public/images/hero/hero-desktop.webp` | 16:9 | Desktop hero; cluster in the right 40%, left negative space. |
| Hero | `/public/images/hero/hero-mobile.webp` | 2:3 | Separate mobile composition; subject in upper portion. |
| Hero | `/public/images/hero/neyora-og-card.webp` | 1.91:1 | Social sharing image. |
| Hero | `/public/images/hero/final-cta.webp` | 8:5 | Closing frame; subject right of centre. |
| Mushroom | `/public/images/mushrooms/gills-macro.webp` | 4:5 | Most important macro texture image. |
| Mushroom | `/public/images/mushrooms/cap-macro.webp` | 4:5 | Nature close-up. |
| Mushroom | `/public/images/mushrooms/cluster.webp` | 1:1 | Whole cluster on linen. |
| Mushroom | `/public/images/mushrooms/cluster-closeup.webp` | 4:5 | Safe composition for 1:1 cropping where needed. |
| Farm | `/public/images/farm/growing-room.webp` | 8:5 | Growing room. |
| Farm | `/public/images/farm/farm-wide.webp` | 16:9 | Wide farm atmosphere. |
| Farm | `/public/images/farm/harvest-hands.webp` | 4:5 | Hands at work. |
| Farm | `/public/images/farm/substrate.webp` | 1:1 | Substrate close-up. |
| Journey | `/public/images/journey/grown.webp` | 4:5 | Grown. |
| Journey | `/public/images/journey/harvested.webp` | 4:5 | Harvested. |
| Journey | `/public/images/journey/packed.webp` | 4:5 | Packed. |
| Journey | `/public/images/journey/table.webp` | 4:5 | Table. |
| Product | `/public/images/products/oyster-mushrooms-200g.webp` | 4:5 | Product pack photo; do not fabricate packaging. |
| Product | `/public/images/products/oyster-mushrooms-detail.webp` | 1:1 | Product detail. |
| Food | `/public/images/recipes/garlic-butter-oyster-mushrooms.webp` | 16:9 | Lead cinematic food image. |
| Food | `/public/images/recipes/pepper-oyster-mushroom-fry.webp` | 4:3 | Landscape. |
| Food | `/public/images/recipes/crispy-oyster-mushroom.webp` | 4:5 | Portrait. |
| Food | `/public/images/recipes/category-quick.webp` | 8:5 | Category image. |

If a final WebP does not exist yet, the implementation may temporarily fall
back to the existing SVG placeholder. The final WebP must take precedence as
soon as it is available at the canonical path.

## Chapter Rules

Hero: the first impression must be cinematic. The photograph dominates the
opening viewport. Navigation should feel integrated over the opening frame and
remain accessible, then settle into a quiet solid state after scroll.

Mushroom: the gills are the subject. Use macro imagery and oversized editorial
typography, with reverent and restrained motion.

Journey: preserve the verified desktop sticky storytelling behaviour. Disable
sticky behaviour on mobile and recompose into clean stacked story blocks. Do
not introduce horizontal overflow or long empty viewports.

Product: Fresh Oyster Mushrooms, 200 g. Keep the section premium and commercial
without turning it into a conventional ecommerce card. Do not invent packaging
details.

Food: create appetite. Garlic Butter is 16:9, Pepper Fry is 4:3 landscape, and
Crispy Oyster Mushroom is 4:5 portrait. Do not alternate aspect ratios by array
index.

Farm: establish authenticity. It should feel real, clean, responsible,
small-scale, natural, and transparent.

Quality: keep it calm. Do not add fake certifications, awards, laboratory
claims, health claims, sustainability badges, or decorative proof points.

Final Frame: use `final-cta.webp` as the commercial end frame. Reinforce
NEYORA and GROWN FOR LIFE. Do not overload it with multiple CTAs.

## Motion And Responsiveness

Motion supports storytelling: scroll progress, subtle image scaling, controlled
reveals, editorial text movement, sticky storytelling, and careful parallax
only where justified.

Avoid constant motion, large arbitrary translations, bouncy startup animation,
excessive fade-ins, and animation on every component.

Preserve `prefers-reduced-motion` behaviour. Preserve viewport-bound `view()`
animation behaviour. Do not casually replace `overflow-clip` with
`overflow-hidden`; that caused ViewTimeline and sticky issues previously.

Mobile is not a scaled desktop. Verify at 390px, 768px, and 1440px with special
attention to hero composition, navigation, type wrapping, image focal points,
Journey, Food, Product, Final Frame, horizontal overflow, section heights, and
sticky behaviour.

## Architecture

Keep the current static-first content architecture unless there is a compelling
reason to adjust it. Do not reintroduce Supabase. Do not install a CMS or add
unnecessary dependencies.

Product and Food images may naturally live in product and recipe content files.
Homepage image dependencies should remain documented and easy to audit.

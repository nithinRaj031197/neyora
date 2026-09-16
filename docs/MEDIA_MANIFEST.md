# NEYORA Media Manifest

This manifest tracks V1 production media and planned cinematic assets. Master
4K/video assets should live outside `public/` (for example `assets-master/`);
compressed production derivatives belong under `public/`.

## Generated Production Images

| Filename | Purpose | Section | Master resolution | Production resolution | Aspect ratio | Duration | Codec/container | Poster | Approx. file size | Desktop/mobile usage | Generation/source notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hero-desktop.webp` | Opening hero photograph | Hero | 2400x1350 | 2400x1350 | 16:9 | N/A | WebP | N/A | 152 KB | Desktop/tablet hero via `<picture>` | Approved AI photorealistic NEYORA campaign still. Preserve. |
| `hero-mobile.webp` | Mobile hero photograph | Hero | 1200x1800 | 1200x1800 | 2:3 | N/A | WebP | N/A | 148 KB | Mobile hero via `<picture>` | Approved separate mobile art direction. Preserve. |
| `gills-macro.webp` | Extreme gill macro | Mushroom | 2000x2500 | 2000x2500 | 4:5 | N/A | WebP | N/A | 216 KB | Mushroom macro chapter | Approved AI photorealistic macro still. |
| `cap-macro.webp` | Cap texture macro | Mushroom | 1600x2000 | 1600x2000 | 4:5 | N/A | WebP | N/A | 184 KB | Mushroom macro supporting image | Approved AI photorealistic macro still. |
| `cluster.webp` | Fresh oyster mushroom cluster | Mushroom / Product support | 1800x1800 | 1800x1800 | 1:1 | N/A | WebP | N/A | 352 KB | Square cluster crops | Approved AI photorealistic still. |
| `cluster-closeup.webp` | Hands holding mushroom cluster | Mushroom / Journey support | 1600x2000 | 1600x2000 | 4:5 | N/A | WebP | N/A | 232 KB | Portrait human-care crop | Approved AI photorealistic still. |
| `garlic-butter-oyster-mushrooms.webp` | Garlic butter recipe hero/card image | Recipes / Food | 1672x941 generation | 2400x1350 | 16:9 | N/A | WebP | N/A | 304 KB | Lead food image and recipe page hero | AI generated, visually accepted; no text/logo/packaging. |
| `pepper-oyster-mushroom-fry.webp` | Pepper fry recipe hero/card image | Recipes / Food | 1448x1086 generation | 2000x1500 | 4:3 | N/A | WebP | N/A | 472 KB | Recipe list/detail image | AI generated, visually accepted; no text/logo/packaging. |

## Planned Video Assets

No video assets were generated in this implementation pass. The current build
uses still-image fallbacks/posters only. When video generation is available,
create compressed production derivatives rather than serving raw 4K masters.

| Filename | Purpose | Section | Master resolution | Production resolution | Aspect ratio | Duration | Codec/container | Poster | Loading strategy | Source notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mushroom-gills-glide.webm` / `.mp4` | Slow macro glide under oyster mushroom gills | Mushroom | 3840x2160 target | 1920x1080 or lower derivative | 16:9 | 5-8s | WebM/MP4 | `gills-macro.webp` | Lazy, muted, playsInline, reduced-motion poster | Future AI video; no text/logo/CGI look. |
| `garlic-butter-pan.webm` / `.mp4` | Butter, garlic and mushrooms in pan | Recipes / Food | 3840x2160 target | 1920x1080 or lower derivative | 16:9 | 5-8s | WebM/MP4 | `garlic-butter-oyster-mushrooms.webp` | Lazy, muted, playsInline, reduced-motion poster | Future AI video. |
| `final-food-steam.webm` / `.mp4` | Warm end-frame food/product moment | Final CTA | 3840x2160 target | 1920x1200 derivative | 8:5 | 5-8s | WebM/MP4 | `final-cta.webp` | Lazy, muted, playsInline, reduced-motion poster | Future AI video once final CTA still exists. |

## Missing / Preserved Contracts

These final image paths remain part of the canonical contract. Existing SVG
fallbacks may remain until the final WebP exists.

| Filename | Section | Expected aspect ratio | Current status | Notes |
| --- | --- | --- | --- | --- |
| `neyora-og-card.webp` | Social sharing | 1.91:1 | Missing | Needed for final Open Graph image. |
| `final-cta.webp` | Final CTA | 8:5 | Missing | Should compose food/product subject right of centre, left negative space. |
| `growing-room.webp` | Farm / future Nature support | 8:5 | Missing | Farm hidden from V1 homepage, preserved for future. |
| `farm-wide.webp` | Farm / future Nature support | 16:9 | Missing | Farm hidden from V1 homepage, preserved for future. |
| `harvest-hands.webp` | Farm | 4:5 | Missing | Farm route/content preserved. |
| `substrate.webp` | Farm | 1:1 | Missing | Farm route/content preserved. |
| `grown.webp` | Journey | 4:5 | Missing | Current fallback remains. |
| `harvested.webp` | Journey | 4:5 | Missing | Current fallback remains. |
| `packed.webp` | Journey | 4:5 | Missing | Requires approved packaging reference before generation. |
| `table.webp` | Journey | 4:5 | Missing | Current fallback remains. |
| `oyster-mushrooms-200g.webp` | Product | 4:5 | Missing | Requires approved NEYORA packaging reference. |
| `oyster-mushrooms-detail.webp` | Product | 1:1 | Missing | Requires approved NEYORA packaging reference. |
| `crispy-oyster-mushroom.webp` | Recipes | 4:5 | Missing | Not part of current two-recipe V1 focus. |
| `category-quick.webp` | Recipe category | 8:5 | Missing | Optional category visual. |

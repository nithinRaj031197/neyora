# NEYORA — Brand Guidelines

> **NEYORA**
> *GROWN FOR LIFE.*

NEYORA is a premium natural-food brand. We are starting with fresh oyster
mushrooms, but NEYORA is **not a mushroom company** — it is a natural-food
company whose first crop happens to be mushrooms. Every naming, layout and
copy decision must survive the day we add greens, herbs, honey or millets.

---

## 1. Brand personality

| Is | Is not |
| --- | --- |
| Natural | Rustic / folksy |
| Premium | Luxury / exclusive |
| Warm | Cute |
| Modern | Techy |
| Trustworthy | Corporate |
| Healthy | Clinical / "wellness" |
| Earth-connected | Hippie |

Voice: **calm, specific, unhurried.** We state facts about how food is grown.
We do not shout, use exclamation marks, or promise transformation.

Write "Harvested the morning it ships." Not "The FRESHEST mushrooms EVER!"

---

## 2. Colour

| Token | Hex | Role |
| --- | --- | --- |
| Deep Forest Green | `#123C2A` | Primary. Dark sections, headings on ivory, footer. |
| Botanical Green | `#3F7D3A` | Secondary. Buttons, links, active states. |
| Fresh Leaf | `#8BAF35` | Accent. Small marks, rules, focus rings, badges. |
| Golden Green | `#C6B83A` | Highlight. Gradient terminus, eyebrow text. Sparingly. |
| Warm Ivory | `#F6F0E3` | Page ground. The default background of the site. |
| Mushroom Beige | `#D8C9B5` | Surfaces, borders, hairlines, muted fills. |
| Earth | `#2B2923` | Body text. Not pure black. |

### Never
- Blue, cyan, aqua, teal, indigo, violet.
- Neon or fluorescent green.
- Generic SaaS/startup gradients (purple→blue, blue→cyan, "aurora" meshes).
- Pure `#000000` or pure `#FFFFFF` as a large field.

### Proportion — the 70/20/8/2 rule
- **70%** Warm Ivory / Mushroom Beige (the page breathes)
- **20%** photography
- **8%** Deep Forest Green
- **2%** Fresh Leaf + Golden Green combined

Green is the brand, not the wallpaper. If a screenshot looks green, it is wrong.

### The gradient
The NEYORA gradient runs `#123C2A → #3F7D3A → #8BAF35 → #C6B83A`, left to right.

It is used in **exactly three places**:
1. The wordmark.
2. A 1–2px hairline rule separating major sections.
3. Occasionally, one short piece of display text (never a full paragraph).

Never on: buttons, cards, backgrounds, icons, badges, whole sections.

---

## 3. Typography

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Fraunces** (variable) | Weight 300–600, optical size high. Warm, organic, editorial. |
| Body & UI | **Geist** (variable) | Weight 400–600. |
| Numeric & code | **Geist Mono** | Harvest dates, batch codes, admin tables — anything that must align in a column. |

These three, and nothing else. A fourth face is a decision to re-open this
table, not something to add inline.

Rules:
- Display type is set **tight** (`-0.02em` to `-0.03em`) and **large**. A hero
  headline at 16px in a serif looks cheap; at 72px it looks like a brand.
- The eyebrow/kicker style is Geist, 12px, uppercase, `letter-spacing: 0.18em`,
  Botanical Green. Use it once per section, maximum.
- Body copy maxes out at **68ch**. Long measure reads as a blog, not a brand.
- Never use more than two type sizes in a single card.

---

## 4. Layout & UI

**Do**
- Generous whitespace. Section padding of 96–160px on desktop.
- Asymmetry. Off-centre hero, staggered image grids, 60/40 splits.
- Hairline borders (`1px` Mushroom Beige) instead of drop shadows.
- Sharp-ish corners: `2px`–`6px`. Images may be `0px`.
- One clear action per section.
- Editorial captions under images (Geist, 12–13px, 60% Earth).

**Do not**
- Rounded-2xl cards with heavy shadows in a 3-up grid. That is the generic
  organic-food template.
- Glassmorphism, blurred translucent panels, "frosted" navbars.
- Icon-in-a-coloured-circle feature rows.
- Emoji as iconography.
- More than one animation per viewport.
- Full-width centred text blocks stacked forever.

**Motion**
Fades and 8–16px translations only, 200–500ms, `ease-out`. Everything must be
disabled under `prefers-reduced-motion: reduce`. No parallax, no scroll-jacking,
no counters ticking up.

---

## 5. Photography direction

The site lives or dies on photography. It must look **shot**, not generated.

**Palette:** warm daylight, ivory and beige grounds, deep green shadows.
**Light:** soft directional daylight, morning or late afternoon. Visible but
gentle shadows. Never flat ring-light, never hard flash.
**Surfaces:** unglazed ceramic, raw linen, weathered wood, brushed steel, damp
substrate. No marble, no slate boards, no chalkboards.
**Composition:** negative space on one side so type can sit in the frame.

### Prompts (for reference / placeholder generation)

**Hero**
> Fresh white oyster mushroom clusters arranged on a raw linen cloth, natural
> farm setting, soft directional morning sunlight from the left, warm ivory and
> deep green tones, shallow depth of field, editorial food photography,
> generous negative space on the right, no text, no packaging, photorealistic.

**Farm**
> Clean modern oyster mushroom growing room, rows of substrate bags with young
> clusters, humid air catching soft daylight through a doorway, natural
> materials, a grower's hands adjusting a bag, authentic Indian farm,
> documentary photography, warm earth tones, no logos.

**Recipe**
> Garlic butter oyster mushrooms in a well-used cast-iron pan, golden seared
> edges, fresh cracked pepper, sprig of thyme, dark unglazed ceramic surface,
> soft window light from the side, close-up premium food photography, warm
> earthy palette, steam just visible.

**Product**
> Fresh white oyster mushrooms in a clear recyclable 200 g punnet on a warm ivory
> surface, minimal deep-green label, soft even daylight, realistic
> supermarket-quality product photography, three-quarter angle, subtle shadow.

### The homepage needs exactly these shots

The composition is built around them, and each placeholder in `/public` is
already the right aspect ratio — dropping a real file in changes nothing about
the layout.

| Chapter | File | Ratio | The shot |
| --- | --- | --- | --- |
| 01 Hero | `hero/hero-desktop` | 16:9 | Clusters in low directional light. **Subject in the right 40%** — see "the type column" below |
| 01 Hero | `hero/hero-mobile` | 2:3 | **A different composition**, not a crop. Vertical, **subject in the top 45%** |
| 02 Nature | `mushrooms/cap-macro` | 4:5 | One cap, close enough to see the velvet on its edge |
| 02 Nature | `mushrooms/cluster` | 1:1 | A whole cut cluster on linen |
| 02 Nature | `farm/growing-room` | 8:5 | Substrate bags fruiting, daylight through a doorway |
| 02 Nature | `farm/farm-wide` | 16:9 | The farm, early light, atmospheric |
| 03 Mushroom | `mushrooms/gills-macro` | 4:5 | **The most important shot on the site.** Gills, moisture, texture. Light raking from the right |
| 04 Journey | `journey/grown` | 4:5 | Young pins emerging from a bag |
| 04 Journey | `journey/harvested` | 4:5 | A grower's hands lifting a cluster |
| 04 Journey | `journey/packed` | 4:5 | The 200 g pack being closed |
| 04 Journey | `journey/table` | 4:5 | Cooked, plated, someone about to eat |
| 05 Product | `products/oyster-mushrooms-200g` | 4:5 | The pack, three-quarter, soft even daylight |
| 05 Product | `products/oyster-mushrooms-detail` | 1:1 | The harvest-date panel |
| 06 Food | `recipes/garlic-butter-oyster-mushrooms` | 4:3 | Cast iron, golden seared edges, steam just visible |
| 06 Food | `recipes/pepper-oyster-mushroom-fry` | 4:5 | Curry leaves, coarse pepper, dark ceramic |
| 06 Food | `recipes/crispy-oyster-mushroom` | 4:3 | Shattering crust, lime, brown paper |
| 07 Farm | `farm/harvest-hands` | 4:5 | Hands at work. No face, no posing |
| 07 Farm | `farm/substrate` | 1:1 | Sawdust biomass pellets, close — dry pellets beside hydrated, expanded ones |
| 09 Final | `hero/final-cta` | 8:5 | The closing frame. Warm, full table, someone's home. **Subject right of centre** |

Export as `.webp` at roughly twice the displayed width, under ~300 KB each.
Replace the `.svg` extension in `content/homepage.yml` when you do.

### The type column

Three frames carry the headline on top of them: both hero crops and the final
frame. On those, where the subject sits is not a taste question.

* **Desktop** — the headline occupies the left ~55% of the frame. Keep the
  subject in the right 40%, and keep that left band dark and uncluttered.
* **Phone** — the headline occupies the lower half. Keep the subject in the
  top 45%.

A scrim can rescue a frame that gets this wrong, but only by flattening the
photograph — which defeats the point of shooting it. The site already applies
two crossed scrims; they are there to guarantee a contrast floor, not to fix
framing.

The pale side of an oyster mushroom is the worst case: it reflects more light
than anything else in the shot, and ivory type over a lit cap is the one
combination that will not read.

### Never
- Stock-photo "smiling family in kitchen".
- AI-looking illustration, flat vector farms, hand-drawn leaf doodles.
- Green-tinted colour grading.
- Watermarks, fake packaging, fake certification badges.

---

## 6. Iconography & ornament

- Line icons only, `1.5px` stroke, `currentColor`, 20/24px. Geometric, not cute.
- **At most one** leaf/organic ornament per page. We are a food brand, not a
  botanical illustration catalogue.
- No badge clusters ("100% Natural!", "Farm Fresh!"). Claims are sentences.

---

## 7. Accessibility (non-negotiable)

- Body text: Earth `#2B2923` on Warm Ivory `#F6F0E3` → 11.9:1.
- On Deep Forest Green `#123C2A`, use Warm Ivory `#F6F0E3` → 10.8:1.
- **Fresh Leaf `#8BAF35` and Golden Green `#C6B83A` fail AA on ivory for body
  text.** Use them only for ≥24px display type, borders, or focus rings.
- Focus ring: `2px` Fresh Leaf with a `2px` offset, always visible.
- Every image has real alt text, authored in the admin media library.
- Target WCAG 2.2 AA.

---

## 8. Quick self-check before shipping a screen

1. Would this look at home next to a premium olive-oil or tea brand?
2. Is more than a fifth of the screen green? → fix it.
3. Are there rounded cards with shadows in a 3-up grid? → redesign it.
4. Is there any blue or cyan anywhere? → remove it.
5. Does the photography look shot rather than generated?
6. Does it work at 375px wide with one thumb?
7. Would it still make sense if the product were spinach instead of mushrooms?

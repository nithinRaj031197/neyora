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
| Body & UI | **Inter** (variable) | Weight 400–600. |

Rules:
- Display type is set **tight** (`-0.02em` to `-0.03em`) and **large**. A hero
  headline at 16px in a serif looks cheap; at 72px it looks like a brand.
- The eyebrow/kicker style is Inter, 12px, uppercase, `letter-spacing: 0.18em`,
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
- Editorial captions under images (Inter, 12–13px, 60% Earth).

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
> Fresh grey oyster mushroom clusters arranged on a raw linen cloth, natural
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
> Fresh grey oyster mushrooms in a clear recyclable 200 g punnet on a warm ivory
> surface, minimal deep-green label, soft even daylight, realistic
> supermarket-quality product photography, three-quarter angle, subtle shadow.

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

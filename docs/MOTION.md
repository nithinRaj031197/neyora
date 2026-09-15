# NEYORA — motion system

Everything lives in `app/globals.css`. Four families, each named for **when**
it fires, not for what it looks like. Pick by trigger.

| § | Family | Trigger | Driven by |
|---|---|---|---|
| 2 | `.enter`, `.enter-group` | page load | time |
| 3 | `.hover-*`, `.press` | pointer / keyboard focus | interaction |
| 4 | `.scene-*`, `.hero-*` | scroll position | `animation-timeline` |
| 4b | `.scroll-progress`, `.nav-settle` | scroll position | `animation-timeline` |

---

## The rule everything obeys

**The default state is the final state.**

Every animated element is fully visible, untransformed and in place unless the
browser supports the technique *and* the viewer has not asked for reduced
motion. Written the other way round — `opacity: 0` in the base rule, revealed
by an animation — one unsupported feature leaves a page of invisible text.
That is the single catastrophic failure mode of scroll-driven CSS and it is
why the `@supports` and `@media` guards wrap the animations rather than the
resting state.

There is exactly one deliberate exception, `.scroll-progress`, and it is
`display: none` by default rather than transparent. It is `aria-hidden`
decoration duplicating the scrollbar, so not rendering it is strictly safer
than stranding it at 100%.

## What may be animated

`opacity`, `transform`, `translate`, `scale`, `filter`. Nothing else.

None of these trigger layout, so every animation stays on the compositor. No
rule in this system animates `width`, `height`, `top`, `margin`,
`background-color` or `box-shadow`.

Hover rules use the **individual** transform properties (`translate`, `scale`)
rather than the `transform` shorthand, so a card can be lifted and pressed at
the same time without the two rules overwriting each other.

## Tokens

Set once in `@theme`; no duration or curve is written inline anywhere else.

```css
--ease-out-soft:    cubic-bezier(0.16, 1, 0.3, 1);     /* everything */
--ease-spring-soft: cubic-bezier(0.22, 1.12, 0.36, 1); /* press + arrow only */

--duration-micro:  160ms;   /* press */
--duration-hover:  320ms;   /* hover states */
--duration-enter:  500ms;   /* entrances */
--duration-media:  600ms;   /* photographic push-in */
```

The spring is damped to about 1.5% overshoot. A full
`cubic-bezier(0.34, 1.56, 0.64, 1)` is the house bounce at Stripe and Vercel,
but `docs/BRAND_GUIDELINES.md` §4 asks for restrained motion and a visible
bounce fights the stillness the rest of the design is built on. It is used in
two places only, both where a finger expects recoil.

---

## §2 Entrance — `.enter`, `.enter-group`

**Above the fold only.** Below the fold, use `.scene-*` instead: tying the
reveal to scroll position is cheaper and arrives at the right moment, whereas
a timed entrance on off-screen content has usually finished before anyone
sees it.

Stagger is a custom property, so a component sets its own order without a new
class per position:

```html
<p class="enter" style="--enter-index: 2">
```

Or let the parent assign indices to its direct children:

```html
<div class="enter-group" style="--enter-offset: 120ms; --enter-step: 90ms">
  <p class="eyebrow">…</p>   <!-- 120ms -->
  <h1 class="enter-focus">…</h1>  <!-- 210ms, with a focus pull -->
  <p>…</p>                   <!-- 300ms -->
</div>
```

| Property | Default | What it does |
|---|---|---|
| `--enter-index` | `0` | position in the stagger |
| `--enter-step` | `70ms` | gap between successive children |
| `--enter-offset` | `0ms` | delay before the whole sequence |
| `--enter-distance` | `1rem` | how far it travels |

`.enter-focus` swaps in a blur-to-sharp variant for large display type, where
a plain slide reads mechanical. `filter: blur()` is the most expensive
property in this system, so it is confined to short entrances on small areas —
never a full-bleed photograph.

`.enter-group` caps the stagger at six children. A seventh arriving 490ms late
reads as a slow page, not a considered one.

No `will-change` anywhere. These animations run once and then sit still, and a
permanent compositor layer per element costs more memory than the animation
ever saved.

## §3 Hover, focus and press

| Class | Effect | Put it on |
|---|---|---|
| `.hover-lift` | rises 4px | the card, never its inner text |
| `.hover-media` | inner `<img>` scales 1.04 and warms | any ancestor with `overflow: hidden` |
| `.hover-rule` | brand hairline draws along the lower edge | a card or panel |
| `.hover-tone` | ground warms to `--color-ivory-soft` | a card or panel |
| `.press` | scales to 0.98 and springs back | buttons and links |
| `.cta-arrow` | a child `svg` leans 0.25rem toward its destination | buttons and links |

Every hover rule is wrapped in `@media (hover: hover)`, so a touch device never
gets a state it cannot leave — on a phone, `:hover` sticks after a tap until
you touch something else. Each also answers to `:focus-visible` or
`:focus-within`, so a keyboard user gets the same affordance a mouse user does.

`Button` carries `.press .cta-arrow` by default; `Card` carries
`.hover-lift .hover-rule .hover-media` when it is `interactive` or has an
`href`. Hand-rolled links name the classes explicitly.

### Two deliberate substitutions

The modern-web playbook asks for glassmorphic elevation shifts and glowing
gradient borders. `docs/BRAND_GUIDELINES.md` §4 rules out both outright — no
frosted panels, no glow, hairlines instead of shadows.

* `.hover-tone` replaces the frosted panel with a **tone shift**. Same "this
  is lifting toward you" read, no translucency.
* `.hover-rule` replaces the glow with the **brand hairline** drawing itself
  in. Guidelines §2 sanctions the NEYORA gradient on exactly two things, the
  wordmark and a hairline rule — this is a hairline rule.

Both animate a single compositor-safe property, which a `backdrop-filter`
would not.

## §4 Scroll

Pure CSS `animation-timeline`. No JavaScript, no `IntersectionObserver`, no
scroll listener, no library.

| Class | Effect |
|---|---|
| `.scene-rise` | rise and fade in as it enters |
| `.scene-fade` | fade in |
| `.scene-zoom` | slow push-in across the whole time on screen |
| `.scene-wipe` | photograph wipes open from its lower edge |
| `.scene-drift` | type drifting against the image behind it |
| `.scene-line` | one display line; each gets its own delay |
| `.hero-image`, `.hero-type`, `.hero-hint` | tied to `scroll(root)`, not `view()` |
| `.nav-settle` | header hairline fades in past the hero |
| `.scroll-progress` | 2px brand rule scaled by page position |

**Reveals are eased, parallax is not.** On a scroll timeline the timing
function remaps scroll *progress*, not elapsed time. An ease-out therefore
makes a reveal finish early and hold still while the reader arrives at it,
which is what you want. Applied to a continuous effect like `.scene-zoom` the
same curve would make the image drift at a changing rate and rubber-band when
the reader scrolls back up — so those stay `linear`.

The hero uses `scroll(root)` rather than `view()` because it starts at the top
of the page, where there is no entry phase for `view()` to measure.

## Reduced motion

Two layers of defence:

1. A global rule in `@layer base` collapses every animation and transition to
   `0.001ms` under `prefers-reduced-motion: reduce`.
2. Every family above is *additionally* declared inside
   `@media (prefers-reduced-motion: no-preference)`, so the rules are never
   generated in the first place.

The second is not redundant. The first stops motion; the second stops the
browser from setting up scroll timelines it will never run.

## Not everything moves

Chapters 03 (The mushroom) and 08 (Quality) are nearly still on purpose. They
are what make 06 and 09 land. Before adding motion to something, check it is
not one of the two chapters holding the page's breath.

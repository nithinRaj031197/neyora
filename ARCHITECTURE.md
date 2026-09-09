# NEYORA — Architecture

Why the system is shaped the way it is. For how to run and edit it, see
[`README.md`](README.md).

---

## 1. The decision that shaped everything

This site was first built as a full CMS: Supabase, Postgres with Row Level
Security, authentication, an admin panel, a Markdown editor, image uploads,
scheduled publishing. It worked, and it is preserved on the **`cms-supabase`**
branch with its migrations and 413 tests.

It was then deliberately replaced with a static one, before launch and before
any real content existed.

The reasoning: for a first launch with one person editing, a database earns its
complexity only if content changes need to happen without a deploy, or by
someone who cannot use git. Neither was true. Everything else the CMS provided
— validation, structured recipes, scheduled publishing, SEO — turned out to be
achievable in files.

What was given up, stated plainly:

- Editing from a phone. Content changes now need a commit.
- Non-technical editing. Markdown and YAML are a wall for some people.
- Instant publishing. A change is live after a deploy, not a save.
- The contact form. Submissions have nowhere to go without a database, so the
  site directs people to WhatsApp and email instead.

What was gained:

- Nothing to breach: no credentials, no accounts, no service-role key.
- Nothing to pause: Supabase's free tier suspends idle projects, which would
  have taken the site down before launch.
- Nothing to pay for or keep patched.
- Genuinely static pages — the site is HTML on a CDN.

The second and third constraints from the original brief still hold, and shaped
everything below: **it must run free**, and **NEYORA is not a mushroom
company** — mushrooms are the first crop, and nothing may assume otherwise.

---

## 2. Shape

```
content/*.md, *.yml ──┐
                      ├──► Zod validation ──► Next.js build ──► static HTML
public/images/*    ───┘                                          on Cloudflare
```

One Next.js application, no backend, no runtime data source. `lib/content/` is
the only data layer, and it reads the filesystem at build time.

Almost every route prerenders. The exceptions are `/go`, which must never be
cached, and the two listing pages that read query parameters.

### Rendering

Server Components by default. The client bundle on a public page is small and
deliberate:

| Client component | Why it must be |
| --- | --- |
| `MobileNav` | Escape to close, focus return, scroll lock |
| `NavLinks` | `aria-current` needs the current pathname |
| `RecipeIngredientList` | Pack-size switching and tick-off |
| `RecipeFilters` | Pushes filter state into the URL |
| `ShareRow` | Web Share API and clipboard |

The Markdown renderer is a *Server* Component. `react-markdown`, `remark-gfm`
and `rehype-sanitize` never reach the browser — the HTML arrives already
rendered.

---

## 3. The content model

`types/content.ts` defines the shapes. They are deliberately the shapes a
database would store — every field maps to one column — so adding a database
later is a loader swap rather than a redesign.

`lib/content/index.ts` is the seam. Pages read through it and nothing else
knows where content comes from.

### Validation replaces constraints

Every file is Zod-validated as it loads. A malformed recipe fails the build
with a message naming the file and the field, which is the job the `NOT NULL`s
and `CHECK`s used to do. Specifically:

- Alt text is **required** on every image — a missing one is an accessibility
  failure, not a cosmetic gap.
- Width and height are **required** — without them the browser cannot reserve
  space and the page shifts as images load.
- A scalable recipe **must** declare `basePackGrams`, or the pack switcher
  would silently show unscaled quantities.
- A published recipe **must** have at least one step; a published product
  **must** have at least one photograph.
- An MRP below the selling price is rejected — that is always a typo.
- The QR destination **must** be a path on this site.

The ingredient, step, image and nutrition schemas are **strict**: an unknown
key is an error. That is not pedantry. In YAML flow style an unquoted value
containing a comma silently splits into a new key —

```yaml
{ item: garlic, note: peeled, crushed }   # note becomes "peeled"; "crushed" is a stray key
```

— and a permissive schema would drop the stray key and half the note with it.
This exact bug was in the seeded content and was caught by a test.

### Recipes: two representations, on purpose

A recipe stores its method **twice**, and this is the most consequential
decision in the model.

```
body                Markdown — the editorial voice
ingredients (YAML)  [{ qty: 200, unit: g, item: '…', scalable: true }]
steps       (YAML)  [{ title, body, durationMinutes }]
```

Markdown alone cannot produce Recipe structured data: Google needs
`recipeIngredient` as flat strings and `recipeInstructions` as `HowToStep`
objects with per-step anchors. That markup is what makes a recipe eligible for
rich results, which for a food brand is the difference between being found and
not.

Prose also cannot be multiplied. Because `qty` is a **number** and `scalable`
is a **boolean**, scaling a 200 g recipe to 500 g is arithmetic — and the
`scalable` flag is what stops it doubling the chilli.

### Pack sizes

`packVariants` holds hand-written ingredient lists keyed by pack size.
Resolution order at render:

1. A saved variant for the requested pack — a human's judgement always wins.
2. Arithmetic scaling of the base list, multiplying only `scalable` lines.
3. The base list as written.

The page says which of the three it is showing. Silently multiplying someone's
seasoning by 2.5 and presenting it as a recipe would be worse than showing
nothing.

---

## 4. Security

The surface is small: no database, no accounts, no credentials, no user input.
Three things can still go wrong, and each has a test.

**Markdown injection.** Content is authored in files and rendered on public
pages. `react-markdown` never produces an HTML string — it builds a React
element tree, and `rehype-sanitize` prunes it against an allow-list before
React renders. Raw HTML parsing is not enabled at all (no `rehype-raw`, plus
`skipHtml`). There is therefore no HTML string for DOMPurify to clean; this is
the stricter arrangement, and it removes a runtime dependency from every page.

`dangerouslySetInnerHTML` appears in exactly one place — `JsonLd.tsx`, where
React would otherwise escape the quotes and emit invalid JSON. The payload is
`JSON.stringify` output with `</`, U+2028 and U+2029 escaped. A test fails the
build if it appears anywhere else.

**Server code leaking into the client.** `lib/content/loader.ts` reads the
filesystem and is marked `server-only`, so importing it into a client component
is a build error. A test asserts that every module touching `node:fs` carries
that marker and that no client component imports the content layer.

**The QR redirect becoming an open redirector.** A user-editable redirect
printed onto physical packaging cannot be recalled, so the destination is
constrained twice: the content schema rejects anything that is not a
same-origin path (including `//evil.example.com`, which starts with a slash and
resolves as an absolute URL), and `getQrDestination()` re-validates the runtime
override before trusting it.

### Privacy

No cookies at all — no advertising, no analytics, no sessions. There is nothing
to consent to, which is why there is no banner. No personal data is collected
or stored anywhere, because there is nowhere to store it. Analytics are
optional and off by default; when enabled they are cookie-free
(Umami/Plausible). No third-party JavaScript ships unless you configure it.

---

## 5. Images without an image service

Cloudflare Workers has no built-in Next.js image optimiser, and paying for one
was out of scope.

So images are committed to `/public` already sized and compressed, and
`<Picture>` renders a plain `<img>` with explicit `width`/`height` — which
keeps Cumulative Layout Shift at zero — plus `loading="lazy"` by default and
`fetchPriority="high"` on the hero only.

The cost is discipline at authoring time: export at a sensible width before
committing. The content test enforces the parts that can be checked
automatically — that the file exists and that alt text is present.

The CMS branch solved this differently, resizing in the browser at upload time
to WebP at four widths and emitting a real `srcset`. That machinery is worth
revisiting if the image count grows.

---

## 6. What is deliberately absent

**No `clsx` + `tailwind-merge`** — a nine-line `cn()` suffices, because
competing utilities are never passed to the same element.

**No `@tailwindcss/typography`** — the prose styles here are editorial choices
(serif headings, hairline tables, leaf-green list markers) that a generic
plugin would fight.

**No icon package** — the twenty-odd icons the site needs are inline SVG.

**No `gray-matter`** — frontmatter delimiting is a three-line rule; the
genuinely hard part is YAML, which `js-yaml` does. One maintained dependency
instead of a stale tree.

**No contact form** — a form needs somewhere to send to, which means a database
or a paid service. WhatsApp and email reach a real person faster and cost
nothing.

**No search service** — filtering happens in memory over a few dozen recipes.
Postgres full-text search, or a client-side index, is the upgrade path if the
catalogue grows past a few hundred.

---

## 7. Performance

- Static HTML on a CDN; no data fetch at request time.
- Content is parsed once per process and memoised.
- `cache()` de-duplicates within a request, so the header, footer and `<head>`
  metadata share one settings read.
- Fonts are self-hosted through `next/font` with `display: swap` — no runtime
  request to Google, no layout shift.
- Explicit image dimensions everywhere; lazy by default, eager for the hero.
- The client bundle is the table in §2.

---

## 8. Accessibility

Targeting WCAG 2.2 AA, structurally rather than by audit:

- The FAQ accordion is `<details>`/`<summary>` — native, keyboard-operable,
  zero JavaScript.
- Alt text and image dimensions are required by the schema, so a missing one
  fails the build rather than shipping.
- `role="alert"` for errors only. An assertive live region interrupts a screen
  reader mid-sentence, which is right for a failure and rude for a
  confirmation.
- All motion is disabled under `prefers-reduced-motion: reduce`.
- Leaf green and golden green fail AA on ivory for body text, so the brand
  guidelines restrict them to large display type, borders and focus rings.
- Zoom is never locked — the QR landing is used one-handed in a kitchen.

---

## 9. Testing

248 tests, no network, about a second.

| File | Covers |
| --- | --- |
| `content.test.ts` | The **real** content files: validation, referential integrity, image existence, QR destination resolution |
| `validation.test.ts` | The schemas themselves, including every rule in §3 |
| `scale.test.ts` | Pack-size resolution and kitchen rounding |
| `markdown.test.ts` | Plain-text extraction and the sanitiser allow-list |
| `seo.test.ts` | JSON-LD and metadata, asserted against real recipes |
| `components.test.tsx` | Rendering, a11y wiring, and XSS attempts against the real Markdown renderer |
| `format.test.ts` | Vulgar fractions, durations, byte formatting |
| `security.test.ts` | Source-tree invariants — §4 |

`content.test.ts` is the one worth knowing about. It is the closest thing to a
database's integrity checks: it verifies that every recipe's category and tags
exist, that every referenced image is on disk, and that the QR destination
resolves to a real route. It has already caught two genuine bugs — a YAML comma
silently truncating an ingredient note, and empty strings being rejected where
they should mean "unset".

The CMS branch's `database.test.ts`, which booted Postgres in WebAssembly and
tested RLS by becoming the `anon` role, is preserved there.

---

## 10. Known limits

Stated plainly, so nobody discovers them the hard way.

**Content changes require a deploy.** By design. If this becomes the bottleneck
— because someone non-technical needs to publish, or because you want to fix a
typo from your phone — that is the signal to revisit the `cms-supabase` branch.

**Images are optimised by hand.** No resizing pipeline; export sensibly before
committing.

**No contact form.** WhatsApp and email only.

**Analytics are opt-in and third-party.** There is no first-party option
without somewhere to write to.

**The seeded legal pages are templates.** Reviewed by nobody. Have privacy,
terms and cookies checked before launch.

**Scheduled publishing is build-time.** A recipe with a future `publishedAt`
appears on the first build after that date, not the moment it passes.

# NEYORA

> **NEYORA** — *GROWN FOR LIFE.*

The website for NEYORA, a natural-food brand. Its first crop is fresh oyster
mushrooms; nothing in the content model, the routes or the components assumes
that is all it will ever be.

**No database. No accounts. No credentials.** Content lives in `/content` as
Markdown and YAML, images live in `/public`, and the whole site prerenders to
static HTML. Deployment is Cloudflare Workers; the running cost is zero.

---

## Contents

- [How this works](#how-this-works)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Editing content](#editing-content)
- [Testing, linting and type checking](#testing-linting-and-type-checking)
- [Production build](#production-build)
- [Deploying to Cloudflare Workers](#deploying-to-cloudflare-workers)
- [The packaging QR code](#the-packaging-qr-code)
- [Business operations](#business-operations)
- [Adding a database later](#adding-a-database-later)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

---

## How this works

```
content/*.md, *.yml  ──►  Zod validation  ──►  Next.js  ──►  static HTML
public/images/*                                              on Cloudflare
```

Every piece of copy on the site is a file. Editing means changing a file,
committing, and deploying — there is no admin panel and no login.

The trade you are making: content changes need a commit and a deploy, and
anyone editing needs to be comfortable doing that. In exchange you get a site
with nothing to breach, nothing to pause, nothing to pay for, and nothing to
keep patched.

**Content is validated on load.** A malformed recipe, a missing alt text, an
image path that does not exist, or a recipe pointing at a category that is not
defined — each fails the build with a message naming the file and the field.
That is the job a database's constraints used to do.

---

## Prerequisites

| | Version | Notes |
| --- | --- | --- |
| Node.js | **22 or newer** | Enforced in `package.json`. |
| npm | 10+ | |
| A Cloudflare account | free tier | Only needed to deploy |

---

## Local setup

```bash
git clone https://github.com/nithinRaj031197/neyora.git
cd neyora
npm install
cp .env.example .env.local
npm run dev
```

That is the whole setup. There is nothing to provision.

---

## Environment variables

All optional except the site URL, and none of them are secret.

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, no trailing slash. Canonical tags, Open Graph URLs and `sitemap.xml` are built from it |
| `NEYORA_QR_DESTINATION` | no | Overrides where `/go` sends people. See [the QR code](#the-packaging-qr-code) |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | no | `none` (default), `umami` or `plausible` |
| `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` | no | Only for umami/plausible |
| `NEXT_PUBLIC_ANALYTICS_SITE_ID` | no | Only for umami/plausible |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Adds the verification meta tag |

Set `NEXT_PUBLIC_SITE_URL` **before you build**, not just before you run —
pages are prerendered, and the canonical URLs are baked in at build time.

---

## Editing content

```
content/
├── site.yml           brand, contact, WhatsApp, footer, social, QR, default SEO
├── homepage.yml       every headline, paragraph, button and image on /
├── categories.yml     recipe categories, product categories, recipe tags
├── faqs.yml           the FAQ page
├── testimonials.yml   the homepage community section
├── recipes/*.md       one file per recipe
├── products/*.md      one file per product
└── pages/*.md         about, farm, quality, storage, faq, contact, legal
```

Each `.md` file is YAML frontmatter (the structured fields) followed by
Markdown (the editorial prose).

### Adding a recipe

Copy an existing file in `content/recipes/`. **The filename must match the
`slug`** — the loader treats a mismatch as an error, because the filename is
what you edit and the slug is what becomes the URL.

The parts worth understanding:

**Ingredients are structured, not prose.** Use the numeric `qty` field rather
than writing "200g" into the item name. That is what makes automatic pack-size
scaling possible and what search engines read as `recipeIngredient`.

```yaml
ingredients:
  - { qty: 200, unit: g, item: oyster mushrooms, note: torn into strips }
  - { qty: null, unit: "", item: Salt, note: to taste, scalable: false }
```

**`scalable: false` matters.** Set it on anything measured by taste — salt,
pepper, oil for frying, chilli. Those pass through unchanged when a reader
switches pack size. Without it, doubling a recipe doubles the chilli.

**`basePackGrams` is required** for a scalable recipe: it is the weight the
ingredient list is written for. The build fails without it rather than
silently showing unscaled quantities.

**`packVariants` overrides the arithmetic.** When scaling would give the wrong
answer, write the list by hand:

```yaml
packVariants:
  - packSize: 500g
    packGrams: 500
    note: Cook in two batches — 500 g will not fit a single layer.
    ingredients: [...]
```

A saved variant always beats arithmetic, and the page tells the reader which
they are looking at.

> **A YAML trap worth knowing.** In flow style (`{ ... }`), an unquoted value
> containing a comma splits into a new key: `note: peeled, crushed` becomes
> `note: "peeled"` plus a stray `crushed`. Quote any value with a comma. The
> schemas are strict, so this fails the build rather than silently truncating
> your note — but it is easier to avoid than to debug.

### Adding a page

A new slug needs a matching route file, or the URL will 404. Create
`content/pages/<slug>.md`, then copy the three-line pattern from
`app/(public)/about/page.tsx`. **Editing an existing page needs nothing.**

### Adding images

Put them in `public/images/`, sized and compressed before committing —
there is no image optimiser. Reference them with explicit dimensions:

```yaml
cover:
  src: /images/recipes/my-recipe.webp
  alt: Describe what is in the picture
  width: 1600
  height: 1200
```

Dimensions are required. Without them the browser cannot reserve space and the
page jumps as images load. Alt text is required too — a missing one fails the
build.

The committed placeholder SVGs are brand-toned stand-ins, not photography.
Shoot direction is in [`docs/BRAND_GUIDELINES.md`](docs/BRAND_GUIDELINES.md) §5.

---

## Testing, linting and type checking

```bash
npm run check        # typecheck + lint + tests
npm test
npm run test:watch
```

248 tests, no network, about a second. `tests/content.test.ts` is the one that
earns its keep: it loads every real content file, validates it, and checks the
things a foreign key used to guarantee — that each recipe's category and tags
exist, that every referenced image is actually on disk, and that the QR
destination points at a route that resolves.

It has already caught two real bugs: a YAML comma silently truncating an
ingredient note, and an empty string being rejected where it should mean
"unset".

---

## Production build

```bash
npm run build
npm start
```

Almost every route prerenders to static HTML. Only `/go` and the two listing
pages that read query parameters are rendered on demand.

---

## Deploying to Cloudflare Workers

Uses **`@opennextjs/cloudflare`**, the current supported way to run Next.js on
Cloudflare — not the legacy `next-on-pages` / Pages flow.

```bash
npx wrangler login     # once

npm run cf:build       # adapt the Next.js build for Workers
npm run cf:preview     # optional: run it locally in workerd
npm run cf:deploy
```

There are no secrets to set. Public values live in `wrangler.jsonc`.

**Your own domain:** Cloudflare dashboard → Workers & Pages → `neyora` →
Settings → Domains & Routes → *Add custom domain*. Then set
`NEXT_PUBLIC_SITE_URL` to the real domain and rebuild, so canonical URLs and
the sitemap point at it.

---

## The packaging QR code

**Print a QR code that resolves to `https://your-domain.com/go`.** Nothing
else. Never print a link to a specific recipe — you would be committing to it
for the life of every label already in circulation.

Two ways to change where it leads:

**With a deploy** — edit `qr.destination` in `content/site.yml`.

**Without a deploy** — set `NEYORA_QR_DESTINATION` in the Cloudflare dashboard
(Workers & Pages → neyora → Settings → Variables). Takes effect within seconds,
no rebuild, no database. This is what preserves the promise the printed code
makes.

The destination must be a path on your own site. An off-site value is rejected
by the content schema *and* ignored at runtime, so the code can never become an
open redirector printed onto physical packaging.

Set `qr.landingTitle` to show a short mobile-first message before continuing
instead of redirecting straight away — useful for a seasonal note. Leave it
blank for an instant redirect.

---

## Business operations

Production tracking, harvest records, sales, expenses, inventory and P&L belong
in **Google Sheets**, not in this repository. They are internal business data
with a different shape, a different audience and a different update rhythm.

Keep the website reading from files. A public page that depends on a Sheets API
call is slower, more fragile, and rate-limited in ways a static file never is.

---

## Adding a database later

The content model was written so this is a loader swap, not a redesign.

`types/content.ts` defines the shapes, and every field maps to one column.
Pages read through `lib/content/index.ts` and nothing else knows where content
comes from. To move to Postgres:

1. Create tables matching `types/content.ts`.
2. Write a one-off script that reads the Markdown files and inserts the rows.
3. Rewrite `lib/content/index.ts` to query instead of reading files, keeping
   the same function signatures.
4. Nothing in `app/` or `components/` changes.

The full CMS version of this site — Supabase, Row Level Security, an admin
panel, a Markdown editor, image uploads — is preserved on the **`cms-supabase`**
branch, along with its migrations and 413 tests. If the content workflow ever
outgrows git, that is the starting point rather than a blank page.

---

## Troubleshooting

**The build fails with `Invalid content in …`.**
Working as intended: a content file failed validation. The message names the
file and the field. Common causes are a missing `alt`, missing image
dimensions, a `slug` that does not match the filename, or a YAML comma
splitting a value.

**A recipe does not appear.**
Check `status: published`. If `publishedAt` is set, check the date has passed.

**An image does not load.**
`npm test` will tell you which path is missing. Paths are relative to
`/public` and start with `/`.

**`npm run build` succeeds but canonical URLs are wrong.**
`NEXT_PUBLIC_SITE_URL` was not set at build time. Set it and rebuild.

**Node version errors.**
This project needs Node 22+. `nvm use 22`.

---

## Project structure

```
app/
  (public)/          the site
  go/                the QR landing — a re-pointable redirect
  sitemap.ts         built from the content files
  robots.ts
components/
  ui/                design system: Button, Card, Picture, MarkdownRenderer…
  public/            marketing components
content/             every word on the site
lib/
  content/           loading and validating content — the only data layer
  validation/        Zod schemas; the content contract
  markdown/          sanitisation and plain-text extraction
  seo/               metadata and JSON-LD builders
  utils/             formatting, pack-size scaling
docs/                BRAND_GUIDELINES.md
public/              images and brand assets
tests/               248 tests
```

Further reading: [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design decisions,
[`docs/BRAND_GUIDELINES.md`](docs/BRAND_GUIDELINES.md) for the visual system.

---

## Licence

Private and proprietary. © NEYORA.

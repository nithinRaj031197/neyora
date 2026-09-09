# NEYORA

> **NEYORA** — *GROWN FOR LIFE.*

The website and content management system for NEYORA, a natural-food brand.
Its first crop is fresh oyster mushrooms; nothing in the schema, the routes or
the components assumes that is all it will ever be.

Built to run on free tiers, and to be owned outright: your GitHub repository,
your Supabase project, your Cloudflare account, your domain, your data.

---

## Contents

- [What you can change without touching code](#what-you-can-change-without-touching-code)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Database migrations](#database-migrations)
- [Creating your admin account](#creating-your-admin-account)
- [Local development](#local-development)
- [Testing, linting and type checking](#testing-linting-and-type-checking)
- [Production build](#production-build)
- [Deploying to Cloudflare Workers](#deploying-to-cloudflare-workers)
- [Adding a recipe](#adding-a-recipe)
- [Changing homepage content](#changing-homepage-content)
- [Changing social links](#changing-social-links)
- [Changing where the pack QR code goes](#changing-where-the-pack-qr-code-goes)
- [Removing the demo content](#removing-the-demo-content)
- [Verifying Row Level Security](#verifying-row-level-security)
- [Backup and restore](#backup-and-restore)
- [Moving away from Supabase or Cloudflare](#moving-away-from-supabase-or-cloudflare)
- [Free-tier limits, honestly](#free-tier-limits-honestly)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

---

## What you can change without touching code

Everything below is edited at `/admin`, takes effect immediately, and needs no
deploy:

| | |
| --- | --- |
| Homepage headline, description, every section heading and button | Admin → Homepage |
| Hero, farm and call-to-action images | Admin → Homepage / Media |
| Recipes — create, edit, schedule, publish, unpublish, duplicate, feature | Admin → Recipes |
| Recipe ingredients, steps, nutrition, tags, pack sizes | Admin → Recipes |
| Products — copy, price, weight, nutrition, photography, availability | Admin → Products |
| About, Farm, Quality, Storage and the legal pages | Admin → Pages |
| FAQs and testimonials | Admin → FAQs / Testimonials |
| Contact details, WhatsApp number, address, business hours | Admin → Site settings |
| Announcement bar | Admin → Site settings |
| Social links (footer updates itself) | Admin → Social links |
| SEO titles, descriptions, canonical URLs, sharing images | With each item, plus Admin → Site settings for defaults |
| Where the QR code on your packaging leads | Admin → QR redirects |

What *does* need code: adding a brand-new URL (a route file has to exist), and
changing the design.

---

## Prerequisites

| | Version | Notes |
| --- | --- | --- |
| Node.js | **22 or newer** | 20.9+ builds and runs fine, but `wrangler`'s local preview needs 22. Supabase's client library also warns on 20. |
| npm | 10+ | |
| Supabase CLI | latest | Only needed to run migrations. [Install](https://supabase.com/docs/guides/cli) |
| A Supabase account | free tier | |
| A Cloudflare account | free tier | Only needed to deploy |

---

## Local setup

```bash
git clone https://github.com/nithinRaj031197/neyora.git
cd neyora
npm install
cp .env.example .env.local     # then fill it in — see below
npm run dev
```

Before the environment file is filled in, the site still runs: it shows a setup
screen instead of a stack trace, so you can confirm the app works before wiring
up a database.

---

## Environment variables

Every variable is documented inline in [`.env.example`](.env.example). The
short version:

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | The browser-safe key (`sb_publishable_…`). Safe to expose — every request it makes is constrained by Row Level Security. The legacy name `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, no trailing slash. Canonical tags, Open Graph URLs and `sitemap.xml` are built from it |
| `SUPABASE_SERVICE_ROLE_KEY` | strongly recommended | **Secret.** Bypasses RLS. Needed for the contact form, QR scan counters, analytics and granting CMS access |
| `ADMIN_SETUP_TOKEN` | once | A random string used to claim the site. Delete it after setup |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | no | `none` \| `internal` \| `umami` \| `plausible`. Defaults to `internal` |
| `NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET` | no | Defaults to `media` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Adds the verification meta tag |

**The service-role key must never be prefixed `NEXT_PUBLIC_`.** It is read only
by `lib/supabase/admin.ts`, which is marked `server-only` — importing it into a
client component is a build error, and a test asserts that no client component
does.

Set the variables **before you build**, not just before you run: pages with a
`revalidate` value are prerendered at build time, so a build without
credentials bakes in the setup screen (it self-heals on the first revalidation,
but there is no reason to ship it).

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Pick the region
   closest to your customers — it is the single biggest factor in how fast
   pages feel.
2. **Project Settings → Data API**: copy the project URL into
   `NEXT_PUBLIC_SUPABASE_URL`.
3. **Project Settings → API Keys**: copy the **publishable** key
   (`sb_publishable_…`) into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the
   **secret** key (`sb_secret_…`, shown as `service_role` on older projects)
   into `SUPABASE_SERVICE_ROLE_KEY`.
4. Run the migrations (below). They create the schema, the security policies,
   the storage bucket and the demo content.
5. **Authentication → Users → Add user**: create your own account with a strong
   password. Tick "Auto confirm user".

You do not need to create any tables, buckets or policies by hand. Everything
is in `supabase/migrations/`.

---

## Database migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>   # from your project's URL
supabase db push
```

Seven migrations run in order:

| File | What it does |
| --- | --- |
| `…000000_extensions_and_types.sql` | Extensions, enums, `slugify()`, the public-visibility rule |
| `…000100_schema.sql` | All 19 tables, columns, constraints |
| `…000200_indexes_and_triggers.sql` | Indexes, `updated_at`, publication timestamps, last-owner protection, the RPCs |
| `…000300_rls.sql` | `is_admin()`, and Row Level Security on every table |
| `…000400_storage.sql` | The `media` storage bucket and its policies |
| `…000500_demo_flag.sql` | The `is_demo` marker and `purge_demo_content()` |
| `…000600_seed.sql` | Demo content: 1 product, 3 recipes, 10 FAQs, all the pages |

They are idempotent, so re-running is safe.

To reset a local Supabase instance completely:

```bash
supabase db reset
```

**Never create tables through the Supabase dashboard.** If you need a schema
change, add a new migration file so your database stays reproducible from the
repository.

To regenerate the TypeScript types after a schema change:

```bash
npm run db:types
```

---

## Creating your admin account

Signing up to Supabase Auth grants nothing. CMS access requires a row in the
`admins` table. There are two ways to create the first one.

### The setup screen (recommended)

1. Put a long random string in `ADMIN_SETUP_TOKEN`:
   ```bash
   openssl rand -hex 32
   ```
2. Restart the dev server (or redeploy).
3. Sign in at `/admin/sign-in` with the Supabase Auth account you created.
4. Go to `/admin/setup`, paste the token, and submit.
5. **Delete `ADMIN_SETUP_TOKEN` from your environment.**

This is not a backdoor. It requires all three of: an existing signed-in
account, a matching token compared in constant time, and **zero existing
admins**. The moment an admin exists, the screen closes permanently.

### SQL, if you prefer

```sql
insert into public.admins (user_id, email, full_name, role)
select id, email, 'Your Name', 'owner'
from auth.users
where email = 'you@example.com';
```

### Roles

| Role | Can do |
| --- | --- |
| `editor` | All content: recipes, products, pages, media, FAQs, testimonials |
| `admin` | The above, plus site settings, QR redirects and granting access |
| `owner` | Everything, including creating other owners |

The database refuses to remove or demote the **last** owner, so you cannot lock
yourself out.

To add someone else: create their Supabase Auth account, then grant access at
**Admin → Users**.

---

## Local development

```bash
npm run dev          # http://localhost:3000
```

| | |
| --- | --- |
| Public site | http://localhost:3000 |
| CMS | http://localhost:3000/admin |
| QR landing | http://localhost:3000/go |

---

## Testing, linting and type checking

```bash
npm run check        # typecheck + lint + tests
npm run typecheck
npm run lint
npm test
npm run test:watch
```

The suite covers validation, pack-size scaling, the Markdown toolbar and
sanitiser, SEO and JSON-LD output, components (including XSS attempts against
the Markdown renderer), recipe CRUD, and static security invariants.

`tests/database.test.ts` is the interesting one: it boots **a real Postgres**
(PGlite — Postgres compiled to WebAssembly), applies every migration, and then
tests Row Level Security by actually becoming the `anon` role and trying to
read drafts and write rows. No Docker, no network, about a second and a half.

---

## Production build

```bash
npm run build
npm start
```

---

## Deploying to Cloudflare Workers

This uses **`@opennextjs/cloudflare`**, the current supported way to run
Next.js on Cloudflare. It is *not* the older `@cloudflare/next-on-pages` /
Pages flow, which does not support the App Router features this app relies on.

### One-time

```bash
npx wrangler login
```

Set the secrets (they are never committed):

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_*` values are inlined at build time, so they must also be present
in the build environment — in `.env.local` locally, or as build variables in
CI. Setting them as secrets covers server-side reads.

### Every deploy

```bash
npm run cf:build     # adapt the Next.js build for Workers
npm run cf:preview   # optional: run it locally in workerd (needs Node 22)
npm run cf:deploy
```

### Your own domain

Cloudflare dashboard → Workers & Pages → `neyora` → Settings → Domains &
Routes → **Add custom domain**. Then update `NEXT_PUBLIC_SITE_URL` and
rebuild, so canonical URLs and the sitemap point at the real domain.

### Notes on the Cloudflare build

- **Caching.** No incremental cache is configured, so pages with a
  `revalidate` value are rendered per request rather than cached between them.
  Correct output, just not cached. Each render is a handful of indexed Postgres
  queries. To enable real ISR, create an R2 bucket and uncomment the two marked
  blocks in `wrangler.jsonc` and `open-next.config.ts`.
- **Images.** There is no server-side image optimiser. Images are resized in
  the browser at upload time to WebP at four widths, and `<Picture>` emits a
  real `srcset`. No paid image service, and the work happens once.
- **`proxy.ts`.** Next.js 16 runs proxy files on the Node.js runtime only, and
  OpenNext labels Node.js middleware on Cloudflare as experimental. If it ever
  causes trouble you can delete the file: authorisation does not depend on it,
  and `SessionKeeper` refreshes tokens from the browser.

---

## Adding a recipe

1. **Admin → Recipes → New recipe.**
2. Title, then let the slug generate itself. Write a one-or-two-sentence
   excerpt — it appears on cards and becomes the meta description.
3. Choose a cover image (Media → upload, or pick an existing one). Give it real
   alt text.
4. Prep and cook time, servings. Total time is calculated.
5. **Pack size.** Pick the pack the recipe is written for and set the base pack
   weight in grams. Leave "allow automatic scaling" on unless the quantities
   genuinely do not scale.
6. **Ingredients.** Use the numeric quantity field. Untick "scale with pack
   size" for anything measured by taste — salt, pepper, oil for frying. This is
   what makes automatic scaling produce sensible results.
7. **Method.** One step per instruction. These become the structured `HowTo`
   steps search engines read.
8. **Notes and story** in Markdown — why it works, what to watch for.
9. Status → **Published**, and Save. Or set **Scheduled** with a date and it
   goes live on its own.
10. Optionally add a hand-written ingredient list for another pack size, in the
    panel that appears after the first save.

**Preview** shows an unpublished recipe exactly as it will appear. Drafts are
invisible to the public — enforced by the database, not by a filter in a query.

---

## Changing homepage content

**Admin → Homepage.** Every headline, paragraph, button label, button link and
image on the homepage is a field on this screen. The "Sections shown" toggles
let you hide a whole block without losing the copy you wrote for it.

Saving revalidates the homepage immediately.

---

## Changing social links

**Admin → Social links.** Fill in the URL, tick "Show on the site", save. The
footer, the contact page and the homepage social band all read these rows
directly, and the URLs are published as `sameAs` in your organisation's
structured data.

A link appears only when it is both ticked **and** has a URL — enforced in the
security policy, so an enabled-but-empty row can never render a dead link.

WhatsApp is configured in **Site settings** instead, because the number is used
to build `wa.me` links across the whole site rather than as a profile link.

---

## Changing where the pack QR code goes

This is the point of the whole arrangement.

**Print a QR code that resolves to `https://your-domain.com/go`.** Nothing
else. Never print a link to a specific recipe — you would be committing to it
for the life of every label already in circulation.

To change where it leads: **Admin → QR redirects**, edit the `go` row's
destination, save. Every pack already printed now points somewhere new.

- Keep the type at **302**. A 301 is cached permanently by browsers, so
  scanners who have already visited would keep going to the old destination.
  The form refuses a 301 on `go` for exactly this reason.
- Destinations must be a path on your own site. External URLs are rejected by
  the form *and* by a database constraint, so the QR can never become an open
  redirector.
- Add a **landing title** to show a short mobile-first message before
  continuing, instead of redirecting instantly.
- Namespaced codes work too: `go/200g`, `go/spring`. An unknown code falls back
  to whatever `go` currently points at, so a mis-printed label still lands
  somewhere sensible.
- Scans are counted, and shown on the dashboard.

---

## Removing the demo content

The database ships with a product, three recipes, FAQs, testimonials and page
copy so a fresh install is never an empty site. Every seeded row is flagged and
shows a **Demo** badge in the CMS.

Once your own content is in place: **Admin → Site settings → Remove all demo
content.**

Seeded *pages* are deliberately kept, because `/about`, `/farm`, `/quality`,
`/storage` and the legal pages are real routes — deleting their rows would
404 them. Rewrite their copy instead.

**The legal pages are templates, not legal advice.** Have privacy, terms and
cookies reviewed against the law that applies to you before you launch.

---

## Verifying Row Level Security

`npm test` already does this against a real Postgres. To satisfy yourself
against your *own* project:

```sql
-- In the Supabase SQL editor. Become an anonymous visitor:
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select count(*) from public.recipes;            -- published only
select count(*) from public.contact_messages;   -- errors: permission denied
insert into public.recipes (slug, title) values ('x', 'x');  -- errors

reset role;
```

You can also check from the outside, with nothing but your public anon key:

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/contact_messages?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
# -> permission denied for table contact_messages
```

---

## Backup and restore

### Backing up

```bash
# Everything: schema + data
supabase db dump --linked -f backup-$(date +%F).sql

# Data only — what you actually need, since the schema is in git
supabase db dump --linked --data-only -f data-$(date +%F).sql
```

Storage (your photography) is separate from the database:

```bash
npx supabase storage download --linked --recursive ss:///media ./media-backup
```

Supabase's free tier does not include point-in-time recovery, so a scheduled
dump is worth setting up. A GitHub Action running `supabase db dump` weekly and
committing to a private repository costs nothing.

### Restoring

```bash
supabase db reset          # applies migrations to a clean database
psql "$DATABASE_URL" -f data-2026-01-01.sql
```

---

## Moving away from Supabase or Cloudflare

Nothing here is proprietary.

**Away from Supabase.** The database is plain Postgres — dump it and restore
it anywhere. What is Supabase-specific: `auth.uid()` inside the RLS policies,
`auth.users`, and Supabase Storage. To move, replace `lib/supabase/*` with your
own client, provide an `auth.uid()` equivalent (or move authorisation entirely
into `lib/auth/session.ts`), and point `media.public_url` at your new file
host. The application only touches the database through `lib/content/*` and
`lib/actions/*`.

**Away from Cloudflare.** It is a standard Next.js app. `npm run build && npm
start` runs on any Node host. Delete `open-next.config.ts` and
`wrangler.jsonc` if you like.

**Your content.** Every row is yours, in your Postgres. Recipes are Markdown
plus structured JSON. Images are files in your storage bucket.

---

## Free-tier limits, honestly

These are quotas, not "free forever". Watch them.

| Service | Free tier includes | What to watch |
| --- | --- | --- |
| **Supabase** | 500 MB database, 1 GB file storage, 5 GB egress/month, 50,000 monthly active users | Egress is the one that bites. Photography served from Storage counts. Projects pause after ~1 week of inactivity — a visit wakes them, but the first request is slow |
| **Cloudflare Workers** | 100,000 requests/day, 10 ms CPU per request | Generous. A page render here is well inside 10 ms of CPU |
| **Cloudflare R2** (optional) | 10 GB storage, 1 million Class A operations/month | Only if you enable the ISR cache |

Ways this app stays inside them:

- Images are compressed to WebP before upload and served at the size actually
  needed, which is mostly an egress question.
- Public pages carry `revalidate`, so a busy day is not one query per visitor
  once a cache backend is configured.
- List queries select only the columns a card needs — a recipe body can be tens
  of kilobytes and is never fetched for a listing.
- Partial indexes match the public queries exactly.
- Analytics store aggregate counts, not per-visitor rows.
- No third-party JavaScript ships to the public site by default.

---

## Troubleshooting

**"Connect your Supabase project" on every page.**
`NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing
or malformed. They are read at build time, so restart the dev server after editing
`.env.local`.

**Signed in, but "this account does not have CMS access yet".**
Correct: there is no `admins` row for it. See
[Creating your admin account](#creating-your-admin-account).

**"The database refused this write."**
Your `admins` row has been removed, or the session belongs to a different
account. Sign out and back in.

**Uploads fail.**
Check the migrations ran (the `media` bucket comes from
`…000400_storage.sql`), and that you are signed in as an admin — Storage
policies require `is_admin()`.

**The contact form says it is not configured.**
`SUPABASE_SERVICE_ROLE_KEY` is missing. The form writes with the service role
because `contact_messages` has no public insert policy — if it did, anyone with
your anon key could write rows straight into the table.

**A published recipe is not visible.**
If the status is "Scheduled", check the date has passed — the times are UTC.

**`npm run cf:preview` fails.**
`wrangler`'s local runtime needs Node 22. `npm run dev` and `npm run build`
work on 20.9+.

**The build succeeded but pages are empty.**
The build ran without Supabase credentials, so it prerendered the setup screen.
Set the environment variables and rebuild.

---

## Project structure

```
app/
  (public)/          the public website
  admin/             the CMS
  api/               analytics ingest, media listing
  go/                the QR landing — a database-driven redirect
  sitemap.ts         built from the database
  robots.ts
components/
  ui/                design system: Button, Card, Picture, MarkdownRenderer…
  public/            marketing components
  admin/             CMS components, incl. the Markdown editor
lib/
  supabase/          three clients: browser, server, service-role
  auth/              server-side authorisation
  content/           read queries (public + admin)
  actions/           Server Actions — every mutation
  validation/        Zod schemas, the single source of truth
  markdown/          sanitisation, plain-text extraction, editor transforms
  seo/               metadata and JSON-LD builders
  analytics/         a provider-agnostic abstraction
  media/             client-side resizing, srcset construction
  utils/             formatting, pack-size scaling
supabase/migrations/ the entire schema, reproducible
docs/                BRAND_GUIDELINES.md
tests/               407 tests, incl. real Postgres + RLS
public/brand/        logo assets
```

Further reading: [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design decisions
and the security model, [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) for day-to-day use,
[`docs/BRAND_GUIDELINES.md`](docs/BRAND_GUIDELINES.md) for the visual system.

---

## Licence

Private and proprietary. © NEYORA.

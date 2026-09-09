# NEYORA — Architecture

Why the system is shaped the way it is. For how to *use* it, see
[`ADMIN_GUIDE.md`](ADMIN_GUIDE.md); for how to run it, [`README.md`](README.md).

---

## 1. The three constraints that shaped everything

**It must run on free tiers.** Not "be cheap" — actually run, indefinitely, at
launch traffic, on Supabase Free and Cloudflare's free Workers plan. This ruled
out a paid CMS, a paid image CDN, a paid email service, a paid search service
and a paid analytics product. Each of those absences forced a design decision,
and each is documented where it bites.

**The owner must never need to edit source code to change content.** That
rules out Markdown files in the repository, or copy in JSX. Every string a
customer reads lives in Postgres.

**NEYORA is not a mushroom company.** Mushrooms are the first crop. Nothing in
the schema, the routes or the components may assume otherwise.

---

## 2. Shape

One Next.js application. No separate backend.

```
                          ┌──────────────────────────────┐
   Browser ──────────────▶│  Cloudflare Workers          │
                          │  (Next.js via OpenNext)      │
                          │                              │
                          │  RSC pages ─── anon key ─────┼──┐
                          │  Server Actions ─ anon key ──┼──┤
                          │  Route handlers ─ service ───┼──┤
                          └──────────────────────────────┘  │
                                                            ▼
                                              ┌──────────────────────────┐
   Browser ──── upload ──────────────────────▶│  Supabase                │
   Browser ──── <img src> ───────────────────▶│  Postgres + RLS          │
                                              │  Auth                    │
                                              │  Storage (public bucket) │
                                              └──────────────────────────┘
```

A separate Express or NestJS service would add a deployment target, a second
place for authorisation to drift, and an extra network hop — while duplicating
what Server Actions and Route Handlers already do. There is no requirement here
it would satisfy.

### Why the browser talks to Supabase directly for two things

**Image uploads** go straight from the browser to Storage. Routing tens of
megabytes through a Server Action would hit request-body limits and burn Worker
CPU re-transmitting bytes. Storage policies require `is_admin()`, so this is no
weaker than proxying it.

**Image delivery** comes from Storage's own CDN. Proxying it would put every
image byte through a Worker request.

Everything else — every read that renders a page, every mutation — goes through
the server.

---

## 3. Rendering

Server Components by default. The client bundle on a public page is small and
deliberate:

| Client component | Why it must be |
| --- | --- |
| `MobileNav` | Escape to close, focus return, scroll lock |
| `NavLinks` | `aria-current` needs the current pathname |
| `RecipeIngredientList` | Pack-size switching and tick-off |
| `RecipeFilters` | Pushes filter state into the URL |
| `ShareRow` | Web Share API and clipboard |
| `ContactForm` | `useActionState` for inline errors |
| `TrackedLink` / `ViewTracker` | `sendBeacon` on outbound clicks |

The Markdown renderer is a *Server* Component. `react-markdown`, `remark-gfm`
and `rehype-sanitize` never reach the browser on a public page — the HTML
arrives already rendered. In the admin editor the same component is lazily
imported, so the parser loads only when someone opens an editor.

### Caching

Public pages carry `export const revalidate`. Admin pages are `force-dynamic`
and `no-store`. `/go` is `force-dynamic` — a cached QR redirect would keep
sending scanners to last season's page, defeating the entire point.

No incremental cache backend is configured for Cloudflare, so `revalidate`
pages render per request. That is a deliberate free-tier choice, and
`open-next.config.ts` documents the two-line change to enable R2-backed ISR
when traffic justifies it.

---

## 4. Data model

19 tables. The conventions that matter:

**`status` + `published_at` + `deleted_at` on everything.** One publication
lifecycle, one soft-delete convention, one visibility rule.

**Visibility is computed from `published_at`, not `status`.** A trigger keeps
`published_at` authoritative:

| status | published_at |
| --- | --- |
| `draft` | `NULL` |
| `published` | the moment of publishing |
| `scheduled` | mirrors `scheduled_at` |

So `is_publicly_visible()` is one comparison that covers all three states — and
**scheduled content publishes itself with no cron job**. That matters
specifically because `pg_cron` is not on the Supabase free tier, and a
scheduling feature that silently never fires would be worse than not having
one.

**Singletons for `site_settings` and `homepage`.** A single typed row (id = 1,
enforced by a CHECK) rather than a key/value bag: queryable, type-safe, and it
makes the admin form a plain form.

**Soft deletes everywhere the admin can delete.** A mis-click during a launch
is recoverable with one SQL update. The only hard deletes are recipe tags
(which carry no content) and the demo-content purge (which is explicit and
confirmed).

### Recipes: two representations, on purpose

A recipe stores its method **twice**, and this is the most consequential
decision in the schema.

```
recipes.body          Markdown — the editorial voice
recipes.ingredients   JSONB   — [{ qty: 200, unit: 'g', item: '…', scalable: true }]
recipes.steps         JSONB   — [{ title, body, duration_minutes }]
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

`pack_size` is an enum (`150g`, `200g`, `250g`, `500g`, `flexible`), and
`recipe_pack_variants` holds hand-tuned ingredient lists keyed by it.
Resolution order at render:

1. A saved variant for the requested pack — a human's judgement always wins.
2. Arithmetic scaling of the base list, multiplying only `scalable` lines.
3. The base list as written.

The public page says which of the three it is showing. Silently multiplying
someone's seasoning by 2.5 and presenting it as a recipe would be worse than
showing nothing.

The brief asked for this to be possible "without rewriting the recipe system".
It is not deferred: the numeric quantities, the flag, the enum and the variants
table are all in the first migration, and `lib/utils/scale.ts` implements the
resolution with 25 tests around it.

---

## 5. Security

### Threat model

The anon key ships to every browser. Treat every anon-key request as hostile.

| Principal | Can do |
| --- | --- |
| `anon` | `SELECT` on publicly visible rows. Nothing else. |
| `authenticated` | **Nothing extra by default.** Every write policy additionally requires a row in `admins`. |
| `service_role` | Everything. Server-only. Never sent to a browser. |

Signing up to Supabase Auth grants nothing. That is asserted by a test that
becomes a real signed-in non-admin and tries to write.

### Four layers, and what each is for

1. **`proxy.ts`** — refreshes the auth cookie, bounces obvious anonymous
   traffic from `/admin`. **Not a security boundary.** A forged cookie gets
   past it and still cannot read a row.
2. **`requireAdmin()` / `authorizeAction()`** — server-side, per page and per
   action, before anything else runs. This is where role separation lives:
   `editor` cannot reach site settings or the user list.
3. **Zod** — every Server Action re-parses raw `FormData` through the same
   schema the form used. Client validation is a courtesy; this is the gate.
4. **Row Level Security** — the backstop. Even a bug in layers 1–3 cannot leak
   a draft or write a row.

Each layer assumes the ones above it may have failed.

### Writes the public must make, without a public write policy

The contact form, analytics and QR scan counters all need writes from
unauthenticated visitors. None of them gets an `anon INSERT` policy, because
that would let anyone holding the anon key write arbitrary rows straight into
Postgres — bypassing validation, the honeypot and rate limiting.

Instead:

| Write | Route |
| --- | --- |
| Contact message | Server Action → validate → rate-limit → service-role insert |
| Analytics event | Route Handler (needs a URL for `sendBeacon`) → validate → service-role insert |
| QR scan counter | `register_scan()`, a narrow `SECURITY DEFINER` function that touches two counter columns and returns nothing |
| Recipe view counter | `increment_recipe_view()`, same pattern, published rows only |

Every `SECURITY DEFINER` function pins `search_path = public, pg_catalog` —
without it, a shadowing object in a caller-controlled schema can hijack the
function. A test asserts this for all of them.

### Markdown

Admin-authored Markdown renders on public pages, so a compromised or careless
admin account must not be able to inject script.

`react-markdown` never produces an HTML string — it builds a React element
tree, and `rehype-sanitize` prunes that tree against an allow-list before React
renders it. Raw HTML parsing is not enabled at all (no `rehype-raw`, plus
`skipHtml`). There is therefore no HTML string for DOMPurify to clean: this is
the stricter of the two arrangements, and it removes a runtime dependency from
every page.

`dangerouslySetInnerHTML` appears in exactly one place — `JsonLd.tsx`, where
React would otherwise HTML-escape the quotes and emit invalid JSON. The payload
is `JSON.stringify` output with `</`, U+2028 and U+2029 escaped, which is
everything that could terminate a `<script>` block early. A test fails the
build if it appears anywhere else.

Tests attempt `<script>`, `<iframe>`, `javascript:` hrefs, `onerror`
attributes, inline `style`, and `data:` URI images against the real renderer.

### The QR redirect, and why it is not an open redirector

A user-editable redirect is exactly what an attacker would want to control. So
destinations are constrained in **three** places:

- A database CHECK: starts with `/`, but not `//`, not `/\`, no control
  characters.
- The Zod schema, with the same rules and a message that explains why.
- `isSafeDestination()` at read time, before the redirect is issued.

`LIKE '/%'` alone is not enough — `//evil.example.com` starts with a slash and
a browser resolves it as an absolute URL on another host. This was caught by
running the migrations against a real Postgres, which is why that test exists.

### The first-admin bootstrap

RLS requires an existing admin to create an admin — a genuine chicken-and-egg.
`/admin/setup` breaks it, under three simultaneous conditions:

1. The caller is already signed in through Supabase Auth.
2. `ADMIN_SETUP_TOKEN` is set server-side and matches, compared in constant
   time.
3. **No admin exists.** The moment one does, the action always refuses.

It is a bootstrap, not a backdoor. A documented SQL alternative exists for
anyone who would rather not add the variable at all.

### Locking yourself out

A `BEFORE UPDATE OR DELETE` trigger refuses to remove or demote the last
surviving owner, and `revokeAdmin` refuses to revoke your own access. Losing
admin access to your own CMS is unrecoverable without direct SQL, so the
database prevents it.

### Privacy

- No advertising or tracking cookies. No consent banner, because there is
  nothing to consent to.
- No IP address is ever stored. The contact form and analytics keep a salted,
  **day-scoped** SHA-256 digest — enough to spot flooding, not enough to
  follow someone across days.
- Only a referrer's *host* is recorded, never the full URL, which can carry
  search terms and identifiers.
- Analytics properties are restricted to short, low-cardinality scalars.
- The public site ships zero third-party JavaScript by default.

---

## 6. Images without an image service

The most interesting free-tier constraint. Cloudflare Workers has no built-in
Next.js image optimiser, and Supabase's Storage transformations are a paid
feature.

So the work moves to upload time, in the browser:

1. Decode the file (`createImageBitmap`, honouring EXIF orientation).
2. Downscale to 480 / 960 / 1600 / 2400 px, skipping anything above the
   source's own width.
3. Re-encode as WebP (quality 0.78 above 1600 px, 0.85 below).
4. Upload every size straight to Storage.
5. Record the set in `media.variants`.

`<Picture>` builds a real `srcset` from those variants, with explicit
`width`/`height` for zero layout shift and `fetchPriority="high"` on the hero.

The browser then downloads roughly the bytes it needs — the same outcome a
transformation CDN gives, paid for once at upload rather than on every request.
And it lands in the right place: the admin's machine is idle while they choose
a file.

Transparent PNGs are flattened onto ivory rather than black, so a converted
logo sits on the site's own background.

---

## 7. The abstractions, and why only these

Abstraction has a cost. Three exist because the brief requires a paid service
to be droppable in later, and they are the only three.

**Analytics** (`lib/analytics/`). Event names are the stable interface;
providers are adapters. `internal` writes aggregate rows to your own Postgres;
`umami` and `plausible` are script-tag providers. Swapping to a hosted product
means writing one adapter, not touching call sites.

**Notifications.** The contact form writes to `contact_messages` and the admin
reads it, so no transactional-email provider is needed for v1. Adding one means
one call at the end of `submitContactMessage`.

**Caching.** `open-next.config.ts` is the single place a cache backend is
declared. Nothing in the application knows about it.

Deliberately *not* abstracted: the database. A repository layer over Postgres
would cost real clarity to insure against a migration that the plain-Postgres
schema already makes straightforward.

Also deliberately absent: `clsx` + `tailwind-merge` (a nine-line `cn()`
suffices), `@tailwindcss/typography` (the prose styles here are editorial
choices a generic plugin would fight), and an icon package (the twenty-odd
icons the site needs are inline).

---

## 8. Search

Postgres, via `pg_trgm` GIN indexes on the columns the admin searches. No
Algolia, no Elasticsearch. At this content volume, `ILIKE '%term%'` against a
trigram index is fast, free, and one fewer service to own.

If the catalogue grows past a few thousand recipes, the upgrade path is
Postgres full-text search — `tsvector` plus a GIN index — still inside the
database.

---

## 9. Performance

- Server Components by default; the client bundle is the table in §3.
- List queries select only the columns a card needs. A recipe body can be tens
  of kilobytes and is never fetched for a listing.
- Card hydration is two extra queries *total*, not two per card.
- Partial indexes match the public queries exactly, including their
  `published_at is not null` predicate.
- `cache()` de-duplicates per request, so the header, footer and `<head>`
  metadata share one settings query rather than three.
- Fonts are self-hosted through `next/font` with `display: swap` — no runtime
  request to Google, no layout shift.
- One `<link rel="preconnect">` to the Storage origin.
- Images: explicit dimensions, real `srcset`, lazy by default, eager and
  high-priority for the hero only.

---

## 10. Accessibility

Targeting WCAG 2.2 AA, structurally rather than by audit:

- `Field` is the accessibility contract in one component: a real `<label>`
  bound by `htmlFor`, hint and error text wired through `aria-describedby`,
  `aria-invalid` on the control. Every form in the app inherits it.
- The FAQ accordion is `<details>`/`<summary>` — native, keyboard-operable,
  zero JavaScript.
- Modals are the native `<dialog>` element, which brings the focus trap, the
  Escape handler, the inert background and top-layer stacking for free.
- Reorder controls are explicit up/down buttons, not drag handles: operable by
  keyboard, announced by screen readers, usable on a touch screen.
- Alt text is authored in the media library, and its absence is flagged on the
  thumbnail — where it is easiest to fix.
- `role="alert"` for errors only. An assertive live region interrupts a screen
  reader mid-sentence, which is right for a failure and rude for a
  confirmation.
- All motion is disabled under `prefers-reduced-motion: reduce`.
- Leaf green and golden green fail AA on ivory for body text, so the brand
  guidelines restrict them to large display type, borders and focus rings.
- Zoom is never locked — the QR landing is used one-handed in a kitchen.

---

## 11. Testing

407 tests, no network, about two seconds.

| File | Covers |
| --- | --- |
| `validation.test.ts` | Zod schemas, coercion, `javascript:` and open-redirect rejection |
| `scale.test.ts` | Pack-size resolution and rounding |
| `markdown.test.ts` | Toolbar transforms, plain-text extraction, sanitiser allow-list |
| `format.test.ts` | Vulgar fractions, durations, WhatsApp link construction |
| `seo.test.ts` | Every JSON-LD builder and the metadata builder |
| `components.test.tsx` | Rendering, `srcset`, a11y wiring, and XSS attempts against the real Markdown renderer |
| `recipe-crud.test.ts` | Server Actions against a fake Supabase: authorisation, tag replacement, generated columns |
| `auth.test.ts` | Role ranking, `FormData` parsing, DB error translation, the secret guard |
| `security.test.ts` | Static invariants over the migrations and the source tree |
| `database.test.ts` | **A real Postgres**, all migrations, RLS as `anon` |

`database.test.ts` is the one worth knowing about. It boots PGlite (Postgres
compiled to WebAssembly), applies every migration, then tests security by
*becoming* the `anon` role and trying to read drafts and write rows. No Docker,
no network.

It has already earned its place three times over. It caught:

- **`is_admin()` created before `public.admins` existed.** Postgres validates a
  `LANGUAGE SQL` body at creation time, so the very first `supabase db push`
  would have failed. The helpers now live in the RLS migration.
- **`//evil.example.com` passing the redirect CHECK constraint.** A
  protocol-relative URL starts with a slash. The QR could have become an open
  redirector.
- **A publication trigger referencing `scheduled_at` on tables without the
  column** — a runtime error on the first publish of a category, FAQ or
  testimonial.

None of those were visible to a type check or to review. `security.test.ts`
complements it by catching what static analysis is better at: a new table added
without RLS, a broad grant to `anon`, a service-role import creeping into a
client component.

The static tests are deliberately written against the *migration text* rather
than a hand-copied list — so the assertion tracks the schema instead of
drifting from it.

---

## 12. Content architecture

`site_settings` and `homepage` are typed singletons. `pages` holds the
editorial pages, with `is_system` marking those whose slug is wired to a route
file — the admin lets you rewrite them but not rename or delete them, because
either would 404 a real URL. The server-side guard is in `savePage`, not just
the disabled input.

`revalidateContent()` is called after every mutation, so publishing a recipe
appears on the public site immediately rather than after the cache window. A
CMS where saving does not visibly change anything reads as broken.

---

## 13. Known limits

Stated plainly, so nobody discovers them the hard way.

**The contact-form rate limit is per isolate.** It is an in-memory `Map`, and
Cloudflare Workers gives each isolate its own. It slows a casual flood, not a
determined one. The real backstop is that the table is unreadable and
unwritable without the service role. If abuse becomes a problem, Cloudflare
Rate Limiting or a KV counter drops in behind the same function.

**Scheduling has a granularity of the revalidation window.** Content becomes
publicly *visible* the instant its time passes — that is a database
comparison — but a page cached moments earlier may serve stale HTML until it
revalidates.

**No ISR cache on Cloudflare by default.** See §3.

**`proxy.ts` runs on the Node.js runtime.** Next.js 16 allows nothing else for
proxy files, and OpenNext labels Node.js middleware on Cloudflare as
experimental. The file is deletable: authorisation does not depend on it, and
`SessionKeeper` refreshes tokens from the browser.

**Analytics are aggregate only.** Counts of events, deliberately not sessions,
funnels or per-visitor paths. That is a privacy choice, not an oversight.

**The seeded legal pages are templates.** Reviewed by nobody. §"Removing the
demo content" in the README says so, and so do the pages themselves.

**`types/database.ts` is hand-maintained** so a fresh clone type-checks with no
database connection. `npm run db:types` regenerates it from a linked project;
keep it in step with the migrations.

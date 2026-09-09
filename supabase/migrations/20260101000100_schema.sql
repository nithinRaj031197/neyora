-- ============================================================================
-- NEYORA — 0002  Core schema
--
-- Conventions used by every content table:
--   id           uuid primary key
--   slug         url-safe unique identifier (where the row is addressable)
--   status       draft | scheduled | published
--   published_at when the row became / becomes public
--   created_at / updated_at   timestamps (updated_at maintained by trigger)
--   deleted_at   soft deletion; nothing is ever hard-deleted by the admin UI
-- ============================================================================


-- ----------------------------------------------------------------------------
-- admins — who may use the CMS. One row per Supabase Auth user.
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.admin_role not null default 'editor',
  last_seen_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);


-- ----------------------------------------------------------------------------
-- media — the media library. Every image on the site is a row here.
--
-- `variants` holds the pre-generated responsive sizes produced client-side at
-- upload time, so we never need a paid image-transformation service:
--   [{ "width": 480, "path": "…/x-480.webp", "bytes": 21044 }, …]
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null default 'media',
  path         text not null,
  public_url   text not null,
  mime_type    text not null,
  width        integer,
  height       integer,
  size_bytes   bigint,
  -- Editorial metadata, authored in the admin. `alt` is required for a11y and
  -- is enforced in the admin form; kept nullable so an upload is never lost.
  alt          text,
  title        text,
  description  text,
  variants     jsonb not null default '[]'::jsonb,
  folder       text not null default 'general',
  uploaded_by  uuid references public.admins (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint media_bucket_path_unique unique (bucket, path)
);


-- ----------------------------------------------------------------------------
-- site_settings — a single row (id = 1) of global, admin-editable settings.
--
-- A single typed row (rather than a key/value bag) keeps it queryable and
-- type-safe. `extras` is the escape hatch for future fields that do not
-- warrant a migration.
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                 smallint primary key default 1,

  -- Brand
  brand_name         text not null default 'NEYORA',
  tagline            text not null default 'GROWN FOR LIFE.',
  brand_description  text,

  -- Contact
  contact_email      text,
  contact_phone      text,
  whatsapp_number    text,          -- digits + country code, no '+' or spaces
  whatsapp_message   text default 'Hi NEYORA, I would like to know more about your fresh produce.',
  address_line1      text,
  address_line2      text,
  city               text,
  state              text,
  postal_code        text,
  country            text default 'India',
  google_maps_url    text,
  business_hours     text,

  -- Footer
  footer_tagline     text,
  footer_note        text,
  copyright_holder   text default 'NEYORA',

  -- Announcement bar
  announcement_text     text,
  announcement_href     text,
  announcement_enabled  boolean not null default false,

  -- Default SEO (per-page values override these)
  default_seo_title       text,
  default_seo_description text,
  default_og_image_id     uuid references public.media (id) on delete set null,
  organization_legal_name text,

  extras             jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint site_settings_singleton check (id = 1)
);


-- ----------------------------------------------------------------------------
-- pages — editorial pages (about, farm, quality, storage, privacy, terms, …).
--
-- `body` is Markdown. `sections` holds optional structured blocks for pages
-- with a richer layout than a single prose column (e.g. the farm timeline),
-- validated by Zod in the application layer.
-- ----------------------------------------------------------------------------
create table if not exists public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  eyebrow          text,
  subtitle         text,
  body             text not null default '',
  hero_image_id    uuid references public.media (id) on delete set null,
  sections         jsonb not null default '[]'::jsonb,

  -- SEO
  seo_title        text,
  seo_description  text,
  canonical_url    text,
  og_image_id      uuid references public.media (id) on delete set null,
  noindex          boolean not null default false,

  -- A handful of pages are structural (/about, /farm, …) and must not be
  -- deletable from the admin, or the route would 404.
  is_system        boolean not null default false,
  sort_order       integer not null default 0,

  status           public.content_status not null default 'draft',
  published_at     timestamptz,
  scheduled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);


-- ----------------------------------------------------------------------------
-- homepage — a single row (id = 1). Every string on the homepage is here.
-- ----------------------------------------------------------------------------
create table if not exists public.homepage (
  id                    smallint primary key default 1,

  -- Hero
  hero_eyebrow          text,
  hero_headline         text not null default 'NEYORA',
  hero_subheadline      text not null default 'GROWN FOR LIFE.',
  hero_description      text,
  hero_image_id         uuid references public.media (id) on delete set null,
  hero_image_caption    text,
  hero_cta_label        text default 'Explore our products',
  hero_cta_href         text default '/products',
  hero_secondary_cta_label text default 'Discover our recipes',
  hero_secondary_cta_href  text default '/recipes',

  -- Products section
  products_eyebrow      text,
  products_heading      text,
  products_description  text,
  products_cta_label    text,
  products_cta_href     text,

  -- "Why NEYORA" — pillars: [{ title, description }]
  why_eyebrow           text,
  why_heading           text,
  why_description       text,
  why_pillars           jsonb not null default '[]'::jsonb,

  -- Farm story
  farm_eyebrow          text,
  farm_heading          text,
  farm_description      text,
  farm_body             text,
  farm_image_id         uuid references public.media (id) on delete set null,
  farm_cta_label        text,
  farm_cta_href         text,

  -- Recipe discovery
  recipes_eyebrow       text,
  recipes_heading       text,
  recipes_description   text,
  recipes_cta_label     text,
  recipes_cta_href      text,

  -- Community / testimonials
  community_eyebrow     text,
  community_heading     text,
  community_description text,

  -- Social section
  social_eyebrow        text,
  social_heading        text,
  social_description    text,
  social_handle         text,

  -- Final CTA
  final_cta_eyebrow     text,
  final_cta_heading     text,
  final_cta_description text,
  final_cta_label       text,
  final_cta_href        text,
  final_cta_image_id    uuid references public.media (id) on delete set null,

  -- Which sections are rendered at all.
  section_visibility    jsonb not null default '{}'::jsonb,

  -- SEO
  seo_title             text,
  seo_description       text,
  og_image_id           uuid references public.media (id) on delete set null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint homepage_singleton check (id = 1)
);


-- ----------------------------------------------------------------------------
-- product_categories — deliberately generic. NEYORA is not only mushrooms.
-- ----------------------------------------------------------------------------
create table if not exists public.product_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  image_id     uuid references public.media (id) on delete set null,
  sort_order   integer not null default 0,
  status       public.content_status not null default 'published',
  published_at timestamptz default now(),
  scheduled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);


-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  short_description  text,
  description        text not null default '',   -- Markdown

  category_id        uuid references public.product_categories (id) on delete set null,
  variety            text,                        -- e.g. 'Pleurotus ostreatus (Grey Oyster)'
  origin             text,

  -- Pack / pricing. Numeric, not float, because this is money and grams.
  weight_grams       integer,
  weight_label       text,                        -- display override, e.g. '200 g'
  price              numeric(10, 2),
  mrp                numeric(10, 2),
  currency           char(3) not null default 'INR',
  unit_label         text default 'pack',

  -- Structured content, validated with Zod at the edges.
  --   nutrition: { basis, per: [{ label, value, unit, dv }] }
  nutrition          jsonb not null default '{}'::jsonb,
  highlights         jsonb not null default '[]'::jsonb,  -- ["Harvested to order", …]
  storage_notes      text,                        -- Markdown
  shelf_life         text,
  availability       public.availability_status not null default 'in_stock',

  featured           boolean not null default false,
  sort_order         integer not null default 0,

  -- SEO
  seo_title          text,
  seo_description    text,
  canonical_url      text,
  og_image_id        uuid references public.media (id) on delete set null,

  status             public.content_status not null default 'draft',
  published_at       timestamptz,
  scheduled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,

  constraint products_price_nonneg check (price is null or price >= 0),
  constraint products_mrp_nonneg   check (mrp is null or mrp >= 0),
  constraint products_weight_pos   check (weight_grams is null or weight_grams > 0)
);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete cascade,
  sort_order  integer not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint product_images_unique unique (product_id, media_id)
);


-- ----------------------------------------------------------------------------
-- recipe_categories / recipe_tags
-- ----------------------------------------------------------------------------
create table if not exists public.recipe_categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  image_id        uuid references public.media (id) on delete set null,
  seo_title       text,
  seo_description text,
  sort_order      integer not null default 0,
  status          public.content_status not null default 'published',
  published_at    timestamptz default now(),
  scheduled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table if not exists public.recipe_tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- recipes
--
-- Two representations of the recipe coexist, on purpose:
--
--   `body` (Markdown)  — the editorial voice: method, notes, tips. Authored in
--                        the split-pane Markdown editor, rendered sanitised.
--
--   `ingredients` / `steps` (JSONB) — the machine-readable version, powering
--                        Recipe JSON-LD, the ingredient checklist UI, and
--                        (later) automatic pack-size scaling.
--
-- Ingredient shape:
--   { "qty": 200, "unit": "g", "item": "oyster mushrooms",
--     "note": "cleaned", "scalable": true, "group": "For the pan" }
--
-- Because `qty` is a number and `scalable` marks what may be multiplied,
-- scaling a 200 g recipe to 500 g later needs no schema change.
-- ----------------------------------------------------------------------------
create table if not exists public.recipes (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  excerpt               text,
  body                  text not null default '',

  category_id           uuid references public.recipe_categories (id) on delete set null,
  cover_image_id        uuid references public.media (id) on delete set null,
  og_image_id           uuid references public.media (id) on delete set null,

  prep_time_minutes     integer,
  cook_time_minutes     integer,
  -- Generated, so the public site and JSON-LD can never disagree with the parts.
  total_time_minutes    integer generated always as (
    coalesce(prep_time_minutes, 0) + coalesce(cook_time_minutes, 0)
  ) stored,
  servings              integer,
  servings_label        text,
  difficulty            public.recipe_difficulty not null default 'easy',
  cuisine               text,
  course                text,

  -- Pack-size awareness
  recommended_pack_size public.pack_size not null default '200g',
  base_pack_grams       integer,        -- grams the `ingredients` array is written for
  is_scalable           boolean not null default true,
  primary_product_id    uuid references public.products (id) on delete set null,

  ingredients           jsonb not null default '[]'::jsonb,
  steps                 jsonb not null default '[]'::jsonb,
  nutrition             jsonb not null default '{}'::jsonb,
  equipment             jsonb not null default '[]'::jsonb,
  tips                  text,

  featured              boolean not null default false,
  sort_order            integer not null default 0,

  -- SEO
  seo_title             text,
  seo_description       text,
  canonical_url         text,
  noindex               boolean not null default false,

  status                public.content_status not null default 'draft',
  published_at          timestamptz,
  scheduled_at          timestamptz,
  view_count            bigint not null default 0,

  created_by            uuid references public.admins (id) on delete set null,
  updated_by            uuid references public.admins (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint recipes_prep_nonneg     check (prep_time_minutes is null or prep_time_minutes >= 0),
  constraint recipes_cook_nonneg     check (cook_time_minutes is null or cook_time_minutes >= 0),
  constraint recipes_servings_pos    check (servings is null or servings > 0),
  constraint recipes_base_pack_pos   check (base_pack_grams is null or base_pack_grams > 0),
  constraint recipes_ingredients_arr check (jsonb_typeof(ingredients) = 'array'),
  constraint recipes_steps_arr       check (jsonb_typeof(steps) = 'array')
);

create table if not exists public.recipe_tag_map (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id    uuid not null references public.recipe_tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- Pack-size-specific overrides.
--
-- A recipe carries one canonical ingredient list (written for
-- `recipes.base_pack_grams`). When a hand-tuned variant is wanted for another
-- pack — because seasoning rarely scales linearly — an editor adds a row here.
-- Absent a row, the application scales the base list arithmetically using the
-- `scalable` flag on each ingredient.
create table if not exists public.recipe_pack_variants (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references public.recipes (id) on delete cascade,
  pack_size    public.pack_size not null,
  pack_grams   integer,
  servings     integer,
  ingredients  jsonb not null default '[]'::jsonb,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint recipe_pack_variants_unique unique (recipe_id, pack_size),
  constraint recipe_pack_variants_arr check (jsonb_typeof(ingredients) = 'array')
);


-- ----------------------------------------------------------------------------
-- faqs
-- ----------------------------------------------------------------------------
create table if not exists public.faqs (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null default '',   -- Markdown
  category     text not null default 'General',
  sort_order   integer not null default 0,
  status       public.content_status not null default 'published',
  published_at timestamptz default now(),
  scheduled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);


-- ----------------------------------------------------------------------------
-- testimonials
-- ----------------------------------------------------------------------------
create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null,
  author_name  text not null,
  author_role  text,
  location     text,
  rating       smallint,
  avatar_id    uuid references public.media (id) on delete set null,
  featured     boolean not null default false,
  sort_order   integer not null default 0,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint testimonials_rating_range check (rating is null or rating between 1 and 5)
);


-- ----------------------------------------------------------------------------
-- social_links — the footer and contact page read these. No code changes.
-- ----------------------------------------------------------------------------
create table if not exists public.social_links (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null unique,   -- instagram | facebook | youtube | whatsapp | linkedin | x
  label      text not null,
  url        text not null default '',
  handle     text,
  sort_order integer not null default 0,
  enabled    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- redirects — powers the QR code on the packaging.
--
-- The printed QR points at /go, forever. `destination` is changed from the
-- admin whenever the campaign changes, so packaging is never reprinted.
-- ----------------------------------------------------------------------------
create table if not exists public.redirects (
  id            uuid primary key default gen_random_uuid(),
  source        text not null unique,   -- 'go', or 'go/200g', 'go/spring', …
  destination   text not null,
  http_status   smallint not null default 302,
  enabled       boolean not null default true,
  label         text,
  note          text,
  -- An optional mobile-first interstitial instead of an instant redirect.
  landing_title text,
  landing_body  text,
  scan_count    bigint not null default 0,
  last_scan_at  timestamptz,
  updated_by    uuid references public.admins (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 307/308 preserve method; 301/302 are the useful ones for a QR code.
  constraint redirects_status_valid check (http_status in (301, 302, 307, 308)),
  /*
   * Only same-origin paths, so the printed QR can never become an open
   * redirector.
   *
   * `like '/%'` alone is not enough: a protocol-relative URL such as
   * `//evil.example.com` also starts with a slash, and a browser resolves it
   * as an absolute address on another host. A backslash is excluded too,
   * because some clients normalise `/\evil.example.com` the same way.
   *
   * The application re-checks this at read time (isSafeDestination) — but a
   * redirect target is exactly the kind of value that deserves to be
   * unrepresentable in the database, not merely filtered on the way out.
   */
  constraint redirects_destination_relative check (
    destination like '/%'
    and destination not like '//%'
    and destination not like '/\\%'
    and destination !~ '[\r\n\t]'
  )
);


-- ----------------------------------------------------------------------------
-- contact_messages — the contact form writes here; the admin reads it.
-- Avoids any paid transactional-email dependency for v1.
-- ----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  source     text default 'contact_page',
  status     public.message_status not null default 'new',
  admin_note text,
  -- Salted hash only. We never store a raw IP address.
  ip_hash    text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- ----------------------------------------------------------------------------
-- analytics_events — the free, self-owned backend for lib/analytics.
-- No cookies, no personal data: `session_hash` is a rotating salted digest.
-- ----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id           bigserial primary key,
  event_name   text not null,
  path         text,
  referrer_host text,
  props        jsonb not null default '{}'::jsonb,
  session_hash text,
  created_at   timestamptz not null default now(),
  constraint analytics_event_name_valid check (event_name ~ '^[a-z0-9_]{1,48}$')
);


-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'media', 'site_settings', 'pages', 'homepage',
    'product_categories', 'products', 'recipe_categories', 'recipe_tags',
    'recipes', 'recipe_pack_variants', 'faqs', 'testimonials',
    'social_links', 'redirects', 'contact_messages'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

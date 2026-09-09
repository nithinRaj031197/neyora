-- ============================================================================
-- NEYORA — 0004  Row Level Security
--
-- Threat model
-- ------------
-- The browser holds the anon key, so treat every anon-key request as hostile.
-- Three principals:
--
--   anon           the public website. SELECT on published rows only.
--   authenticated  a signed-in Supabase Auth user. Gains nothing by merely
--                  signing up: every write policy additionally requires a row
--                  in `admins`, checked server-side by is_admin().
--   service_role   server-only. Bypasses RLS. Never sent to the browser.
--
-- Writes that must work for the public (contact form, analytics, QR scans) do
-- NOT get an anon INSERT policy. They go through a Server Action / Route
-- Handler that validates input first and then uses either the service-role
-- client or a narrow SECURITY DEFINER RPC. That way a scripted client cannot
-- write arbitrary rows straight into Postgres.
-- ============================================================================

-- ============================================================================
-- Authorisation helpers
--
-- Defined here, immediately before the policies that use them, because they
-- reference public.admins — and Postgres validates a LANGUAGE SQL function
-- body at creation time, so they cannot exist before that table does.
--
-- SECURITY DEFINER so that a policy on `admins` can call is_admin() without
-- recursively invoking that same policy. search_path is pinned to defeat
-- search-path hijacking.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and a.deleted_at is null
  );
$$;

-- Owners and admins may manage other admins and site-wide settings.
-- Editors may only manage content.
create or replace function public.is_admin_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and a.deleted_at is null
      and a.role in ('owner', 'admin')
  );
$$;


alter table public.admins              enable row level security;
alter table public.media               enable row level security;
alter table public.site_settings       enable row level security;
alter table public.pages               enable row level security;
alter table public.homepage            enable row level security;
alter table public.product_categories  enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.recipe_categories   enable row level security;
alter table public.recipe_tags         enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_tag_map      enable row level security;
alter table public.recipe_pack_variants enable row level security;
alter table public.faqs                enable row level security;
alter table public.testimonials        enable row level security;
alter table public.social_links        enable row level security;
alter table public.redirects           enable row level security;
alter table public.contact_messages    enable row level security;
alter table public.analytics_events    enable row level security;

-- Force RLS even for the table owner, so a future migration or a mistakenly
-- elevated role cannot quietly read around these policies.
alter table public.contact_messages force row level security;
alter table public.admins           force row level security;


-- ----------------------------------------------------------------------------
-- Start from zero privilege, then grant back deliberately.
-- (Supabase's default template grants broadly; we narrow it.)
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;


-- ============================================================================
-- admins
-- ============================================================================
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins
  for insert to authenticated
  with check (public.is_admin_manager());

drop policy if exists admins_update on public.admins;
create policy admins_update on public.admins
  for update to authenticated
  using (public.is_admin_manager())
  with check (public.is_admin_manager());

drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins
  for delete to authenticated
  using (public.is_admin_manager());

grant select, insert, update, delete on public.admins to authenticated;


-- ============================================================================
-- Singletons: site_settings, homepage
--
-- Readable by everyone (they are the site's own chrome); writable by admins.
-- ============================================================================
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists homepage_read on public.homepage;
create policy homepage_read on public.homepage
  for select to anon, authenticated using (true);

drop policy if exists homepage_write on public.homepage;
create policy homepage_write on public.homepage
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.homepage to anon, authenticated;
grant update on public.homepage to authenticated;


-- ============================================================================
-- Standard content tables
--
-- Every one gets the same pair of policies, generated so the public rule can
-- never drift between tables:
--   <table>_public_read : anon + authenticated, is_publicly_visible(...)
--   <table>_admin_all   : authenticated AND is_admin()
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'pages', 'product_categories', 'products',
    'recipe_categories', 'recipes', 'faqs', 'testimonials'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format($f$
      create policy %I on public.%I
        for select to anon, authenticated
        using (public.is_publicly_visible(status, published_at, deleted_at))
    $f$, t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $f$, t || '_admin_all', t);

    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;


-- ============================================================================
-- media
--
-- Published pages reference images, so the library must be publicly readable;
-- soft-deleted rows are not. The files themselves live in a public Storage
-- bucket (see 0005), which is what makes free-tier CDN delivery possible.
-- ============================================================================
drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media
  for select to anon, authenticated using (deleted_at is null);

drop policy if exists media_admin_all on public.media;
create policy media_admin_all on public.media
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.media to anon, authenticated;
grant select, insert, update, delete on public.media to authenticated;


-- ============================================================================
-- Child tables — visibility follows the parent
-- ============================================================================
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id
      and public.is_publicly_visible(p.status, p.published_at, p.deleted_at)
  ));

drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all on public.product_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.product_images to anon, authenticated;
grant select, insert, update, delete on public.product_images to authenticated;

drop policy if exists recipe_tag_map_public_read on public.recipe_tag_map;
create policy recipe_tag_map_public_read on public.recipe_tag_map
  for select to anon, authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and public.is_publicly_visible(r.status, r.published_at, r.deleted_at)
  ));

drop policy if exists recipe_tag_map_admin_all on public.recipe_tag_map;
create policy recipe_tag_map_admin_all on public.recipe_tag_map
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.recipe_tag_map to anon, authenticated;
grant select, insert, update, delete on public.recipe_tag_map to authenticated;

drop policy if exists recipe_pack_variants_public_read on public.recipe_pack_variants;
create policy recipe_pack_variants_public_read on public.recipe_pack_variants
  for select to anon, authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and public.is_publicly_visible(r.status, r.published_at, r.deleted_at)
  ));

drop policy if exists recipe_pack_variants_admin_all on public.recipe_pack_variants;
create policy recipe_pack_variants_admin_all on public.recipe_pack_variants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.recipe_pack_variants to anon, authenticated;
grant select, insert, update, delete on public.recipe_pack_variants to authenticated;

-- Tags carry no sensitive data and are used for filter UIs.
drop policy if exists recipe_tags_public_read on public.recipe_tags;
create policy recipe_tags_public_read on public.recipe_tags
  for select to anon, authenticated using (true);

drop policy if exists recipe_tags_admin_all on public.recipe_tags;
create policy recipe_tags_admin_all on public.recipe_tags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.recipe_tags to anon, authenticated;
grant select, insert, update, delete on public.recipe_tags to authenticated;


-- ============================================================================
-- social_links — only enabled rows reach the public footer
-- ============================================================================
drop policy if exists social_links_public_read on public.social_links;
create policy social_links_public_read on public.social_links
  for select to anon, authenticated
  using (enabled and url <> '');

drop policy if exists social_links_admin_all on public.social_links;
create policy social_links_admin_all on public.social_links
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.social_links to anon, authenticated;
grant select, insert, update, delete on public.social_links to authenticated;


-- ============================================================================
-- redirects
--
-- Publicly readable so /go can resolve on the anon client. `scan_count` is
-- bumped through the register_scan() RPC — there is no public UPDATE grant, so
-- the counter cannot be inflated by a direct table write.
-- ============================================================================
drop policy if exists redirects_public_read on public.redirects;
create policy redirects_public_read on public.redirects
  for select to anon, authenticated using (enabled);

drop policy if exists redirects_admin_all on public.redirects;
create policy redirects_admin_all on public.redirects
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.redirects to anon, authenticated;
grant select, insert, update, delete on public.redirects to authenticated;


-- ============================================================================
-- contact_messages — write-only from the server, readable only by admins
--
-- Deliberately NO anon INSERT policy: submissions arrive through a Server
-- Action that validates with Zod, rate-limits, and writes with service_role.
-- ============================================================================
drop policy if exists contact_messages_admin_all on public.contact_messages;
create policy contact_messages_admin_all on public.contact_messages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.contact_messages to authenticated;


-- ============================================================================
-- analytics_events — admins read aggregates; only the server writes
-- ============================================================================
drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events
  for select to authenticated using (public.is_admin());

grant select on public.analytics_events to authenticated;


-- ============================================================================
-- Function grants
-- ============================================================================
grant execute on function public.is_admin()             to authenticated;
grant execute on function public.is_admin_manager()     to authenticated;
grant execute on function public.is_publicly_visible(public.content_status, timestamptz, timestamptz)
  to anon, authenticated;
grant execute on function public.slugify(text)          to authenticated;

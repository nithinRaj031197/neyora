-- ============================================================================
-- NEYORA — 0003  Indexes, publication triggers, RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Indexes
--
-- Partial indexes match exactly what the public site queries: "visible, not
-- deleted, newest first". The predicate tests `published_at is not null`
-- rather than `status = 'published'` because that is the real visibility rule
-- (see is_publicly_visible in migration 0001) and it also covers scheduled
-- rows whose time has come. A partial-index predicate may not call now(), so
-- the timestamp comparison stays in the query.
-- ----------------------------------------------------------------------------

create index if not exists pages_public_idx
  on public.pages (published_at desc)
  where deleted_at is null and published_at is not null;

create index if not exists products_public_idx
  on public.products (sort_order, published_at desc)
  where deleted_at is null and published_at is not null;
create index if not exists products_featured_idx
  on public.products (sort_order)
  where deleted_at is null and published_at is not null and featured;
create index if not exists products_category_idx on public.products (category_id);

create index if not exists recipes_public_idx
  on public.recipes (published_at desc)
  where deleted_at is null and published_at is not null;
create index if not exists recipes_featured_idx
  on public.recipes (sort_order, published_at desc)
  where deleted_at is null and published_at is not null and featured;
create index if not exists recipes_category_idx on public.recipes (category_id);
create index if not exists recipes_pack_idx     on public.recipes (recommended_pack_size);
create index if not exists recipes_scheduled_idx
  on public.recipes (scheduled_at)
  where status = 'scheduled';
create index if not exists recipes_status_updated_idx
  on public.recipes (status, updated_at desc);

-- Trigram indexes back the admin search boxes (ILIKE '%term%').
create index if not exists recipes_title_trgm_idx
  on public.recipes using gin (title gin_trgm_ops);
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists media_search_trgm_idx
  on public.media using gin ((coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || path) gin_trgm_ops);

create index if not exists media_recent_idx
  on public.media (created_at desc) where deleted_at is null;
create index if not exists media_folder_idx on public.media (folder);

create index if not exists faqs_public_idx
  on public.faqs (category, sort_order)
  where deleted_at is null and published_at is not null;

create index if not exists testimonials_public_idx
  on public.testimonials (sort_order)
  where deleted_at is null and published_at is not null;

create index if not exists recipe_tag_map_tag_idx on public.recipe_tag_map (tag_id);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);
create index if not exists recipe_pack_variants_recipe_idx on public.recipe_pack_variants (recipe_id);

create index if not exists contact_messages_inbox_idx
  on public.contact_messages (status, created_at desc) where deleted_at is null;

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_time_idx
  on public.analytics_events (created_at desc);

create index if not exists admins_user_idx on public.admins (user_id) where deleted_at is null;


-- ----------------------------------------------------------------------------
-- Publication timestamp trigger
--
-- Keeps published_at honest no matter which surface performed the write:
--   * -> published   : stamp published_at (if unset)
--   * -> scheduled   : published_at mirrors scheduled_at, so the single
--                      is_publicly_visible() rule handles scheduling too
--   * -> draft       : clear published_at, so unpublishing really unpublishes
-- ----------------------------------------------------------------------------
create or replace function public.sync_publication_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at := now();
    end if;
  elsif new.status = 'scheduled' then
    new.published_at := new.scheduled_at;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'pages', 'products', 'recipes', 'product_categories',
    'recipe_categories', 'faqs', 'testimonials'
  ]
  loop
    execute format('drop trigger if exists sync_publication_timestamps on public.%I', t);
    execute format(
      'create trigger sync_publication_timestamps before insert or update on public.%I
       for each row execute function public.sync_publication_timestamps()', t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Guard: the last surviving owner cannot be removed or demoted.
-- Prevents locking yourself out of your own CMS.
-- ----------------------------------------------------------------------------
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  remaining integer;
begin
  if old.role <> 'owner' then
    return new;
  end if;

  -- Still an active owner after this change? Nothing to protect.
  if tg_op = 'UPDATE' and new.role = 'owner' and new.deleted_at is null then
    return new;
  end if;

  select count(*) into remaining
  from public.admins
  where role = 'owner' and deleted_at is null and id <> old.id;

  if remaining = 0 then
    raise exception
      'Cannot remove or demote the last owner. Promote another owner first.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_last_owner on public.admins;
create trigger protect_last_owner
  before update or delete on public.admins
  for each row execute function public.protect_last_owner();


-- ----------------------------------------------------------------------------
-- RPC: register a QR scan.
--
-- SECURITY DEFINER so an anonymous scan can bump a counter without any public
-- UPDATE grant on `redirects`. It touches only the two counter columns and
-- returns nothing, so it cannot be used to read or alter content.
-- ----------------------------------------------------------------------------
create or replace function public.register_scan(p_source text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.redirects
     set scan_count   = scan_count + 1,
         last_scan_at = now()
   where source = p_source
     and enabled;
end;
$$;

revoke all on function public.register_scan(text) from public;
grant execute on function public.register_scan(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- RPC: increment a recipe view counter. Same reasoning as above.
-- ----------------------------------------------------------------------------
create or replace function public.increment_recipe_view(p_slug text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.recipes
     set view_count = view_count + 1
   where slug = p_slug
     and deleted_at is null
     and status = 'published';
end;
$$;

revoke all on function public.increment_recipe_view(text) from public;
grant execute on function public.increment_recipe_view(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- RPC: has the CMS been claimed yet?
--
-- Lets the anonymous /admin/setup screen say "already configured" without
-- exposing the admins table.
-- ----------------------------------------------------------------------------
create or replace function public.admin_bootstrap_required()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select not exists (select 1 from public.admins where deleted_at is null);
$$;

revoke all on function public.admin_bootstrap_required() from public;
grant execute on function public.admin_bootstrap_required() to anon, authenticated;

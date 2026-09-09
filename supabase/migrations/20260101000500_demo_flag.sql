-- ============================================================================
-- NEYORA — 0006  `is_demo` marker
--
-- Seed content ships so the site is never empty on a fresh install. Every
-- seeded row is flagged here, which gives the admin UI a visible "Demo" badge
-- and makes removal a single, safe statement once real content exists:
--
--   select public.purge_demo_content();
-- ============================================================================

alter table public.pages              add column if not exists is_demo boolean not null default false;
alter table public.products           add column if not exists is_demo boolean not null default false;
alter table public.product_categories add column if not exists is_demo boolean not null default false;
alter table public.recipes            add column if not exists is_demo boolean not null default false;
alter table public.recipe_categories  add column if not exists is_demo boolean not null default false;
alter table public.faqs               add column if not exists is_demo boolean not null default false;
alter table public.testimonials       add column if not exists is_demo boolean not null default false;
alter table public.media              add column if not exists is_demo boolean not null default false;

create or replace function public.purge_demo_content()
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  removed jsonb := '{}'::jsonb;
  n integer;
begin
  if not public.is_admin_manager() then
    raise exception 'Only an owner or admin may purge demo content'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.recipes where is_demo;            get diagnostics n = row_count;
  removed := removed || jsonb_build_object('recipes', n);
  delete from public.recipe_categories where is_demo;  get diagnostics n = row_count;
  removed := removed || jsonb_build_object('recipe_categories', n);
  delete from public.products where is_demo;           get diagnostics n = row_count;
  removed := removed || jsonb_build_object('products', n);
  delete from public.product_categories where is_demo; get diagnostics n = row_count;
  removed := removed || jsonb_build_object('product_categories', n);
  delete from public.testimonials where is_demo;       get diagnostics n = row_count;
  removed := removed || jsonb_build_object('testimonials', n);
  delete from public.faqs where is_demo;               get diagnostics n = row_count;
  removed := removed || jsonb_build_object('faqs', n);
  -- Demo *pages* are intentionally kept: /about, /farm and friends are real
  -- routes. Rewrite their copy in the admin instead of deleting the rows.
  delete from public.media where is_demo;              get diagnostics n = row_count;
  removed := removed || jsonb_build_object('media', n);

  return removed::text;
end;
$$;

revoke all on function public.purge_demo_content() from public;
grant execute on function public.purge_demo_content() to authenticated;

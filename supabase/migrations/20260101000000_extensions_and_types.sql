-- ============================================================================
-- NEYORA — 0001  Extensions, enums and shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

-- Every piece of editable content moves through the same lifecycle.
-- 'scheduled' rows become publicly visible once scheduled_at <= now().
do $$ begin
  create type public.content_status as enum ('draft', 'scheduled', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_role as enum ('owner', 'admin', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recipe_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

-- Pack sizes are an enum so the recipe system can key ingredient sets by pack
-- without any free-text drift. 'flexible' means "works for any pack size".
do $$ begin
  create type public.pack_size as enum ('150g', '200g', '250g', '500g', 'flexible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_status as enum ('new', 'read', 'replied', 'archived', 'spam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'seasonal', 'coming_soon');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Slugify — used by seed data and as a safety net in the admin.
-- ----------------------------------------------------------------------------

create or replace function public.slugify(input text)
returns text
language sql
immutable
strict
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(public.unaccent(input)), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- Public visibility
--
-- The role-based helpers (is_admin, is_admin_manager) deliberately live in the
-- RLS migration instead of here: they are LANGUAGE SQL functions that
-- reference public.admins, and Postgres validates a SQL function body at
-- creation time — so they cannot be created before the table exists.
-- ----------------------------------------------------------------------------

-- Single source of truth for "can the public see this row?".
-- Used by every public SELECT policy so the rule can never drift per-table.
--
-- The test is driven by `published_at`, not by `status`, because the
-- sync_publication_timestamps trigger (migration 0003) keeps published_at
-- authoritative:
--
--   draft      -> published_at is NULL
--   published  -> published_at = now() at the moment of publishing
--   scheduled  -> published_at = scheduled_at
--
-- So a scheduled row becomes visible the instant its time passes, with no
-- cron job, no background worker and nothing to keep running. That matters:
-- pg_cron is not available on the Supabase free tier, and a scheduling
-- feature that silently never fires would be worse than not having one.
--
-- STABLE rather than IMMUTABLE because it reads now().
create or replace function public.is_publicly_visible(
  p_status       public.content_status,
  p_published_at timestamptz,
  p_deleted_at   timestamptz
)
returns boolean
language sql
stable
as $$
  select p_deleted_at is null
     and p_status <> 'draft'
     and p_published_at is not null
     and p_published_at <= now();
$$;

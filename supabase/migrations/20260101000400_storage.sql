-- ============================================================================
-- NEYORA — 0005  Supabase Storage: the media bucket
--
-- The bucket is PUBLIC on purpose. Public objects are served straight from
-- Supabase's CDN with no signing round-trip, which is what makes the media
-- library viable — and fast — on the free tier. Nothing private is ever stored
-- here; it holds marketing photography only.
--
-- Writes are still locked down: only signed-in admins may upload, replace or
-- delete objects.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  -- 8 MB. The uploader compresses to WebP in the browser before it ever gets
  -- here, so a legitimate upload lands far below this ceiling.
  8388608,
  array[
    'image/webp', 'image/jpeg', 'image/png', 'image/avif',
    'image/gif', 'image/svg+xml'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- Anyone may read objects in the media bucket.
drop policy if exists "neyora media public read" on storage.objects;
create policy "neyora media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Only admins may write. is_admin() is re-evaluated per statement, so
-- revoking someone's admin row immediately revokes their upload rights.
drop policy if exists "neyora media admin insert" on storage.objects;
create policy "neyora media admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "neyora media admin update" on storage.objects;
create policy "neyora media admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "neyora media admin delete" on storage.objects;
create policy "neyora media admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

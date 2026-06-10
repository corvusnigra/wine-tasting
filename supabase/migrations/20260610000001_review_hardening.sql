-- Review hardening: catalog write lockdown, storage restrictions,
-- display_name bounds, and fortified/orange wine types.

-- 1. Extend wine_type to cover fortified (port/sherry/madeira) and orange.
--    Additive: existing rows are unaffected.
alter table public.wines drop constraint if exists wines_wine_type_check;
alter table public.wines add constraint wines_wine_type_check
  check (wine_type in ('red','white','rose','sparkling','fortified','orange'));

-- 2. Bound display_name so a direct API call can't set a layout-breaking string.
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (char_length(display_name) between 1 and 60);

-- 3. Catalog (grapes/regions/producers/wines) is a shared reference set with no
--    per-row owner. Any authenticated guest could previously insert spam and it
--    could never be cleaned up via the client (no update/delete policies).
--    Restrict writes to group owners (the only people who add wines anyway).
create or replace function public.is_any_group_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where user_id = auth.uid() and role = 'owner'
  );
$$;

drop policy if exists "grapes_insert"    on public.grapes;
drop policy if exists "regions_insert"   on public.regions;
drop policy if exists "producers_insert" on public.producers;
drop policy if exists "wines_insert"     on public.wines;

create policy "grapes_insert"    on public.grapes    for insert to authenticated with check (public.is_any_group_owner());
create policy "regions_insert"   on public.regions   for insert to authenticated with check (public.is_any_group_owner());
create policy "producers_insert" on public.producers for insert to authenticated with check (public.is_any_group_owner());
create policy "wines_insert"     on public.wines     for insert to authenticated with check (public.is_any_group_owner());

-- Allow owners to fix/remove catalog rows (e.g. add a photo, delete a typo'd wine).
drop policy if exists "wines_update_owner" on public.wines;
drop policy if exists "wines_delete_owner" on public.wines;
create policy "wines_update_owner" on public.wines for update to authenticated using (public.is_any_group_owner());
create policy "wines_delete_owner" on public.wines for delete to authenticated using (public.is_any_group_owner());

-- 4. Storage: restrict label uploads to image extensions and let the uploader
--    delete their own files (the bucket previously took any file type, forever).
drop policy if exists "wine_labels_insert" on storage.objects;
drop policy if exists "wine_labels_delete" on storage.objects;

create policy "wine_labels_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wine-labels'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','heic','heif')
  );

create policy "wine_labels_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wine-labels' and owner = auth.uid());

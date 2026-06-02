-- Wine label photos: a column on wines + a public Storage bucket.
-- We store the snapshot only (no recognition) — enough to "remember the bottle".

alter table public.wines add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('wine-labels', 'wine-labels', true)
on conflict (id) do nothing;

-- Public read (labels are not sensitive), authenticated upload.
drop policy if exists "wine_labels_read" on storage.objects;
drop policy if exists "wine_labels_insert" on storage.objects;

create policy "wine_labels_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'wine-labels');

create policy "wine_labels_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wine-labels');

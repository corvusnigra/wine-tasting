-- Reference catalogue (grapes / regions / producers / descriptors) is public,
-- non-sensitive data. Gating SELECT behind `to authenticated` caused the
-- aroma palette to come back empty whenever the browser client's session
-- token wasn't attached yet (auth hydration race). Open read access to the
-- `anon` role too — there is nothing private here.

drop policy if exists "grapes_select" on public.grapes;
drop policy if exists "regions_select" on public.regions;
drop policy if exists "producers_select" on public.producers;
drop policy if exists "descriptors_select" on public.descriptors;

create policy "grapes_select" on public.grapes
  for select to anon, authenticated using (true);
create policy "regions_select" on public.regions
  for select to anon, authenticated using (true);
create policy "producers_select" on public.producers
  for select to anon, authenticated using (true);
create policy "descriptors_select" on public.descriptors
  for select to anon, authenticated using (true);

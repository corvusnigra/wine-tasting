-- "Only the admin creates evenings."
--
-- The group owner is the admin; everyone else is a guest who can join, see the
-- evening, and rate — but not create or manage evenings. Previously any member
-- could create a session in the group (sessions_insert_member); now only the
-- group owner can. Combined with 20260609000001 (host-only session/flight
-- writes) this means the owner is the sole host of everything in the group.
--
-- Works for both models: in the shared group only the owner (you) creates; in a
-- personal fallback group the user owns their own group, so they can still
-- create their own evenings.

drop policy if exists "sessions_insert_member" on public.tasting_sessions;
create policy "sessions_insert_owner" on public.tasting_sessions
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_group_owner(group_id)
  );

-- Tighten write access for the open/shared-group model.
--
-- Previously any group member could UPDATE any session and INSERT/UPDATE/DELETE
-- any wine in the group's flights (sessions_update_member / wis_*_member). That
-- was fine for small invite-only groups, but with everyone sharing one group a
-- random visitor could rename someone's evening, add/remove its wines, or flip
-- `revealed`/`status` directly (bypassing the host-only reveal API and the
-- "everyone rated" gate).
--
-- Now only the evening's HOST (its creator) may touch the session and its
-- flight. Members can still create their own evenings (sessions_insert_member)
-- and write their own notes (notes_*_own) — those policies are unchanged.

create or replace function public.is_session_host(_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasting_sessions
    where id = _session_id and created_by = auth.uid()
  );
$$;

-- tasting_sessions: only the creator may update (rename, status, etc.)
drop policy if exists "sessions_update_member" on public.tasting_sessions;
create policy "sessions_update_host" on public.tasting_sessions
  for update to authenticated using (created_by = auth.uid());

-- wines_in_session: only the parent session's host may add/edit/remove wines
drop policy if exists "wis_insert_member" on public.wines_in_session;
create policy "wis_insert_host" on public.wines_in_session
  for insert to authenticated with check (public.is_session_host(session_id));

drop policy if exists "wis_update_member" on public.wines_in_session;
create policy "wis_update_host" on public.wines_in_session
  for update to authenticated using (public.is_session_host(session_id));

drop policy if exists "wis_delete_member" on public.wines_in_session;
create policy "wis_delete_host" on public.wines_in_session
  for delete to authenticated using (public.is_session_host(session_id));

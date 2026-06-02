-- Host management needs DELETE policies (none existed):
--   - a session can be deleted by its creator or the group owner;
--   - a wine can be removed from a flight by any group member (before reveal).
-- Deleting a session cascades to wines_in_session → tasting_notes via FKs.

create policy "sessions_delete_host" on public.tasting_sessions
  for delete to authenticated using (
    created_by = auth.uid() or public.is_group_owner(group_id)
  );

create policy "wis_delete_member" on public.wines_in_session
  for delete to authenticated using (
    public.is_group_member(
      (select group_id from public.tasting_sessions where id = wines_in_session.session_id)
    )
  );

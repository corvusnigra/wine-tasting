-- Enable Realtime change events for the tables that drive the live
-- session-progress UI. Without this, postgres_changes subscriptions on
-- these tables yield nothing — only Broadcast / Presence channels work.

alter publication supabase_realtime add table public.tasting_notes;
alter publication supabase_realtime add table public.wines_in_session;

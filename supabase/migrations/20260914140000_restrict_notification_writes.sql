-- Remove anonymous write access to notifications.
--
-- allow_update_notifications and allow_delete_notifications were both granted to
-- `public` with qual `true`, so anyone holding the publishable key (which ships
-- in the client bundle) could mark every user's notifications as read, or delete
-- all of them outright. That is data loss, not a privacy issue.
--
-- They existed only because /api/notifications ran on the anon client and was
-- therefore subject to RLS itself. That route now uses the service role key and
-- enforces authorization in application code: it resolves the profile from
-- X-Sync-Key-Hash and scopes every query with .eq("user_profile_id", profile.id).
-- No client writes to this table directly, so nothing else needs these policies.
--
-- SELECT is deliberately left permissive. Realtime enforces RLS as the
-- subscribing client's role, so the live notification feed depends on it, and the
-- rows hold nothing private: title, body and data are all derived from public
-- reports, and user_favorites and user_profiles are themselves world-readable.
--
-- There is no INSERT policy, so inserts remain denied to anon and continue to
-- happen server-side.

drop policy if exists allow_update_notifications on public.notifications;
drop policy if exists allow_delete_notifications on public.notifications;

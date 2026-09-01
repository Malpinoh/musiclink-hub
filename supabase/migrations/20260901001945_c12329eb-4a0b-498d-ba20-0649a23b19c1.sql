-- Revoke public/anon execute on all new monetization functions
REVOKE EXECUTE ON FUNCTION public.monetization_log(text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_monetization_balance(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_for_monetization(public.monetization_provider) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_monetization_application(public.monetization_provider) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_monetization_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_monetization_application_status(uuid, public.monetization_application_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_monetization_zone(uuid, text, public.monetization_provider, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_monetization_zone(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_monetization_settings(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_monetization_import(public.monetization_provider, date, date, jsonb, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rematch_monetization_import(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_monetization_import(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_monetization_import(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reverse_monetization_import(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_monetization_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_monetization_artists() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.apply_for_monetization(public.monetization_provider) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_monetization_application(public.monetization_provider) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_monetization_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_monetization_application_status(uuid, public.monetization_application_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_monetization_zone(uuid, text, public.monetization_provider, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_monetization_zone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_monetization_settings(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_monetization_import(public.monetization_provider, date, date, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rematch_monetization_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_monetization_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_monetization_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_monetization_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monetization_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_monetization_artists() TO authenticated;

-- Public link pages need these two read-only checks for anonymous visitors
GRANT EXECUTE ON FUNCTION public.is_monetization_enabled_for_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_monetization_tag(uuid) TO anon, authenticated;

-- meta_cache had RLS enabled with no policies; make the intent explicit (service role only)
CREATE POLICY "No client access to meta cache" ON public.meta_cache FOR SELECT TO authenticated USING (false);
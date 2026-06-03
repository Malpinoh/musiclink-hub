
-- 1. analytics_events: bind user_id to caller
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. artist_link_clicks: require valid artist_profile_id
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.artist_link_clicks;
CREATE POLICY "Anyone can insert link clicks"
  ON public.artist_link_clicks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.artist_profiles ap
    WHERE ap.id = artist_link_clicks.artist_profile_id AND ap.is_active = true
  ));

-- 3. artist_profile_views: require valid artist_profile_id
DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.artist_profile_views;
CREATE POLICY "Anyone can insert profile views"
  ON public.artist_profile_views FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.artist_profiles ap
    WHERE ap.id = artist_profile_views.artist_profile_id AND ap.is_active = true
  ));

-- 4. fan_contacts: link_id must reference a published fanlink
DROP POLICY IF EXISTS "Anyone can insert fan contacts" ON public.fan_contacts;
CREATE POLICY "Anyone can insert fan contacts"
  ON public.fan_contacts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fanlinks f
    WHERE f.id = fan_contacts.link_id AND f.is_published = true
  ));

-- 5. presave_fans: pre_save_id must reference an active pre-save
DROP POLICY IF EXISTS "Anyone can insert fan signups" ON public.presave_fans;
CREATE POLICY "Anyone can insert fan signups"
  ON public.presave_fans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pre_saves p
    WHERE p.id = presave_fans.pre_save_id AND p.is_active = true
  ));

-- 6. presave_notifications: remove open public insert; service role bypasses RLS
DROP POLICY IF EXISTS "Service can insert notifications" ON public.presave_notifications;

-- 7. presave_streaming_links: remove open public insert/update; service role bypasses RLS
DROP POLICY IF EXISTS "Service can insert streaming links" ON public.presave_streaming_links;
DROP POLICY IF EXISTS "Service can update streaming links" ON public.presave_streaming_links;

-- 8. pre_save_actions: stop broadcasting Spotify tokens via realtime.
-- Re-add the table to the publication restricted to safe columns only.
ALTER PUBLICATION supabase_realtime DROP TABLE public.pre_save_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_save_actions
  (id, pre_save_id, action_type, spotify_user_id, completed,
   library_saved, library_saved_at, country, city, created_at);

-- Phase 1 security hardening for public fan and pre-save write paths.
-- Fan signups and Spotify token-bearing actions are written by trusted Edge Functions
-- using the service role. Public clients must not write these records directly.

DROP POLICY IF EXISTS "Anyone can insert fan signups" ON public.presave_fans;
DROP POLICY IF EXISTS "Public can insert pre-save actions" ON public.pre_save_actions;

-- Click telemetry is intentionally public, but only for published fanlinks.
DROP POLICY IF EXISTS "Anyone can insert clicks for valid fanlinks" ON public.clicks;
CREATE POLICY "Anyone can insert clicks for published fanlinks"
  ON public.clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fanlinks
      WHERE fanlinks.id = clicks.fanlink_id
        AND fanlinks.is_published = true
    )
  );

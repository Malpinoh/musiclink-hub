
-- Per-campaign release-day automation toggles
ALTER TABLE public.pre_saves
  ADD COLUMN IF NOT EXISTS auto_follow_artist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_add_to_playlist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS playlist_id text,
  ADD COLUMN IF NOT EXISTS send_release_email boolean NOT NULL DEFAULT true;

-- Link each Spotify pre-save action back to its fan + delivery audit
ALTER TABLE public.pre_save_actions
  ADD COLUMN IF NOT EXISTS fan_id uuid,
  ADD COLUMN IF NOT EXISTS fan_name text,
  ADD COLUMN IF NOT EXISTS fan_email text,
  ADD COLUMN IF NOT EXISTS artist_followed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS artist_followed_at timestamptz,
  ADD COLUMN IF NOT EXISTS playlist_added boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS playlist_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX IF NOT EXISTS idx_pre_save_actions_pre_save_id ON public.pre_save_actions(pre_save_id);
CREATE INDEX IF NOT EXISTS idx_pre_save_actions_fan_id ON public.pre_save_actions(fan_id);

-- Allow the public pre-save flow to insert actions for ACTIVE pre-saves only.
-- (Previously only service_role could insert; the new flow inserts from the
-- spotify-oauth-callback edge function, which already uses service role, but
-- we also need a public path for the optional fallback insert path.)
DROP POLICY IF EXISTS "Public can insert pre-save actions" ON public.pre_save_actions;
CREATE POLICY "Public can insert pre-save actions"
  ON public.pre_save_actions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pre_saves p
      WHERE p.id = pre_save_actions.pre_save_id
        AND p.is_active = true
    )
  );

GRANT INSERT ON public.pre_save_actions TO anon, authenticated;

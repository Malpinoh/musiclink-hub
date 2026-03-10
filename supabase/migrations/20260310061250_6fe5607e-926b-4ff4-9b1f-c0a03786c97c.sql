
-- Table for fan signups on pre-save campaigns
CREATE TABLE public.presave_fans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_save_id uuid NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  spotify_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pre_save_id, email)
);

ALTER TABLE public.presave_fans ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up for notifications (public form)
CREATE POLICY "Anyone can insert fan signups" ON public.presave_fans
  FOR INSERT TO public WITH CHECK (true);

-- Only the pre-save owner can view fan signups
CREATE POLICY "Owners can view fan signups" ON public.presave_fans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pre_saves
    WHERE pre_saves.id = presave_fans.pre_save_id
    AND pre_saves.user_id = auth.uid()
  ));

-- Table for logging sent notification emails
CREATE TABLE public.presave_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_save_id uuid NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL REFERENCES public.presave_fans(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

ALTER TABLE public.presave_notifications ENABLE ROW LEVEL SECURITY;

-- Only the pre-save owner can view notification logs
CREATE POLICY "Owners can view notifications" ON public.presave_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pre_saves
    WHERE pre_saves.id = presave_notifications.pre_save_id
    AND pre_saves.user_id = auth.uid()
  ));

-- Service role can insert notifications (from edge functions)
CREATE POLICY "Service can insert notifications" ON public.presave_notifications
  FOR INSERT TO public WITH CHECK (true);

-- Add description field to pre_saves if not exists
ALTER TABLE public.pre_saves ADD COLUMN IF NOT EXISTS description text;

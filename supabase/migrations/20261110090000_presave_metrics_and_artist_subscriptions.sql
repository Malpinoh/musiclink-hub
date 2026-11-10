-- Track unique pre-save landing-page visits for an honest campaign conversion rate.
CREATE TABLE IF NOT EXISTS public.presave_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_save_id UUID NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pre_save_id, visitor_id)
);
ALTER TABLE public.presave_page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can record pre-save page views" ON public.presave_page_views;
CREATE POLICY "Public can record pre-save page views"
  ON public.presave_page_views FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pre_saves ps
    WHERE ps.id = presave_page_views.pre_save_id AND ps.is_active = true
  ));
DROP POLICY IF EXISTS "Owners can view pre-save page views" ON public.presave_page_views;
CREATE POLICY "Owners can view pre-save page views"
  ON public.presave_page_views FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pre_saves ps
    WHERE ps.id = presave_page_views.pre_save_id AND ps.user_id = auth.uid()
  ));

-- Explicit opt-in to future release emails from an artist (separate from one-campaign signup).
CREATE TABLE IF NOT EXISTS public.artist_email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  fan_name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  source_pre_save_id UUID REFERENCES public.pre_saves(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_user_id, email)
);
CREATE INDEX IF NOT EXISTS idx_artist_email_subscriptions_active
  ON public.artist_email_subscriptions (artist_user_id, is_active);
ALTER TABLE public.artist_email_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Artists can view their subscribers" ON public.artist_email_subscriptions;
CREATE POLICY "Artists can view their subscribers"
  ON public.artist_email_subscriptions FOR SELECT TO authenticated
  USING (artist_user_id = auth.uid());

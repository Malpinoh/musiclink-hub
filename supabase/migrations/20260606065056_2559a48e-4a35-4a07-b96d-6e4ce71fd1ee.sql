-- Ad campaigns
CREATE TABLE public.ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_url TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Learn More',
  is_house_ad BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  cpm_cents INTEGER NOT NULL DEFAULT 0,
  cpc_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_campaigns TO anon, authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
ON public.ad_campaigns FOR SELECT
TO anon, authenticated
USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- Ad impressions / clicks
CREATE TABLE public.ad_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  artist_user_id UUID,
  pre_save_id UUID,
  fanlink_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click')),
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_impressions_campaign ON public.ad_impressions(ad_campaign_id);
CREATE INDEX idx_ad_impressions_artist ON public.ad_impressions(artist_user_id);
CREATE INDEX idx_ad_impressions_created ON public.ad_impressions(created_at DESC);

GRANT INSERT ON public.ad_impressions TO anon, authenticated;
GRANT SELECT ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log ad events"
ON public.ad_impressions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Artists can view their own ad events"
ON public.ad_impressions FOR SELECT
TO authenticated
USING (artist_user_id = auth.uid());

-- Per-artist revenue summary
CREATE TABLE public.ad_revenue_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_user_id UUID NOT NULL UNIQUE,
  total_impressions BIGINT NOT NULL DEFAULT 0,
  total_clicks BIGINT NOT NULL DEFAULT 0,
  total_earned_cents BIGINT NOT NULL DEFAULT 0,
  total_paid_cents BIGINT NOT NULL DEFAULT 0,
  share_percent INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_revenue_shares TO authenticated;
GRANT ALL ON public.ad_revenue_shares TO service_role;
ALTER TABLE public.ad_revenue_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own revenue"
ON public.ad_revenue_shares FOR SELECT
TO authenticated
USING (artist_user_id = auth.uid());

-- Seed a default house ad
INSERT INTO public.ad_campaigns (advertiser, title, description, target_url, cta_text, is_house_ad)
VALUES (
  'MALPINOHDISTRO',
  'Distribute your music worldwide',
  'Get your music on Spotify, Apple Music & 150+ platforms — keep 100% royalties.',
  'https://malpinohdistro.com.ng',
  'Start Distributing',
  true
);
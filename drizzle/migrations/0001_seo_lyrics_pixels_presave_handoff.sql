ALTER TABLE public.fanlinks
  ADD COLUMN IF NOT EXISTS lyrics text,
  ADD COLUMN IF NOT EXISTS credits text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
  ADD COLUMN IF NOT EXISTS google_analytics_id text;
ALTER TABLE public.pre_saves
  ADD COLUMN IF NOT EXISTS target_fanlink_id uuid,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
  ADD COLUMN IF NOT EXISTS google_analytics_id text;
CREATE INDEX IF NOT EXISTS idx_fanlinks_artist_slug_pub ON public.fanlinks(artist_slug) WHERE is_published = true;
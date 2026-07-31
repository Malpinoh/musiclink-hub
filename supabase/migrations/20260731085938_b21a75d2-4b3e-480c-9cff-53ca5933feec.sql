-- 1. fanlinks: release vs track awareness
ALTER TABLE public.fanlinks
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'track',
  ADD COLUMN IF NOT EXISTS tracklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_tracks integer;

-- 2. releases
CREATE TABLE IF NOT EXISTS public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fanlink_id uuid REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  upc text,
  artist_name text NOT NULL,
  release_title text NOT NULL,
  release_type text NOT NULL DEFAULT 'Album',
  artwork text,
  release_date text,
  spotify_release_url text,
  apple_release_url text,
  youtube_release_url text,
  deezer_release_url text,
  tidal_release_url text,
  amazon_release_url text,
  boomplay_release_url text,
  audiomack_release_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS releases_upc_user_idx ON public.releases (user_id, upc) WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS releases_fanlink_idx ON public.releases (fanlink_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT SELECT ON public.releases TO anon;
GRANT ALL ON public.releases TO service_role;

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their releases"
  ON public.releases FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view releases of published fanlinks"
  ON public.releases FOR SELECT TO anon, authenticated
  USING (
    fanlink_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.fanlinks f
      WHERE f.id = releases.fanlink_id AND f.is_published = true
    )
  );

-- 3. tracks
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  isrc text,
  track_number integer,
  track_title text NOT NULL,
  duration_ms integer,
  spotify_track_url text,
  apple_track_url text,
  youtube_track_url text,
  deezer_track_url text,
  tidal_track_url text,
  amazon_track_url text,
  boomplay_track_url text,
  audiomack_track_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracks_release_idx ON public.tracks (release_id);
CREATE UNIQUE INDEX IF NOT EXISTS tracks_release_number_idx ON public.tracks (release_id, track_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT SELECT ON public.tracks TO anon;
GRANT ALL ON public.tracks TO service_role;

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their tracks"
  ON public.tracks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.releases r WHERE r.id = tracks.release_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.releases r WHERE r.id = tracks.release_id AND r.user_id = auth.uid()));

CREATE POLICY "Public can view tracks of published releases"
  ON public.tracks FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.releases r
    JOIN public.fanlinks f ON f.id = r.fanlink_id
    WHERE r.id = tracks.release_id AND f.is_published = true
  ));

-- 4. triggers for updated_at
DROP TRIGGER IF EXISTS update_releases_updated_at ON public.releases;
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracks_updated_at ON public.tracks;
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. analytics: separate release vs track click attribution
ALTER TABLE public.clicks
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'track';

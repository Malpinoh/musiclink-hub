-- ============================================================
-- MDISTRO LINK → MALPINOHDISTRO MERGER MIGRATION
-- Run this SQL in your MALPINOHDISTRO Supabase SQL editor
-- ============================================================

-- ========================
-- 1. PROFILES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================
-- 2. ARTIST PROFILES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text,
  profile_picture_url text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  instagram_url text,
  tiktok_url text,
  twitter_url text,
  facebook_url text,
  youtube_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active artist profiles" ON public.artist_profiles;
CREATE POLICY "Anyone can view active artist profiles" ON public.artist_profiles
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view their own artist profile" ON public.artist_profiles;
CREATE POLICY "Users can view their own artist profile" ON public.artist_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own artist profile" ON public.artist_profiles;
CREATE POLICY "Users can create their own artist profile" ON public.artist_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own artist profile" ON public.artist_profiles;
CREATE POLICY "Users can update their own artist profile" ON public.artist_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own artist profile" ON public.artist_profiles;
CREATE POLICY "Users can delete their own artist profile" ON public.artist_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ========================
-- 3. ARTIST CUSTOM BUTTONS
-- ========================
CREATE TABLE IF NOT EXISTS public.artist_custom_buttons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_custom_buttons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view custom buttons for active profiles" ON public.artist_custom_buttons;
CREATE POLICY "Anyone can view custom buttons for active profiles" ON public.artist_custom_buttons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_profile_id AND is_active = true)
  );

DROP POLICY IF EXISTS "Users can manage their own custom buttons" ON public.artist_custom_buttons;
CREATE POLICY "Users can manage their own custom buttons" ON public.artist_custom_buttons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_profile_id AND user_id = auth.uid())
  );

-- ========================
-- 4. FANLINKS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.fanlinks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  artist_slug text NOT NULL,
  slug text NOT NULL,
  artwork_url text,
  release_date text,
  release_type text DEFAULT 'Single',
  upc text,
  isrc text,
  is_published boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_slug, slug)
);

ALTER TABLE public.fanlinks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published fanlinks" ON public.fanlinks;
CREATE POLICY "Anyone can view published fanlinks" ON public.fanlinks
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Users can view their own fanlinks" ON public.fanlinks;
CREATE POLICY "Users can view their own fanlinks" ON public.fanlinks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own fanlinks" ON public.fanlinks;
CREATE POLICY "Users can create their own fanlinks" ON public.fanlinks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own fanlinks" ON public.fanlinks;
CREATE POLICY "Users can update their own fanlinks" ON public.fanlinks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own fanlinks" ON public.fanlinks;
CREATE POLICY "Users can delete their own fanlinks" ON public.fanlinks
  FOR DELETE USING (auth.uid() = user_id);

-- ========================
-- 5. PLATFORM LINKS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.platform_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fanlink_id uuid NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  platform_name text NOT NULL,
  platform_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view platform links for published fanlinks" ON public.platform_links;
CREATE POLICY "Anyone can view platform links for published fanlinks" ON public.platform_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.fanlinks WHERE id = fanlink_id AND is_published = true)
  );

DROP POLICY IF EXISTS "Users can manage platform links for their fanlinks" ON public.platform_links;
CREATE POLICY "Users can manage platform links for their fanlinks" ON public.platform_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.fanlinks WHERE id = fanlink_id AND user_id = auth.uid())
  );

-- ========================
-- 6. CLICKS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fanlink_id uuid NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  platform_name text,
  user_agent text,
  ip_address text,
  country text,
  city text,
  device_type text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.clicks;
CREATE POLICY "Anyone can insert clicks" ON public.clicks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view clicks for their fanlinks" ON public.clicks;
CREATE POLICY "Users can view clicks for their fanlinks" ON public.clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.fanlinks WHERE id = fanlink_id AND user_id = auth.uid())
  );

-- ========================
-- 7. PRE_SAVES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.pre_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  artist_slug text NOT NULL,
  slug text NOT NULL,
  artwork_url text,
  release_date text,
  spotify_uri text,
  spotify_album_id text,
  spotify_artist_id text,
  apple_music_url text,
  apple_music_resolved boolean DEFAULT false,
  isrc text,
  upc text,
  album_title text,
  is_active boolean DEFAULT true,
  is_released boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_slug, slug)
);

ALTER TABLE public.pre_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active pre-saves" ON public.pre_saves;
CREATE POLICY "Anyone can view active pre-saves" ON public.pre_saves
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view their own pre-saves" ON public.pre_saves;
CREATE POLICY "Users can view their own pre-saves" ON public.pre_saves
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own pre-saves" ON public.pre_saves;
CREATE POLICY "Users can create their own pre-saves" ON public.pre_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pre-saves" ON public.pre_saves;
CREATE POLICY "Users can update their own pre-saves" ON public.pre_saves
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pre-saves" ON public.pre_saves;
CREATE POLICY "Users can delete their own pre-saves" ON public.pre_saves
  FOR DELETE USING (auth.uid() = user_id);

-- ========================
-- 8. PRE_SAVE_ACTIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.pre_save_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pre_save_id uuid NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  email text,
  spotify_user_id text,
  spotify_access_token text,
  spotify_refresh_token text,
  token_expires_at timestamptz,
  completed boolean DEFAULT false,
  library_saved boolean DEFAULT false,
  library_saved_at timestamptz,
  country text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_save_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create pre-save actions" ON public.pre_save_actions;
CREATE POLICY "Anyone can create pre-save actions" ON public.pre_save_actions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their pre-save actions" ON public.pre_save_actions;
CREATE POLICY "Users can view their pre-save actions" ON public.pre_save_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pre_saves WHERE id = pre_save_id AND user_id = auth.uid())
  );

-- ========================
-- 9. ARTIST ANALYTICS TABLES
-- ========================
CREATE TABLE IF NOT EXISTS public.artist_profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  ip_address text,
  country text,
  user_agent text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.artist_profile_views;
CREATE POLICY "Anyone can insert profile views" ON public.artist_profile_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own profile views" ON public.artist_profile_views;
CREATE POLICY "Users can view their own profile views" ON public.artist_profile_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_profile_id AND user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.artist_link_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  link_label text,
  link_url text,
  ip_address text,
  country text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.artist_link_clicks;
CREATE POLICY "Anyone can insert link clicks" ON public.artist_link_clicks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own link clicks" ON public.artist_link_clicks;
CREATE POLICY "Users can view their own link clicks" ON public.artist_link_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_profile_id AND user_id = auth.uid())
  );

-- ========================
-- 10. AUTO-UPDATED TIMESTAMPS
-- ========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fanlinks', 'pre_saves', 'artist_profiles', 'profiles'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON public.%s
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ========================
-- 11. STORAGE BUCKET FOR ARTWORK
-- ========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork', 'artwork', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view artwork" ON storage.objects;
CREATE POLICY "Anyone can view artwork" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork');

DROP POLICY IF EXISTS "Authenticated users can upload artwork" ON storage.objects;
CREATE POLICY "Authenticated users can upload artwork" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their artwork" ON storage.objects;
CREATE POLICY "Users can update their artwork" ON storage.objects
  FOR UPDATE USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their artwork" ON storage.objects;
CREATE POLICY "Users can delete their artwork" ON storage.objects
  FOR DELETE USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================
-- 12. RLS: Allow MDISTRO LINK to read approved releases
-- ========================
DROP POLICY IF EXISTS "Public can read approved releases" ON public.releases;
CREATE POLICY "Public can read approved releases" ON public.releases
  FOR SELECT USING (status = 'approved');

-- ========================
-- DONE!
-- ========================


-- Create artist_profiles table
CREATE TABLE public.artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text,
  profile_picture_url text,
  is_verified boolean DEFAULT false,
  instagram_url text,
  tiktok_url text,
  twitter_url text,
  facebook_url text,
  youtube_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active artist profiles"
  ON public.artist_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own artist profile"
  ON public.artist_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artist profile"
  ON public.artist_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artist profile"
  ON public.artist_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artist profile"
  ON public.artist_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create artist_custom_buttons table
CREATE TABLE public.artist_custom_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_custom_buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom buttons for active profiles"
  ON public.artist_custom_buttons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = artist_custom_buttons.artist_profile_id
    AND artist_profiles.is_active = true
  ));

CREATE POLICY "Users can manage their own custom buttons"
  ON public.artist_custom_buttons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = artist_custom_buttons.artist_profile_id
    AND artist_profiles.user_id = auth.uid()
  ));

-- Create artist_profile_views table
CREATE TABLE public.artist_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  country text,
  user_agent text
);

ALTER TABLE public.artist_profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views"
  ON public.artist_profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own profile views"
  ON public.artist_profile_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = artist_profile_views.artist_profile_id
    AND artist_profiles.user_id = auth.uid()
  ));

-- Create artist_link_clicks table
CREATE TABLE public.artist_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  link_label text,
  link_url text,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  country text
);

ALTER TABLE public.artist_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert link clicks"
  ON public.artist_link_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own link clicks"
  ON public.artist_link_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = artist_link_clicks.artist_profile_id
    AND artist_profiles.user_id = auth.uid()
  ));

-- Trigger to update updated_at on artist_profiles
CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

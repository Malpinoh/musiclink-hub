-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create fanlinks table
CREATE TABLE public.fanlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork_url TEXT,
  release_date TEXT,
  release_type TEXT DEFAULT 'Single',
  upc TEXT,
  isrc TEXT,
  slug TEXT NOT NULL,
  artist_slug TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_slug, slug)
);

-- Enable RLS on fanlinks
ALTER TABLE public.fanlinks ENABLE ROW LEVEL SECURITY;

-- Fanlinks policies - users can manage their own, public can view published
CREATE POLICY "Anyone can view published fanlinks"
  ON public.fanlinks FOR SELECT
  USING (is_published = true);

CREATE POLICY "Users can view their own fanlinks"
  ON public.fanlinks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fanlinks"
  ON public.fanlinks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fanlinks"
  ON public.fanlinks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fanlinks"
  ON public.fanlinks FOR DELETE
  USING (auth.uid() = user_id);

-- Create platform_links table for streaming links
CREATE TABLE public.platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanlink_id UUID NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on platform_links
ALTER TABLE public.platform_links ENABLE ROW LEVEL SECURITY;

-- Platform links policies
CREATE POLICY "Anyone can view platform links for published fanlinks"
  ON public.platform_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fanlinks 
      WHERE fanlinks.id = platform_links.fanlink_id 
      AND fanlinks.is_published = true
    )
  );

CREATE POLICY "Users can manage platform links for their fanlinks"
  ON public.platform_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fanlinks 
      WHERE fanlinks.id = platform_links.fanlink_id 
      AND fanlinks.user_id = auth.uid()
    )
  );

-- Create clicks table for analytics
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanlink_id UUID NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  platform_name TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on clicks
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Clicks policies - anyone can insert (for tracking), owners can view
CREATE POLICY "Anyone can insert clicks"
  ON public.clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view clicks for their fanlinks"
  ON public.clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fanlinks 
      WHERE fanlinks.id = clicks.fanlink_id 
      AND fanlinks.user_id = auth.uid()
    )
  );

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fanlinks_updated_at
  BEFORE UPDATE ON public.fanlinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_fanlinks_user_id ON public.fanlinks(user_id);
CREATE INDEX idx_fanlinks_slugs ON public.fanlinks(artist_slug, slug);
CREATE INDEX idx_platform_links_fanlink_id ON public.platform_links(fanlink_id);
CREATE INDEX idx_clicks_fanlink_id ON public.clicks(fanlink_id);
CREATE INDEX idx_clicks_clicked_at ON public.clicks(clicked_at);
-- Create pre_saves table for storing pre-save links
CREATE TABLE public.pre_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  slug TEXT NOT NULL,
  artist_slug TEXT NOT NULL,
  artwork_url TEXT,
  release_date TEXT,
  spotify_uri TEXT,
  spotify_album_id TEXT,
  spotify_artist_id TEXT,
  isrc TEXT,
  upc TEXT,
  album_title TEXT,
  is_released BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_slug, slug)
);

-- Enable RLS
ALTER TABLE public.pre_saves ENABLE ROW LEVEL SECURITY;

-- Policies for pre_saves
CREATE POLICY "Anyone can view active pre-saves"
ON public.pre_saves
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their own pre-saves"
ON public.pre_saves
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pre-saves"
ON public.pre_saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pre-saves"
ON public.pre_saves
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pre-saves"
ON public.pre_saves
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_pre_saves_updated_at
BEFORE UPDATE ON public.pre_saves
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create pre_save_actions table to track user pre-save actions
CREATE TABLE public.pre_save_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pre_save_id UUID NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  email TEXT,
  spotify_user_id TEXT,
  action_type TEXT NOT NULL, -- 'save_track', 'follow_artist', 'save_album'
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pre_save_actions
ALTER TABLE public.pre_save_actions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert pre-save actions (public signups)
CREATE POLICY "Anyone can create pre-save actions"
ON public.pre_save_actions
FOR INSERT
WITH CHECK (true);

-- Users can view actions for their pre-saves
CREATE POLICY "Users can view their pre-save actions"
ON public.pre_save_actions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pre_saves
  WHERE pre_saves.id = pre_save_actions.pre_save_id
  AND pre_saves.user_id = auth.uid()
));
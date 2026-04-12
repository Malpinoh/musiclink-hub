
-- Create link_themes table
CREATE TABLE public.link_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  background_color text NOT NULL DEFAULT '#000000',
  button_color text NOT NULL DEFAULT '#1DB954',
  text_color text NOT NULL DEFAULT '#ffffff',
  font_family text NOT NULL DEFAULT 'Inter',
  layout_style text NOT NULL DEFAULT 'card',
  theme_mode text NOT NULL DEFAULT 'dark',
  logo_url text,
  background_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(link_id)
);

-- Enable RLS
ALTER TABLE public.link_themes ENABLE ROW LEVEL SECURITY;

-- Anyone can view themes for published fanlinks
CREATE POLICY "Anyone can view themes for published fanlinks"
ON public.link_themes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fanlinks
    WHERE fanlinks.id = link_themes.link_id
    AND fanlinks.is_published = true
  )
);

-- Owners can manage their own themes
CREATE POLICY "Users can manage their own link themes"
ON public.link_themes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fanlinks
    WHERE fanlinks.id = link_themes.link_id
    AND fanlinks.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fanlinks
    WHERE fanlinks.id = link_themes.link_id
    AND fanlinks.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_link_themes_updated_at
BEFORE UPDATE ON public.link_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for link assets
INSERT INTO storage.buckets (id, name, public) VALUES ('link-assets', 'link-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view link assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'link-assets');

CREATE POLICY "Authenticated users can upload link assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'link-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own link assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'link-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own link assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'link-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

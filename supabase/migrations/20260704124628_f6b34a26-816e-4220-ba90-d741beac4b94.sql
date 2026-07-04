CREATE TABLE public.pre_save_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_save_id uuid NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  background_color text NOT NULL DEFAULT '#0a0a0f',
  text_color text NOT NULL DEFAULT '#ffffff',
  button_color text NOT NULL DEFAULT '#1DB954',
  accent_color text NOT NULL DEFAULT '#a855f7',
  font_family text NOT NULL DEFAULT 'Inter',
  layout_style text NOT NULL DEFAULT 'centered',
  countdown_enabled boolean NOT NULL DEFAULT true,
  cta_text text NOT NULL DEFAULT 'Pre-Save Now',
  background_image_url text,
  hero_image_url text,
  artist_image_url text,
  logo_url text,
  section_order jsonb NOT NULL DEFAULT '["hero","countdown","form","platforms"]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pre_save_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_save_themes TO authenticated;
GRANT SELECT ON public.pre_save_themes TO anon;
GRANT ALL ON public.pre_save_themes TO service_role;

ALTER TABLE public.pre_save_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view themes for active pre-saves"
ON public.pre_save_themes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pre_saves
    WHERE pre_saves.id = pre_save_themes.pre_save_id
      AND pre_saves.is_active = true
  )
);

CREATE POLICY "Owners can manage their pre-save themes"
ON public.pre_save_themes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pre_saves
    WHERE pre_saves.id = pre_save_themes.pre_save_id
      AND pre_saves.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pre_saves
    WHERE pre_saves.id = pre_save_themes.pre_save_id
      AND pre_saves.user_id = auth.uid()
  )
);

CREATE TRIGGER update_pre_save_themes_updated_at
BEFORE UPDATE ON public.pre_save_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
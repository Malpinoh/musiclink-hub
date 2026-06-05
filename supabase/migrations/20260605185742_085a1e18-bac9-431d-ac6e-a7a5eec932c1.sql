
ALTER TABLE public.pre_saves
  ADD COLUMN IF NOT EXISTS theme_bg_color text,
  ADD COLUMN IF NOT EXISTS theme_text_color text,
  ADD COLUMN IF NOT EXISTS theme_accent_color text,
  ADD COLUMN IF NOT EXISTS theme_button_color text,
  ADD COLUMN IF NOT EXISTS theme_button_text_color text,
  ADD COLUMN IF NOT EXISTS theme_font_family text,
  ADD COLUMN IF NOT EXISTS theme_bg_image_url text,
  ADD COLUMN IF NOT EXISTS theme_hero_image_url text,
  ADD COLUMN IF NOT EXISTS theme_cta_text text,
  ADD COLUMN IF NOT EXISTS theme_countdown_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS theme_layout text NOT NULL DEFAULT 'classic';

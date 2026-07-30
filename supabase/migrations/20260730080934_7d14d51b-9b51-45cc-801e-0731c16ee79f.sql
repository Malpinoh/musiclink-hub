GRANT SELECT ON public.artist_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_profiles TO authenticated;
GRANT ALL ON public.artist_profiles TO service_role;

GRANT SELECT ON public.artist_custom_buttons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_custom_buttons TO authenticated;
GRANT ALL ON public.artist_custom_buttons TO service_role;
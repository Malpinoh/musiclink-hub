CREATE TABLE IF NOT EXISTS public.meta_cache (
  path text PRIMARY KEY,
  html text NOT NULL,
  etag text NOT NULL,
  entity_type text,
  entity_id uuid,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.meta_cache TO service_role;

ALTER TABLE public.meta_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_meta_cache_entity ON public.meta_cache (entity_id);

CREATE OR REPLACE FUNCTION public.invalidate_meta_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target uuid;
BEGIN
  target := NULLIF(to_jsonb(COALESCE(NEW, OLD)) ->> TG_ARGV[0], '')::uuid;
  IF target IS NOT NULL THEN
    DELETE FROM public.meta_cache WHERE entity_id = target;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS invalidate_meta_fanlinks ON public.fanlinks;
CREATE TRIGGER invalidate_meta_fanlinks
AFTER INSERT OR UPDATE OR DELETE ON public.fanlinks
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('id');

DROP TRIGGER IF EXISTS invalidate_meta_platform_links ON public.platform_links;
CREATE TRIGGER invalidate_meta_platform_links
AFTER INSERT OR UPDATE OR DELETE ON public.platform_links
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('fanlink_id');

DROP TRIGGER IF EXISTS invalidate_meta_link_themes ON public.link_themes;
CREATE TRIGGER invalidate_meta_link_themes
AFTER INSERT OR UPDATE OR DELETE ON public.link_themes
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('link_id');

DROP TRIGGER IF EXISTS invalidate_meta_pre_saves ON public.pre_saves;
CREATE TRIGGER invalidate_meta_pre_saves
AFTER INSERT OR UPDATE OR DELETE ON public.pre_saves
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('id');

DROP TRIGGER IF EXISTS invalidate_meta_presave_links ON public.presave_streaming_links;
CREATE TRIGGER invalidate_meta_presave_links
AFTER INSERT OR UPDATE OR DELETE ON public.presave_streaming_links
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('pre_save_id');

DROP TRIGGER IF EXISTS invalidate_meta_artist_profiles ON public.artist_profiles;
CREATE TRIGGER invalidate_meta_artist_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.artist_profiles
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('id');

DROP TRIGGER IF EXISTS invalidate_meta_artist_buttons ON public.artist_custom_buttons;
CREATE TRIGGER invalidate_meta_artist_buttons
AFTER INSERT OR UPDATE OR DELETE ON public.artist_custom_buttons
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('artist_profile_id');
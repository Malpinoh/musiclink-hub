ALTER TABLE public.monetization_zones ADD COLUMN IF NOT EXISTS tag_code text;

CREATE OR REPLACE FUNCTION public.assign_monetization_zone(_user_id uuid, _zone_id text, _provider monetization_provider DEFAULT 'monetag'::monetization_provider, _note text DEFAULT NULL::text, _tag_code text DEFAULT NULL::text)
 RETURNS monetization_zones
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE old_zone public.monetization_zones; new_zone public.monetization_zones;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _zone_id IS NULL OR btrim(_zone_id) = '' THEN RAISE EXCEPTION 'Zone ID required'; END IF;

  IF EXISTS (SELECT 1 FROM public.monetization_zones WHERE provider = _provider AND zone_id = btrim(_zone_id)) THEN
    RAISE EXCEPTION 'Zone % is already registered for this provider', _zone_id;
  END IF;

  SELECT * INTO old_zone FROM public.monetization_zones
   WHERE user_id = _user_id AND provider = _provider AND status = 'active';

  IF old_zone.id IS NOT NULL THEN
    UPDATE public.monetization_zones SET status = 'replaced' WHERE id = old_zone.id;
  END IF;

  INSERT INTO public.monetization_zones (user_id, provider, zone_id, assigned_by, note, tag_code)
  VALUES (_user_id, _provider, btrim(_zone_id), auth.uid(), _note, NULLIF(btrim(COALESCE(_tag_code, '')), ''))
  RETURNING * INTO new_zone;

  IF old_zone.id IS NOT NULL THEN
    UPDATE public.monetization_zones SET replaced_by_zone_uuid = new_zone.id WHERE id = old_zone.id;
  END IF;

  PERFORM public.monetization_log('zone_assign', 'zone', new_zone.id, to_jsonb(old_zone), to_jsonb(new_zone));

  IF old_zone.id IS NULL THEN
    PERFORM public.notify_user(_user_id, 'monetization_activated',
      'Monetization is now active',
      'Link monetization is live on your pages. Your weekly earnings will start showing in your earnings dashboard.',
      '/artist/revenue');
  END IF;

  RETURN new_zone;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_monetization_zone_tag(_zone_uuid uuid, _tag_code text)
 RETURNS public.monetization_zones
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE before_zone public.monetization_zones; after_zone public.monetization_zones;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO before_zone FROM public.monetization_zones WHERE id = _zone_uuid;
  IF before_zone.id IS NULL THEN RAISE EXCEPTION 'Zone not found'; END IF;

  UPDATE public.monetization_zones
     SET tag_code = NULLIF(btrim(COALESCE(_tag_code, '')), ''), updated_at = now()
   WHERE id = _zone_uuid
  RETURNING * INTO after_zone;

  PERFORM public.monetization_log('zone_tag_update', 'zone', after_zone.id, to_jsonb(before_zone), to_jsonb(after_zone));
  RETURN after_zone;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_monetization_tag(uuid);
DROP FUNCTION IF EXISTS public.list_monetization_artists();

CREATE OR REPLACE FUNCTION public.get_monetization_tag(_user_id uuid)
 RETURNS TABLE(provider text, zone_id text, tag_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT z.provider::text, z.zone_id, z.tag_code
  FROM public.monetization_zones z
  JOIN public.monetization_applications a ON a.user_id = z.user_id AND a.provider = z.provider
  WHERE z.user_id = _user_id AND z.status = 'active' AND a.status = 'approved'
    AND z.provider = 'monetag'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.list_monetization_artists()
 RETURNS TABLE(user_id uuid, full_name text, username text, display_name text, application_status text, early_access boolean, applied_at timestamp with time zone, zone_uuid uuid, zone_id text, tag_code text, lifetime_artist_cents bigint, available_cents bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.user_id,
         p.full_name,
         ap.username,
         ap.display_name,
         a.status::text,
         a.early_access,
         a.applied_at,
         z.id,
         z.zone_id,
         z.tag_code,
         COALESCE(b.lifetime_artist_cents, 0),
         COALESCE(b.available_cents, 0)
  FROM public.monetization_applications a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN public.artist_profiles ap ON ap.user_id = a.user_id
  LEFT JOIN public.monetization_zones z ON z.user_id = a.user_id AND z.provider = a.provider AND z.status = 'active'
  LEFT JOIN public.monetization_balances b ON b.user_id = a.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.applied_at DESC;
$function$;
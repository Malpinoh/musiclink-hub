CREATE OR REPLACE FUNCTION public.get_click_dimensions(_user_id uuid, _start timestamptz)
RETURNS TABLE(dimension text, value text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'platform'::text, c.platform_name, count(*)
  FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
  WHERE f.user_id = _user_id AND c.clicked_at >= _start AND c.platform_name IS NOT NULL
  GROUP BY c.platform_name
  UNION ALL
  SELECT 'country'::text, COALESCE(c.country, 'Unknown'), count(*)
  FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
  WHERE f.user_id = _user_id AND c.clicked_at >= _start
  GROUP BY c.country;
$$;

REVOKE EXECUTE ON FUNCTION public.get_click_dimensions(uuid, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_campaign_totals(uuid, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_campaign_timeseries(uuid, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_fanlink_breakdown(uuid, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_presave_breakdown(uuid, timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_click_dimensions(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_presave_breakdown(uuid, timestamptz) TO authenticated;
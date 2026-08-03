CREATE INDEX IF NOT EXISTS idx_clicks_fanlink_platform_time
  ON public.clicks (fanlink_id, platform_name, clicked_at DESC);

DROP FUNCTION IF EXISTS public.get_campaign_totals(uuid, timestamptz);
CREATE OR REPLACE FUNCTION public.get_campaign_totals(_user_id uuid, _start timestamptz)
RETURNS TABLE(total_clicks bigint, total_views bigint, total_platform_clicks bigint, total_fans bigint, total_presaves bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
       WHERE f.user_id = _user_id AND c.clicked_at >= _start),
    (SELECT count(*) FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
       WHERE f.user_id = _user_id AND c.clicked_at >= _start AND c.platform_name IS NULL),
    (SELECT count(*) FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
       WHERE f.user_id = _user_id AND c.clicked_at >= _start AND c.platform_name IS NOT NULL),
    (SELECT count(*) FROM public.fan_contacts fc JOIN public.fanlinks f ON f.id = fc.link_id
       WHERE f.user_id = _user_id AND fc.collected_at >= _start),
    (SELECT count(*) FROM public.pre_save_actions a JOIN public.pre_saves p ON p.id = a.pre_save_id
       WHERE p.user_id = _user_id AND a.created_at >= _start);
$$;

DROP FUNCTION IF EXISTS public.get_campaign_timeseries(uuid, timestamptz);
CREATE OR REPLACE FUNCTION public.get_campaign_timeseries(_user_id uuid, _start timestamptz)
RETURNS TABLE(day date, clicks bigint, views bigint, platform_clicks bigint, fans bigint, presaves bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT date_trunc('day', cl.clicked_at)::date AS d,
           count(*) AS n,
           count(*) FILTER (WHERE cl.platform_name IS NULL) AS v,
           count(*) FILTER (WHERE cl.platform_name IS NOT NULL) AS pc
    FROM public.clicks cl JOIN public.fanlinks f ON f.id = cl.fanlink_id
    WHERE f.user_id = _user_id AND cl.clicked_at >= _start
    GROUP BY 1
  ),
  fa AS (
    SELECT date_trunc('day', fc.collected_at)::date AS d, count(*) AS n
    FROM public.fan_contacts fc JOIN public.fanlinks f ON f.id = fc.link_id
    WHERE f.user_id = _user_id AND fc.collected_at >= _start
    GROUP BY 1
  ),
  ps AS (
    SELECT date_trunc('day', a.created_at)::date AS d, count(*) AS n
    FROM public.pre_save_actions a JOIN public.pre_saves p ON p.id = a.pre_save_id
    WHERE p.user_id = _user_id AND a.created_at >= _start
    GROUP BY 1
  )
  SELECT d, COALESCE(c.n,0), COALESCE(c.v,0), COALESCE(c.pc,0), COALESCE(fa.n,0), COALESCE(ps.n,0)
  FROM (SELECT d FROM c UNION SELECT d FROM fa UNION SELECT d FROM ps) days
  LEFT JOIN c USING (d)
  LEFT JOIN fa USING (d)
  LEFT JOIN ps USING (d)
  ORDER BY d;
$$;

DROP FUNCTION IF EXISTS public.get_fanlink_breakdown(uuid, timestamptz);
CREATE OR REPLACE FUNCTION public.get_fanlink_breakdown(_user_id uuid, _start timestamptz)
RETURNS TABLE(fanlink_id uuid, clicks bigint, views bigint, platform_clicks bigint, fans bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id,
    (SELECT count(*) FROM public.clicks c WHERE c.fanlink_id = f.id AND c.clicked_at >= _start),
    (SELECT count(*) FROM public.clicks c WHERE c.fanlink_id = f.id AND c.clicked_at >= _start AND c.platform_name IS NULL),
    (SELECT count(*) FROM public.clicks c WHERE c.fanlink_id = f.id AND c.clicked_at >= _start AND c.platform_name IS NOT NULL),
    (SELECT count(*) FROM public.fan_contacts fc WHERE fc.link_id = f.id AND fc.collected_at >= _start)
  FROM public.fanlinks f WHERE f.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_totals(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_timeseries(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fanlink_breakdown(uuid, timestamptz) TO authenticated;
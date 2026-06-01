
-- Indexes to speed up aggregations
CREATE INDEX IF NOT EXISTS idx_clicks_fanlink_clicked_at ON public.clicks(fanlink_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_fan_contacts_link_collected_at ON public.fan_contacts(link_id, collected_at);
CREATE INDEX IF NOT EXISTS idx_pre_save_actions_presave_created_at ON public.pre_save_actions(pre_save_id, created_at);

-- Aggregated totals function: returns counts per fanlink and per presave for a user since a date
CREATE OR REPLACE FUNCTION public.get_campaign_totals(_user_id uuid, _start timestamptz)
RETURNS TABLE (
  total_clicks bigint,
  total_fans bigint,
  total_presaves bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.clicks c
       JOIN public.fanlinks f ON f.id = c.fanlink_id
       WHERE f.user_id = _user_id AND c.clicked_at >= _start),
    (SELECT count(*) FROM public.fan_contacts fc
       JOIN public.fanlinks f ON f.id = fc.link_id
       WHERE f.user_id = _user_id AND fc.collected_at >= _start),
    (SELECT count(*) FROM public.pre_save_actions a
       JOIN public.pre_saves p ON p.id = a.pre_save_id
       WHERE p.user_id = _user_id AND a.created_at >= _start);
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_totals(uuid, timestamptz) TO authenticated;

-- Per-campaign breakdowns
CREATE OR REPLACE FUNCTION public.get_fanlink_breakdown(_user_id uuid, _start timestamptz)
RETURNS TABLE (fanlink_id uuid, clicks bigint, fans bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id,
    (SELECT count(*) FROM public.clicks c WHERE c.fanlink_id = f.id AND c.clicked_at >= _start),
    (SELECT count(*) FROM public.fan_contacts fc WHERE fc.link_id = f.id AND fc.collected_at >= _start)
  FROM public.fanlinks f WHERE f.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_fanlink_breakdown(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_presave_breakdown(_user_id uuid, _start timestamptz)
RETURNS TABLE (pre_save_id uuid, actions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    (SELECT count(*) FROM public.pre_save_actions a WHERE a.pre_save_id = p.id AND a.created_at >= _start)
  FROM public.pre_saves p WHERE p.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_presave_breakdown(uuid, timestamptz) TO authenticated;

-- Platform / country aggregates (top N)
CREATE OR REPLACE FUNCTION public.get_click_dimensions(_user_id uuid, _start timestamptz)
RETURNS TABLE (dimension text, value text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'platform'::text, COALESCE(c.platform_name, 'Unknown'), count(*)
  FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
  WHERE f.user_id = _user_id AND c.clicked_at >= _start
  GROUP BY c.platform_name
  UNION ALL
  SELECT 'country'::text, COALESCE(c.country, 'Unknown'), count(*)
  FROM public.clicks c JOIN public.fanlinks f ON f.id = c.fanlink_id
  WHERE f.user_id = _user_id AND c.clicked_at >= _start
  GROUP BY c.country;
$$;

GRANT EXECUTE ON FUNCTION public.get_click_dimensions(uuid, timestamptz) TO authenticated;

-- Daily timeseries for the chart
CREATE OR REPLACE FUNCTION public.get_campaign_timeseries(_user_id uuid, _start timestamptz)
RETURNS TABLE (day date, clicks bigint, fans bigint, presaves bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT date_trunc('day', cl.clicked_at)::date AS d, count(*) AS n
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
  SELECT d, COALESCE(c.n,0), COALESCE(fa.n,0), COALESCE(ps.n,0)
  FROM (SELECT d FROM c UNION SELECT d FROM fa UNION SELECT d FROM ps) days
  LEFT JOIN c USING (d)
  LEFT JOIN fa USING (d)
  LEFT JOIN ps USING (d)
  ORDER BY d;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_timeseries(uuid, timestamptz) TO authenticated;

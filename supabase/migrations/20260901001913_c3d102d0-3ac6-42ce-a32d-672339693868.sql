-- ENUMS
CREATE TYPE public.monetization_provider AS ENUM ('monetag', 'house_ads');
CREATE TYPE public.monetization_application_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'withdrawn');
CREATE TYPE public.monetization_zone_status AS ENUM ('active', 'replaced', 'revoked');
CREATE TYPE public.monetization_earning_status AS ENUM ('pending', 'available', 'paid', 'reversed');
CREATE TYPE public.monetization_import_status AS ENUM ('draft', 'processing', 'processed', 'failed', 'reversed');

-- 1. SETTINGS
CREATE TABLE public.monetization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  artist_share_percent integer NOT NULL DEFAULT 70,
  platform_share_percent integer NOT NULL DEFAULT 30,
  early_access_limit integer NOT NULL DEFAULT 20,
  provider_default public.monetization_provider NOT NULL DEFAULT 'monetag',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monetization_settings_singleton UNIQUE (singleton)
);
GRANT SELECT ON public.monetization_settings TO authenticated;
GRANT ALL ON public.monetization_settings TO service_role;
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read settings" ON public.monetization_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.monetization_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_settings_updated_at BEFORE UPDATE ON public.monetization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.monetization_settings (singleton) VALUES (true);

-- 2. APPLICATIONS
CREATE TABLE public.monetization_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider public.monetization_provider NOT NULL DEFAULT 'monetag',
  status public.monetization_application_status NOT NULL DEFAULT 'pending',
  early_access boolean NOT NULL DEFAULT false,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monetization_applications_user_provider_key UNIQUE (user_id, provider)
);
CREATE INDEX idx_monetization_applications_status ON public.monetization_applications (status);
GRANT SELECT ON public.monetization_applications TO authenticated;
GRANT ALL ON public.monetization_applications TO service_role;
ALTER TABLE public.monetization_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists read own application" ON public.monetization_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage applications" ON public.monetization_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_applications_updated_at BEFORE UPDATE ON public.monetization_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ZONES
CREATE TABLE public.monetization_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider public.monetization_provider NOT NULL DEFAULT 'monetag',
  zone_id text NOT NULL,
  status public.monetization_zone_status NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  replaced_by_zone_uuid uuid REFERENCES public.monetization_zones(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_monetization_zones_provider_zone ON public.monetization_zones (provider, zone_id);
CREATE UNIQUE INDEX idx_monetization_zones_one_active ON public.monetization_zones (user_id, provider) WHERE status = 'active';
GRANT SELECT ON public.monetization_zones TO authenticated;
GRANT ALL ON public.monetization_zones TO service_role;
ALTER TABLE public.monetization_zones ENABLE ROW LEVEL SECURITY;
-- Artists intentionally cannot read zone codes; admin only.
CREATE POLICY "Admins manage zones" ON public.monetization_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_zones_updated_at BEFORE UPDATE ON public.monetization_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. IMPORT BATCHES
CREATE TABLE public.monetization_revenue_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.monetization_provider NOT NULL DEFAULT 'monetag',
  period_start date NOT NULL,
  period_end date NOT NULL,
  status public.monetization_import_status NOT NULL DEFAULT 'draft',
  source text NOT NULL DEFAULT 'manual',
  imported_by uuid,
  row_count integer NOT NULL DEFAULT 0,
  gross_cents_total bigint NOT NULL DEFAULT 0,
  matched_row_count integer NOT NULL DEFAULT 0,
  notes text,
  processed_at timestamptz,
  reversed_at timestamptz,
  reversal_of uuid REFERENCES public.monetization_revenue_imports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_monetization_imports_period ON public.monetization_revenue_imports (provider, period_start, period_end)
  WHERE status <> 'reversed' AND reversal_of IS NULL;
GRANT SELECT ON public.monetization_revenue_imports TO authenticated;
GRANT ALL ON public.monetization_revenue_imports TO service_role;
ALTER TABLE public.monetization_revenue_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage imports" ON public.monetization_revenue_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_imports_updated_at BEFORE UPDATE ON public.monetization_revenue_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RAW IMPORTED ZONE REVENUE
CREATE TABLE public.monetization_zone_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.monetization_revenue_imports(id) ON DELETE CASCADE,
  provider public.monetization_provider NOT NULL DEFAULT 'monetag',
  zone_id text NOT NULL,
  gross_cents bigint NOT NULL,
  matched_zone_uuid uuid REFERENCES public.monetization_zones(id) ON DELETE SET NULL,
  matched_user_id uuid,
  match_status text NOT NULL DEFAULT 'unknown_zone',
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monetization_zone_revenue_unique UNIQUE (import_id, provider, zone_id)
);
CREATE INDEX idx_monetization_zone_revenue_import ON public.monetization_zone_revenue (import_id, match_status);
GRANT SELECT ON public.monetization_zone_revenue TO authenticated;
GRANT ALL ON public.monetization_zone_revenue TO service_role;
ALTER TABLE public.monetization_zone_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage zone revenue" ON public.monetization_zone_revenue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_zone_revenue_updated_at BEFORE UPDATE ON public.monetization_zone_revenue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. EARNINGS LEDGER
CREATE TABLE public.monetization_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider public.monetization_provider NOT NULL DEFAULT 'monetag',
  zone_uuid uuid REFERENCES public.monetization_zones(id) ON DELETE SET NULL,
  zone_id_snapshot text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_cents bigint NOT NULL,
  artist_share_percent integer NOT NULL,
  artist_cents bigint NOT NULL,
  platform_cents bigint NOT NULL,
  status public.monetization_earning_status NOT NULL DEFAULT 'available',
  import_id uuid REFERENCES public.monetization_revenue_imports(id) ON DELETE SET NULL,
  reversal_of uuid REFERENCES public.monetization_earnings(id) ON DELETE SET NULL,
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_monetization_earnings_user_period ON public.monetization_earnings (user_id, period_start DESC);
CREATE INDEX idx_monetization_earnings_import ON public.monetization_earnings (import_id);
CREATE UNIQUE INDEX idx_monetization_earnings_import_zone ON public.monetization_earnings (import_id, zone_uuid)
  WHERE import_id IS NOT NULL AND zone_uuid IS NOT NULL AND reversal_of IS NULL;
GRANT SELECT ON public.monetization_earnings TO authenticated;
GRANT ALL ON public.monetization_earnings TO service_role;
ALTER TABLE public.monetization_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists read own earnings" ON public.monetization_earnings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage earnings" ON public.monetization_earnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_earnings_updated_at BEFORE UPDATE ON public.monetization_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. BALANCES
CREATE TABLE public.monetization_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  lifetime_gross_cents bigint NOT NULL DEFAULT 0,
  lifetime_artist_cents bigint NOT NULL DEFAULT 0,
  pending_cents bigint NOT NULL DEFAULT 0,
  available_cents bigint NOT NULL DEFAULT 0,
  paid_cents bigint NOT NULL DEFAULT 0,
  last_earning_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monetization_balances TO authenticated;
GRANT ALL ON public.monetization_balances TO service_role;
ALTER TABLE public.monetization_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists read own balance" ON public.monetization_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage balances" ON public.monetization_balances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_monetization_balances_updated_at BEFORE UPDATE ON public.monetization_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. AUDIT LOG
CREATE TABLE public.monetization_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_monetization_audit_created ON public.monetization_audit_log (created_at DESC);
GRANT SELECT ON public.monetization_audit_log TO authenticated;
GRANT ALL ON public.monetization_audit_log TO service_role;
ALTER TABLE public.monetization_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.monetization_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- HELPERS -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.monetization_log(_action text, _entity_type text, _entity_id uuid, _before jsonb, _after jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.monetization_audit_log (actor_id, action, entity_type, entity_id, before, after)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _before, _after);
$$;

CREATE OR REPLACE FUNCTION public.recompute_monetization_balance(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g bigint; a bigint; av bigint; pd bigint; pn bigint; last_at timestamptz;
BEGIN
  SELECT COALESCE(SUM(gross_cents),0), COALESCE(SUM(artist_cents),0),
         COALESCE(SUM(artist_cents) FILTER (WHERE status = 'available'),0),
         COALESCE(SUM(artist_cents) FILTER (WHERE status = 'paid'),0),
         COALESCE(SUM(artist_cents) FILTER (WHERE status = 'pending'),0),
         MAX(created_at)
    INTO g, a, av, pd, pn, last_at
  FROM public.monetization_earnings
  WHERE user_id = _user_id AND status <> 'reversed';

  INSERT INTO public.monetization_balances
    (user_id, lifetime_gross_cents, lifetime_artist_cents, pending_cents, available_cents, paid_cents, last_earning_at)
  VALUES (_user_id, g, a, pn, av, pd, last_at)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_gross_cents = EXCLUDED.lifetime_gross_cents,
    lifetime_artist_cents = EXCLUDED.lifetime_artist_cents,
    pending_cents = EXCLUDED.pending_cents,
    available_cents = EXCLUDED.available_cents,
    paid_cents = EXCLUDED.paid_cents,
    last_earning_at = EXCLUDED.last_earning_at,
    updated_at = now();
END;
$$;

-- ARTIST RPCS ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_for_monetization(_provider public.monetization_provider DEFAULT 'monetag')
RETURNS public.monetization_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  lim integer;
  approved_count integer;
  app public.monetization_applications;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO app FROM public.monetization_applications WHERE user_id = uid AND provider = _provider;
  IF app.id IS NOT NULL AND app.status <> 'withdrawn' THEN
    RETURN app;
  END IF;

  SELECT early_access_limit INTO lim FROM public.monetization_settings LIMIT 1;
  SELECT count(*) INTO approved_count FROM public.monetization_applications
    WHERE provider = _provider AND status = 'approved';

  IF app.id IS NOT NULL THEN
    UPDATE public.monetization_applications SET
      status = CASE WHEN approved_count < lim THEN 'approved'::public.monetization_application_status ELSE 'pending'::public.monetization_application_status END,
      early_access = approved_count < lim,
      applied_at = now(),
      reviewed_at = CASE WHEN approved_count < lim THEN now() ELSE NULL END,
      review_note = CASE WHEN approved_count < lim THEN 'Auto-approved: early access' ELSE NULL END
    WHERE id = app.id RETURNING * INTO app;
  ELSE
    INSERT INTO public.monetization_applications (user_id, provider, status, early_access, reviewed_at, review_note)
    VALUES (uid, _provider,
      CASE WHEN approved_count < lim THEN 'approved'::public.monetization_application_status ELSE 'pending'::public.monetization_application_status END,
      approved_count < lim,
      CASE WHEN approved_count < lim THEN now() ELSE NULL END,
      CASE WHEN approved_count < lim THEN 'Auto-approved: early access' ELSE NULL END)
    RETURNING * INTO app;
  END IF;

  PERFORM public.monetization_log('apply', 'application', app.id, NULL, to_jsonb(app));
  RETURN app;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_monetization_application(_provider public.monetization_provider DEFAULT 'monetag')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.monetization_applications
     SET status = 'withdrawn', early_access = false
   WHERE user_id = auth.uid() AND provider = _provider AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_monetization_summary()
RETURNS TABLE(
  status text, early_access boolean, applied_at timestamptz, reviewed_at timestamptz,
  has_zone boolean, provider text,
  lifetime_gross_cents bigint, lifetime_artist_cents bigint,
  pending_cents bigint, available_cents bigint, paid_cents bigint,
  artist_share_percent integer, early_access_slots_left integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(a.status::text, 'not_applied'),
    COALESCE(a.early_access, false),
    a.applied_at, a.reviewed_at,
    EXISTS (SELECT 1 FROM public.monetization_zones z WHERE z.user_id = auth.uid() AND z.status = 'active'),
    COALESCE(a.provider::text, s.provider_default::text),
    COALESCE(b.lifetime_gross_cents, 0), COALESCE(b.lifetime_artist_cents, 0),
    COALESCE(b.pending_cents, 0), COALESCE(b.available_cents, 0), COALESCE(b.paid_cents, 0),
    s.artist_share_percent,
    GREATEST(s.early_access_limit - (SELECT count(*)::int FROM public.monetization_applications WHERE status = 'approved'), 0)
  FROM public.monetization_settings s
  LEFT JOIN public.monetization_applications a ON a.user_id = auth.uid()
  LEFT JOIN public.monetization_balances b ON b.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_monetization_enabled_for_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.monetization_zones z
    JOIN public.monetization_applications a ON a.user_id = z.user_id AND a.provider = z.provider
    WHERE z.user_id = _user_id AND z.status = 'active' AND a.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_monetization_tag(_user_id uuid)
RETURNS TABLE(provider text, zone_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT z.provider::text, z.zone_id
  FROM public.monetization_zones z
  JOIN public.monetization_applications a ON a.user_id = z.user_id AND a.provider = z.provider
  WHERE z.user_id = _user_id AND z.status = 'active' AND a.status = 'approved'
    AND z.provider = 'monetag'
  LIMIT 1;
$$;

-- ADMIN RPCS ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_monetization_application_status(
  _application_id uuid, _status public.monetization_application_status, _note text DEFAULT NULL)
RETURNS public.monetization_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_row public.monetization_applications; after_row public.monetization_applications;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO before_row FROM public.monetization_applications WHERE id = _application_id;
  IF before_row.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.monetization_applications SET
    status = _status, review_note = COALESCE(_note, review_note),
    reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _application_id RETURNING * INTO after_row;

  PERFORM public.monetization_log('application_status', 'application', _application_id, to_jsonb(before_row), to_jsonb(after_row));
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_monetization_zone(
  _user_id uuid, _zone_id text, _provider public.monetization_provider DEFAULT 'monetag', _note text DEFAULT NULL)
RETURNS public.monetization_zones LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.monetization_zones (user_id, provider, zone_id, assigned_by, note)
  VALUES (_user_id, _provider, btrim(_zone_id), auth.uid(), _note)
  RETURNING * INTO new_zone;

  IF old_zone.id IS NOT NULL THEN
    UPDATE public.monetization_zones SET replaced_by_zone_uuid = new_zone.id WHERE id = old_zone.id;
  END IF;

  PERFORM public.monetization_log('zone_assign', 'zone', new_zone.id, to_jsonb(old_zone), to_jsonb(new_zone));
  RETURN new_zone;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_monetization_zone(_zone_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_row public.monetization_zones;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO before_row FROM public.monetization_zones WHERE id = _zone_uuid;
  UPDATE public.monetization_zones SET status = 'revoked' WHERE id = _zone_uuid;
  PERFORM public.monetization_log('zone_revoke', 'zone', _zone_uuid, to_jsonb(before_row), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_monetization_settings(
  _artist_share_percent integer, _early_access_limit integer)
RETURNS public.monetization_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_row public.monetization_settings; after_row public.monetization_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _artist_share_percent < 0 OR _artist_share_percent > 100 THEN RAISE EXCEPTION 'Share must be 0-100'; END IF;
  SELECT * INTO before_row FROM public.monetization_settings LIMIT 1;
  UPDATE public.monetization_settings SET
    artist_share_percent = _artist_share_percent,
    platform_share_percent = 100 - _artist_share_percent,
    early_access_limit = GREATEST(_early_access_limit, 0)
  WHERE id = before_row.id RETURNING * INTO after_row;
  PERFORM public.monetization_log('settings_update', 'settings', after_row.id, to_jsonb(before_row), to_jsonb(after_row));
  RETURN after_row;
END;
$$;

-- IMPORT RPCS ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_monetization_import(
  _provider public.monetization_provider,
  _period_start date,
  _period_end date,
  _rows jsonb,
  _source text DEFAULT 'csv',
  _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  imp public.monetization_revenue_imports;
  r jsonb;
  zid text;
  cents bigint;
  matched public.monetization_zones;
  total bigint := 0;
  cnt integer := 0;
  matched_cnt integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _period_end < _period_start THEN RAISE EXCEPTION 'Invalid period'; END IF;

  INSERT INTO public.monetization_revenue_imports (provider, period_start, period_end, source, imported_by, notes)
  VALUES (_provider, _period_start, _period_end, _source, auth.uid(), _notes)
  RETURNING * INTO imp;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    zid := btrim(COALESCE(r->>'zone_id', ''));
    cents := COALESCE((r->>'gross_cents')::bigint, 0);
    IF zid = '' THEN CONTINUE; END IF;

    SELECT * INTO matched FROM public.monetization_zones
     WHERE provider = _provider AND zone_id = zid LIMIT 1;

    INSERT INTO public.monetization_zone_revenue
      (import_id, provider, zone_id, gross_cents, matched_zone_uuid, matched_user_id, match_status)
    VALUES (imp.id, _provider, zid, cents, matched.id, matched.user_id,
      CASE WHEN matched.id IS NULL THEN 'unknown_zone' ELSE 'matched' END)
    ON CONFLICT (import_id, provider, zone_id) DO UPDATE SET gross_cents = EXCLUDED.gross_cents;

    total := total + cents;
    cnt := cnt + 1;
    IF matched.id IS NOT NULL THEN matched_cnt := matched_cnt + 1; END IF;
    matched := NULL;
  END LOOP;

  UPDATE public.monetization_revenue_imports
     SET row_count = cnt, gross_cents_total = total, matched_row_count = matched_cnt
   WHERE id = imp.id;

  PERFORM public.monetization_log('import_create', 'import', imp.id, NULL, jsonb_build_object('rows', cnt, 'gross_cents', total));
  RETURN imp.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rematch_monetization_import(_import_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mc integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.monetization_zone_revenue zr
     SET matched_zone_uuid = z.id, matched_user_id = z.user_id, match_status = 'matched'
    FROM public.monetization_zones z
   WHERE zr.import_id = _import_id AND zr.processed = false
     AND z.provider = zr.provider AND z.zone_id = zr.zone_id;
  SELECT count(*) INTO mc FROM public.monetization_zone_revenue
   WHERE import_id = _import_id AND match_status = 'matched';
  UPDATE public.monetization_revenue_imports SET matched_row_count = mc WHERE id = _import_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_monetization_import(_import_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.monetization_import_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT status INTO st FROM public.monetization_revenue_imports WHERE id = _import_id;
  IF st <> 'draft' THEN RAISE EXCEPTION 'Only draft imports can be deleted'; END IF;
  DELETE FROM public.monetization_revenue_imports WHERE id = _import_id;
  PERFORM public.monetization_log('import_delete', 'import', _import_id, NULL, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_monetization_import(_import_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  imp public.monetization_revenue_imports;
  pct integer;
  rec record;
  a_cents bigint;
  created integer := 0;
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO imp FROM public.monetization_revenue_imports WHERE id = _import_id FOR UPDATE;
  IF imp.id IS NULL THEN RAISE EXCEPTION 'Import not found'; END IF;
  IF imp.status <> 'draft' THEN RAISE EXCEPTION 'Import already %', imp.status; END IF;

  SELECT artist_share_percent INTO pct FROM public.monetization_settings LIMIT 1;

  FOR rec IN
    SELECT * FROM public.monetization_zone_revenue
     WHERE import_id = _import_id AND match_status = 'matched' AND processed = false
  LOOP
    a_cents := floor(rec.gross_cents * pct / 100.0)::bigint;
    INSERT INTO public.monetization_earnings
      (user_id, provider, zone_uuid, zone_id_snapshot, period_start, period_end,
       gross_cents, artist_share_percent, artist_cents, platform_cents, status, import_id)
    VALUES (rec.matched_user_id, imp.provider, rec.matched_zone_uuid, rec.zone_id,
       imp.period_start, imp.period_end, rec.gross_cents, pct, a_cents,
       rec.gross_cents - a_cents, 'available', imp.id)
    ON CONFLICT DO NOTHING;

    UPDATE public.monetization_zone_revenue SET processed = true WHERE id = rec.id;
    created := created + 1;
  END LOOP;

  FOR uid IN SELECT DISTINCT matched_user_id FROM public.monetization_zone_revenue
              WHERE import_id = _import_id AND matched_user_id IS NOT NULL LOOP
    PERFORM public.recompute_monetization_balance(uid);
  END LOOP;

  UPDATE public.monetization_revenue_imports
     SET status = 'processed', processed_at = now() WHERE id = _import_id;

  PERFORM public.monetization_log('import_process', 'import', _import_id, NULL, jsonb_build_object('earnings_created', created));
  RETURN jsonb_build_object('earnings_created', created);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_monetization_import(_import_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  imp public.monetization_revenue_imports;
  rec record;
  uid uuid;
  reversed integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO imp FROM public.monetization_revenue_imports WHERE id = _import_id FOR UPDATE;
  IF imp.status <> 'processed' THEN RAISE EXCEPTION 'Only processed imports can be reversed'; END IF;

  FOR rec IN SELECT * FROM public.monetization_earnings
              WHERE import_id = _import_id AND status <> 'reversed' AND reversal_of IS NULL LOOP
    INSERT INTO public.monetization_earnings
      (user_id, provider, zone_uuid, zone_id_snapshot, period_start, period_end,
       gross_cents, artist_share_percent, artist_cents, platform_cents, status, import_id, reversal_of, source_note)
    VALUES (rec.user_id, rec.provider, rec.zone_uuid, rec.zone_id_snapshot, rec.period_start, rec.period_end,
       -rec.gross_cents, rec.artist_share_percent, -rec.artist_cents, -rec.platform_cents,
       rec.status, rec.import_id, rec.id, 'Reversal');
    UPDATE public.monetization_earnings SET status = 'reversed' WHERE id = rec.id;
    reversed := reversed + 1;
  END LOOP;

  UPDATE public.monetization_earnings SET status = 'reversed'
   WHERE reversal_of IN (SELECT id FROM public.monetization_earnings WHERE import_id = _import_id);

  FOR uid IN SELECT DISTINCT user_id FROM public.monetization_earnings WHERE import_id = _import_id LOOP
    PERFORM public.recompute_monetization_balance(uid);
  END LOOP;

  UPDATE public.monetization_revenue_imports
     SET status = 'reversed', reversed_at = now() WHERE id = _import_id;

  PERFORM public.monetization_log('import_reverse', 'import', _import_id, NULL, jsonb_build_object('reversed', reversed));
  RETURN jsonb_build_object('reversed', reversed);
END;
$$;

-- ADMIN OVERVIEW ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_monetization_overview()
RETURNS TABLE(
  total_gross_cents bigint, total_artist_cents bigint, total_platform_cents bigint,
  approved_artists integer, pending_applications integer, active_zones integer,
  early_access_limit integer, artist_share_percent integer, unmatched_rows integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT SUM(gross_cents) FROM public.monetization_earnings WHERE status <> 'reversed'), 0),
    COALESCE((SELECT SUM(artist_cents) FROM public.monetization_earnings WHERE status <> 'reversed'), 0),
    COALESCE((SELECT SUM(platform_cents) FROM public.monetization_earnings WHERE status <> 'reversed'), 0),
    (SELECT count(*)::int FROM public.monetization_applications WHERE status = 'approved'),
    (SELECT count(*)::int FROM public.monetization_applications WHERE status = 'pending'),
    (SELECT count(*)::int FROM public.monetization_zones WHERE status = 'active'),
    (SELECT early_access_limit FROM public.monetization_settings LIMIT 1),
    (SELECT artist_share_percent FROM public.monetization_settings LIMIT 1),
    (SELECT count(*)::int FROM public.monetization_zone_revenue WHERE match_status <> 'matched' AND processed = false)
  WHERE public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.list_monetization_artists()
RETURNS TABLE(
  user_id uuid, full_name text, username text, display_name text,
  application_status text, early_access boolean, applied_at timestamptz,
  zone_uuid uuid, zone_id text, lifetime_artist_cents bigint, available_cents bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, p.full_name, ap.username, ap.display_name,
         a.status::text, a.early_access, a.applied_at,
         z.id, z.zone_id,
         COALESCE(b.lifetime_artist_cents, 0), COALESCE(b.available_cents, 0)
  FROM public.monetization_applications a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN public.artist_profiles ap ON ap.user_id = a.user_id
  LEFT JOIN public.monetization_zones z ON z.user_id = a.user_id AND z.status = 'active'
  LEFT JOIN public.monetization_balances b ON b.user_id = a.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.applied_at DESC;
$$;
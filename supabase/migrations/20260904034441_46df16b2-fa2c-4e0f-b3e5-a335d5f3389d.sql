CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX notifications_type_idx ON public.notifications (type, created_at DESC);

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_monetization_status boolean NOT NULL DEFAULT true,
  email_earnings_updates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notification prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own notification prefs" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own notification prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification deliveries" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX notification_deliveries_unique ON public.notification_deliveries (notification_id, channel);

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _message text, _link text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE nid uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (_user_id, _type, _title, _message, _link)
  RETURNING id INTO nid;
  RETURN nid;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE base_url text; svc text;
BEGIN
  SELECT decrypted_secret INTO base_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO svc FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF base_url IS NULL OR svc IS NULL THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
    url := base_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_dispatch_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_email();

CREATE OR REPLACE FUNCTION public.apply_for_monetization(_provider monetization_provider DEFAULT 'monetag'::monetization_provider)
 RETURNS monetization_applications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF app.status = 'approved' THEN
    PERFORM public.notify_user(uid, 'monetization_approved',
      'Monetization approved',
      'Great news — your monetization request has been approved. You are in the early access group.',
      '/artist/revenue');
  ELSE
    PERFORM public.notify_user(uid, 'monetization_submitted',
      'Monetization request received',
      'We received your monetization request. Our team will review it shortly.',
      '/artist/revenue');
  END IF;

  RETURN app;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_monetization_application_status(_application_id uuid, _status monetization_application_status, _note text DEFAULT NULL::text)
 RETURNS monetization_applications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF before_row.status IS DISTINCT FROM after_row.status THEN
    IF after_row.status = 'approved' THEN
      PERFORM public.notify_user(after_row.user_id, 'monetization_approved',
        'Monetization approved',
        'Your monetization request has been approved. Earnings will appear in your dashboard once your link monetization is active.',
        '/artist/revenue');
    ELSIF after_row.status = 'rejected' THEN
      PERFORM public.notify_user(after_row.user_id, 'monetization_rejected',
        'Monetization request not approved',
        COALESCE(NULLIF(after_row.review_note, ''), 'Your monetization request was not approved at this time.'),
        '/artist/revenue');
    ELSIF after_row.status = 'suspended' THEN
      PERFORM public.notify_user(after_row.user_id, 'monetization_suspended',
        'Monetization suspended',
        COALESCE(NULLIF(after_row.review_note, ''), 'Your monetization has been suspended. Contact support for details.'),
        '/artist/revenue');
    END IF;
  END IF;

  RETURN after_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_monetization_zone(_user_id uuid, _zone_id text, _provider monetization_provider DEFAULT 'monetag'::monetization_provider, _note text DEFAULT NULL::text)
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

  INSERT INTO public.monetization_zones (user_id, provider, zone_id, assigned_by, note)
  VALUES (_user_id, _provider, btrim(_zone_id), auth.uid(), _note)
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

CREATE OR REPLACE FUNCTION public.process_monetization_import(_import_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  imp public.monetization_revenue_imports;
  pct integer;
  rec record;
  a_cents bigint;
  created integer := 0;
  uid uuid;
  earned bigint;
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

    SELECT COALESCE(SUM(artist_cents), 0) INTO earned FROM public.monetization_earnings
      WHERE import_id = _import_id AND user_id = uid AND status <> 'reversed';

    PERFORM public.notify_user(uid, 'earnings_updated',
      'Weekly earnings updated',
      'Your earnings for ' || to_char(imp.period_start, 'Mon DD') || ' - ' || to_char(imp.period_end, 'Mon DD, YYYY')
        || ' have been added: $' || to_char(earned / 100.0, 'FM999999990.00') || '.',
      '/artist/revenue');
  END LOOP;

  UPDATE public.monetization_revenue_imports
     SET status = 'processed', processed_at = now() WHERE id = _import_id;

  PERFORM public.monetization_log('import_process', 'import', _import_id, NULL, jsonb_build_object('earnings_created', created));
  RETURN jsonb_build_object('earnings_created', created);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_monetization_import(_import_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    PERFORM public.notify_user(uid, 'earnings_adjusted',
      'Earnings adjusted',
      'Your earnings for ' || to_char(imp.period_start, 'Mon DD') || ' - ' || to_char(imp.period_end, 'Mon DD, YYYY')
        || ' were reviewed and adjusted by our team. Your balance has been updated.',
      '/artist/revenue');
  END LOOP;

  UPDATE public.monetization_revenue_imports
     SET status = 'reversed', reversed_at = now() WHERE id = _import_id;

  PERFORM public.monetization_log('import_reverse', 'import', _import_id, NULL, jsonb_build_object('reversed', reversed));
  RETURN jsonb_build_object('reversed', reversed);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.notifications SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL
     AND (_ids IS NULL OR id = ANY(_ids));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_notification_activity(_limit integer DEFAULT 200)
RETURNS TABLE(id uuid, user_id uuid, full_name text, type text, title text, message text, created_at timestamptz, read_at timestamptz, email_status text, email_error text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT n.id, n.user_id, p.full_name, n.type, n.title, n.message, n.created_at, n.read_at,
         d.status, d.error_message
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.user_id = n.user_id
  LEFT JOIN public.notification_deliveries d ON d.notification_id = n.id AND d.channel = 'email'
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY n.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 200), 500);
$$;
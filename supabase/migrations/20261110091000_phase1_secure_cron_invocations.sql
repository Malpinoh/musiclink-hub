-- Keep scheduled release automation working after enabling JWT verification.
-- Resolve the service-role key from Vault at execution time; do not persist it in cron.job.
DO $$
DECLARE
  job record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Vault secret service_role_key is required before applying Phase 1 cron hardening';
  END IF;

  FOR job IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname IN (
      'auto-resolve-presaves-daily',
      'execute-presave-library-saves-daily',
      'send-presave-notifications-daily'
    )
  LOOP
    IF job.jobname = 'auto-resolve-presaves-daily' THEN
      PERFORM cron.alter_job(
        job.jobid,
        command := $command$
          SELECT net.http_post(
            url := 'https://uwzhhzkvqqvaqvkuocrz.supabase.co/functions/v1/auto-resolve-presaves',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
            ),
            body := '{"trigger":"cron"}'::jsonb
          );
        $command$
      );
    ELSIF job.jobname = 'execute-presave-library-saves-daily' THEN
      PERFORM cron.alter_job(
        job.jobid,
        command := $command$
          SELECT net.http_post(
            url := 'https://uwzhhzkvqqvaqvkuocrz.supabase.co/functions/v1/execute-presave-library-saves',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
            ),
            body := '{}'::jsonb
          );
        $command$
      );
    ELSIF job.jobname = 'send-presave-notifications-daily' THEN
      PERFORM cron.alter_job(
        job.jobid,
        command := $command$
          SELECT net.http_post(
            url := 'https://uwzhhzkvqqvaqvkuocrz.supabase.co/functions/v1/send-presave-notification',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
            ),
            body := jsonb_build_object('time', now())
          );
        $command$
      );
    END IF;
  END LOOP;
END;
$$;

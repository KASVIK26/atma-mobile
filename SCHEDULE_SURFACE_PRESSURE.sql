-- ============================================================================
-- SCHEDULE SURFACE PRESSURE UPDATE
--
-- You have two options — use whichever suits your Supabase plan.
--
-- OPTION A (recommended): Supabase Dashboard
--   → Edge Functions → update-surface-pressure → Schedules → Add schedule
--   Cron expression: 0 * * * *   (every hour at :00)
--   No SQL required.
--
-- OPTION B: pg_cron + pg_net (SQL-only, keep reading)
-- ============================================================================

-- Enable extensions (run once as superuser / in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS pg_cron   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net    WITH SCHEMA extensions;

-- ============================================================================
-- OPTION B: pg_cron triggers the Edge Function via HTTP POST
--
-- Replace the two placeholder values:
--   <your-project-ref>   → e.g. abcdefghijklm
--   <your-service-key>   → Settings → API → service_role key
-- ============================================================================

SELECT cron.schedule(
  'update-surface-pressure-hourly',     -- job name (must be unique)
  '0 * * * *',                          -- every hour at :00 UTC
  $$
    SELECT net.http_post(
      url     := 'https://<your-project-ref>.supabase.co/functions/v1/update-surface-pressure',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer <your-service-key>'
                 ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ── To verify the job was created ────────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ── To view last runs and their status ───────────────────────────────────────
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ── To remove the job ────────────────────────────────────────────────────────
-- SELECT cron.unschedule('update-surface-pressure-hourly');


-- ============================================================================
-- OPTION C (no Edge Function needed): pure pg_net + background processing
--
-- Step 1 – Fire HTTP requests for all active buildings:
-- ============================================================================
CREATE OR REPLACE FUNCTION dispatch_pressure_fetches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec       RECORD;
  req_id    bigint;
BEGIN
  FOR rec IN
    SELECT id, latitude, longitude
    FROM   buildings
    WHERE  is_active = true
  LOOP
    SELECT net.http_get(
      url := format(
        'https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=surface_pressure&forecast_days=1',
        rec.latitude, rec.longitude
      )
    ) INTO req_id;

    -- tag the request so the collector knows which building it belongs to
    INSERT INTO _pressure_request_map(request_id, building_id, dispatched_at)
    VALUES (req_id, rec.id, now())
    ON CONFLICT (request_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── Staging table that maps request IDs → building IDs ───────────────────────
CREATE TABLE IF NOT EXISTS _pressure_request_map (
  request_id   bigint      PRIMARY KEY,
  building_id  uuid        NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  dispatched_at timestamptz NOT NULL DEFAULT now()
);

-- Purge rows older than 2 hours automatically
CREATE INDEX IF NOT EXISTS idx_prm_dispatched
  ON _pressure_request_map(dispatched_at);

-- Step 2 – Collect responses (run ~30 s after dispatch or via a second cron):
CREATE OR REPLACE FUNCTION collect_pressure_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec        RECORD;
  pressure   numeric;
BEGIN
  FOR rec IN
    SELECT m.building_id,
           r.response_body,
           r.status_code
    FROM   _pressure_request_map m
    JOIN   net._http_response     r ON r.id = m.request_id
    WHERE  r.status_code = 200
  LOOP
    BEGIN
      pressure := (rec.response_body::jsonb -> 'current' ->> 'surface_pressure')::numeric;
      PERFORM accept_building_pressure(rec.building_id, pressure);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'collect_pressure_responses: building % — %', rec.building_id, SQLERRM;
    END;
  END LOOP;

  -- Clean up processed requests
  DELETE FROM _pressure_request_map m
  WHERE EXISTS (
    SELECT 1 FROM net._http_response r
    WHERE r.id = m.request_id
  );

  -- Also purge stale unprocessed rows > 2 h
  DELETE FROM _pressure_request_map
  WHERE dispatched_at < now() - interval '2 hours';
END;
$$;

-- Schedule Option C: dispatch at :00, collect at :01
-- SELECT cron.schedule('dispatch-pressure', '0 * * * *',  'SELECT dispatch_pressure_fetches()');
-- SELECT cron.schedule('collect-pressure',  '1 * * * *',  'SELECT collect_pressure_responses()');

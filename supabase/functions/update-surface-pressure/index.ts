/**
 * update-surface-pressure
 * Supabase Edge Function (Deno)
 *
 * Fetches the current surface pressure from Open-Meteo for every active
 * building and stores it in buildings.surface_pressure_hpa.
 *
 * Open-Meteo API (free, no key required):
 *   GET https://api.open-meteo.com/v1/forecast
 *     ?latitude=<lat>
 *     &longitude=<lon>
 *     &current=surface_pressure
 *     &forecast_days=1
 *
 * Scheduling (Supabase Dashboard → Edge Functions → Schedules):
 *   Cron expression:  0 * * * *   (every hour at :00)
 *
 * Manual trigger:
 *   curl -X POST https://<project>.supabase.co/functions/v1/update-surface-pressure \
 *     -H "Authorization: Bearer <anon-or-service-key>"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const CONCURRENCY = 5;          // parallel requests per batch
const STALE_AFTER_MS = 50 * 60 * 1000; // re-fetch if older than 50 minutes

interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  surface_pressure_at: string | null;
}

interface OpenMeteoResponse {
  current: {
    surface_pressure: number;
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────
Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // --- 1. Load all active buildings that need a refresh ----------------
    const staleThreshold = new Date(Date.now() - STALE_AFTER_MS).toISOString();

    const { data: buildings, error: fetchError } = await supabase
      .from('buildings')
      .select('id, name, latitude, longitude, surface_pressure_at')
      .eq('is_active', true)
      .or(`surface_pressure_at.is.null,surface_pressure_at.lt.${staleThreshold}`);

    if (fetchError) throw fetchError;
    if (!buildings || buildings.length === 0) {
      return json({ ok: true, updated: 0, message: 'No stale buildings found' });
    }

    console.log(`[update-surface-pressure] Processing ${buildings.length} buildings`);

    // --- 2. Fetch Open-Meteo in batches ----------------------------------
    const results = { updated: 0, errors: 0, details: [] as string[] };

    for (let i = 0; i < buildings.length; i += CONCURRENCY) {
      const batch = buildings.slice(i, i + CONCURRENCY) as Building[];

      await Promise.all(batch.map(async (building) => {
        try {
          const url = new URL(OPEN_METEO_BASE);
          url.searchParams.set('latitude',    String(building.latitude));
          url.searchParams.set('longitude',   String(building.longitude));
          url.searchParams.set('current',     'surface_pressure');
          url.searchParams.set('forecast_days', '1');

          const resp = await fetch(url.toString(), {
            signal: AbortSignal.timeout(8000),
          });

          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} for building ${building.id}`);
          }

          const data = await resp.json() as OpenMeteoResponse;
          const pressure = data?.current?.surface_pressure;

          if (typeof pressure !== 'number' || isNaN(pressure)) {
            throw new Error(`Bad pressure value from Open-Meteo: ${JSON.stringify(data)}`);
          }

          // --- 3. Persist to DB ----------------------------------------
          const { error: updateError } = await supabase.rpc(
            'accept_building_pressure',
            {
              p_building_id:  building.id,
              p_pressure_hpa: pressure,
              p_fetched_at:   new Date().toISOString(),
            }
          );

          if (updateError) throw updateError;

          results.updated++;
          results.details.push(`${building.name}: ${pressure} hPa`);
          console.log(`  ✓ ${building.name} (${building.id}): ${pressure} hPa`);

        } catch (err: unknown) {
          results.errors++;
          const msg = err instanceof Error ? err.message : String(err);
          results.details.push(`ERROR ${building.name}: ${msg}`);
          console.error(`  ✗ ${building.name}: ${msg}`);
        }
      }));
    }

    return json({
      ok: true,
      updated:  results.updated,
      errors:   results.errors,
      details:  results.details,
      ran_at:   new Date().toISOString(),
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[update-surface-pressure] Fatal:', msg);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

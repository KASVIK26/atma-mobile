/**
 * pressure-service.ts
 *
 * Fetches the live surface pressure for a building from Supabase.
 * The pressure is kept current by the hourly Edge Function
 * (update-surface-pressure).
 *
 * If the DB value is stale (> 2 hours) or missing, falls back to fetching
 * Open-Meteo directly from the mobile device so attendance is never blocked.
 */

import { supabase } from './supabase';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface SurfacePressureResult {
  pressure_hpa: number;
  source: 'database' | 'open_meteo_direct' | 'fallback';
  fetched_at: Date;
}

// In-memory cache: buildingId → result (valid for 30 min)
const cache = new Map<string, { result: SurfacePressureResult; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Get the current surface pressure for a building.
 *
 * Priority:
 *  1. In-memory cache (30 min TTL)
 *  2. Supabase buildings.surface_pressure_hpa (if fresh < 2h)
 *  3. Open-Meteo direct call using building's lat/lon
 *  4. Last known DB value even if stale
 *  5. ISA standard 1013.25 hPa (absolute fallback)
 */
export async function getBuildingSurfacePressure(
  buildingId: string
): Promise<SurfacePressureResult> {

  // 1. Memory cache
  const cached = cache.get(buildingId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Fetch building record
  const { data: building, error } = await supabase
    .from('buildings')
    .select('id, latitude, longitude, surface_pressure_hpa, surface_pressure_at')
    .eq('id', buildingId)
    .single();

  if (!error && building) {
    const age = building.surface_pressure_at
      ? Date.now() - new Date(building.surface_pressure_at).getTime()
      : Infinity;

    if (building.surface_pressure_hpa && age < STALE_THRESHOLD_MS) {
      const result: SurfacePressureResult = {
        pressure_hpa: Number(building.surface_pressure_hpa),
        source: 'database',
        fetched_at: new Date(building.surface_pressure_at!),
      };
      cache.set(buildingId, { result, cachedAt: Date.now() });
      return result;
    }

    // 3. DB value stale or missing — call Open-Meteo directly
    if (building.latitude && building.longitude) {
      try {
        const url = new URL(OPEN_METEO_BASE);
        url.searchParams.set('latitude',     String(building.latitude));
        url.searchParams.set('longitude',    String(building.longitude));
        url.searchParams.set('current',      'surface_pressure');
        url.searchParams.set('forecast_days', '1');

        const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
        if (resp.ok) {
          const json = await resp.json();
          const pressure = json?.current?.surface_pressure as number;
          if (typeof pressure === 'number' && !isNaN(pressure)) {
            const result: SurfacePressureResult = {
              pressure_hpa: pressure,
              source: 'open_meteo_direct',
              fetched_at: new Date(),
            };
            cache.set(buildingId, { result, cachedAt: Date.now() });
            return result;
          }
        }
      } catch (e) {
        console.warn('[PressureService] Open-Meteo direct call failed:', e);
      }
    }

    // 4. Stale DB value as last resort before ISA default
    if (building.surface_pressure_hpa) {
      const result: SurfacePressureResult = {
        pressure_hpa: Number(building.surface_pressure_hpa),
        source: 'database',
        fetched_at: building.surface_pressure_at
          ? new Date(building.surface_pressure_at)
          : new Date(0),
      };
      return result;
    }
  }

  // 5. Absolute fallback — ISA standard sea level (will over-estimate height slightly)
  console.warn('[PressureService] No pressure data for building', buildingId, '— using ISA 1013.25 hPa');
  return {
    pressure_hpa: 1013.25,
    source: 'fallback',
    fetched_at: new Date(),
  };
}

/**
 * Also expose a direct Open-Meteo fetch by coordinates,
 * useful for the GeolocationTestScreen where you only have lat/lon.
 */
export async function getOpenMeteoSurfacePressure(
  latitude: number,
  longitude: number
): Promise<number | null> {
  try {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude',     String(latitude));
    url.searchParams.set('longitude',    String(longitude));
    url.searchParams.set('current',      'surface_pressure');
    url.searchParams.set('forecast_days', '1');

    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const p = json?.current?.surface_pressure as number;
    return typeof p === 'number' && !isNaN(p) ? p : null;
  } catch {
    return null;
  }
}

/** Clear the in-memory cache for a specific building (e.g. after forced refresh). */
export function clearPressureCache(buildingId?: string): void {
  if (buildingId) {
    cache.delete(buildingId);
  } else {
    cache.clear();
  }
}

/**
 * Fetch live surface pressure for the building nearest to the given lat/lon.
 * Used by test screens and anywhere a building ID is not known up-front.
 *
 * Priority:
 *  1. Nearest building in DB with a fresh surface_pressure_hpa (< 2 h old)
 *  2. Open-Meteo direct call (device internet)
 *  3. Absolute ISA fallback
 */
export async function getNearestBuildingSurfacePressure(
  lat: number,
  lon: number,
  radiusDeg: number = 0.3   // ~30 km bounding box
): Promise<SurfacePressureResult> {
  try {
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, latitude, longitude, surface_pressure_hpa, surface_pressure_at')
      .gte('latitude',  lat - radiusDeg)
      .lte('latitude',  lat + radiusDeg)
      .gte('longitude', lon - radiusDeg)
      .lte('longitude', lon + radiusDeg)
      .not('surface_pressure_hpa', 'is', null);

    if (!error && buildings && buildings.length > 0) {
      // Sort by Euclidean distance — pick the nearest building
      const nearest = buildings
        .filter((b: any) => b.latitude && b.longitude)
        .sort((a: any, b: any) => {
          const dA = Math.hypot(Number(a.latitude) - lat, Number(a.longitude) - lon);
          const dB = Math.hypot(Number(b.latitude) - lat, Number(b.longitude) - lon);
          return dA - dB;
        })[0];

      if (nearest?.surface_pressure_hpa) {
        const age = nearest.surface_pressure_at
          ? Date.now() - new Date(nearest.surface_pressure_at).getTime()
          : Infinity;
        const isStale = age > STALE_THRESHOLD_MS;

        if (!isStale) {
          const result: SurfacePressureResult = {
            pressure_hpa: Number(nearest.surface_pressure_hpa),
            source: 'database',
            fetched_at: new Date(nearest.surface_pressure_at),
          };
          console.log(`[PressureService] DB surface pressure for nearest building "${nearest.name}": ${result.pressure_hpa} hPa`);
          return result;
        }
        // DB value stale — try Open-Meteo, but remember the stale value as backup
        const liveP = await getOpenMeteoSurfacePressure(lat, lon);
        if (liveP !== null) {
          return { pressure_hpa: liveP, source: 'open_meteo_direct', fetched_at: new Date() };
        }
        // Return stale DB value rather than hard ISA fallback
        return {
          pressure_hpa: Number(nearest.surface_pressure_hpa),
          source: 'database',
          fetched_at: nearest.surface_pressure_at ? new Date(nearest.surface_pressure_at) : new Date(0),
        };
      }
    }
  } catch (e) {
    console.warn('[PressureService] getNearestBuildingSurfacePressure DB query failed:', e);
  }

  // Fallback: Open-Meteo direct
  const liveP = await getOpenMeteoSurfacePressure(lat, lon);
  if (liveP !== null) {
    return { pressure_hpa: liveP, source: 'open_meteo_direct', fetched_at: new Date() };
  }

  console.warn('[PressureService] All sources failed — using ISA 1013.25 hPa');
  return { pressure_hpa: 1013.25, source: 'fallback', fetched_at: new Date() };
}

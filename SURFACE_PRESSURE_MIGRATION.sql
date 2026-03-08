-- ============================================================================
-- SURFACE PRESSURE MIGRATION
-- Adds live Open-Meteo surface pressure columns to buildings.
-- Rooms inherit the building's surface pressure (same horizontal location).
-- ============================================================================

-- 1. Add live surface pressure columns to buildings
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS surface_pressure_hpa   numeric(7,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS surface_pressure_at     timestamptz  DEFAULT NULL;

COMMENT ON COLUMN buildings.surface_pressure_hpa IS
  'Live surface pressure in hPa fetched from Open-Meteo (surface_pressure parameter). '
  'Updated hourly by the update-surface-pressure Edge Function. '
  'Used as dynamic baseline for floor estimation instead of a static per-room value.';

COMMENT ON COLUMN buildings.surface_pressure_at IS
  'Timestamp of the last successful Open-Meteo fetch for this building.';

-- 2. Index so the Edge Function can efficiently find stale buildings
CREATE INDEX IF NOT EXISTS idx_buildings_pressure_updated
  ON buildings(surface_pressure_at NULLS FIRST)
  WHERE is_active = true;


-- ============================================================================
-- HELPER: accept_building_pressure(building_id, pressure, fetched_at)
-- Called by the Edge Function or pg_net async handler after each HTTP response.
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_building_pressure(
  p_building_id   uuid,
  p_pressure_hpa  numeric,
  p_fetched_at    timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE buildings
  SET
    surface_pressure_hpa = p_pressure_hpa,
    surface_pressure_at  = p_fetched_at,
    updated_at           = now()
  WHERE id = p_building_id;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_building_pressure(uuid, numeric, timestamptz)
  TO service_role;


-- ============================================================================
-- VIEW: building_floor_pressure
-- For each building+floor, compute the EXPECTED device pressure a student
-- should read when standing on that floor.
--
-- Formula (barometric):
--   P_floor = surface_pressure * exp(-floor_altitude / scale_height)
--   scale_height ≈ 8500 m (standard atmosphere)
--   floor_altitude = floor_number * floor_height_m
-- ============================================================================
CREATE OR REPLACE VIEW building_floor_pressure AS
SELECT
  b.id             AS building_id,
  b.name           AS building_name,
  b.latitude,
  b.longitude,
  b.surface_pressure_hpa,
  b.surface_pressure_at,
  f.floor_number,
  f.floor_number * 3.5 AS floor_altitude_m,      -- 3.5 m per floor default
  ROUND(
    b.surface_pressure_hpa
      * EXP(-(f.floor_number * 3.5) / 8500.0)
    , 2
  ) AS expected_pressure_hpa,
  ROUND(
    b.surface_pressure_hpa
    - b.surface_pressure_hpa * EXP(-(f.floor_number * 3.5) / 8500.0)
    , 3
  ) AS pressure_drop_from_ground_hpa
FROM buildings b
-- generate floor rows from 0 to floor_count-1
CROSS JOIN LATERAL generate_series(0, GREATEST(b.floor_count - 1, 0)) AS f(floor_number)
WHERE b.surface_pressure_hpa IS NOT NULL;

COMMENT ON VIEW building_floor_pressure IS
  'Derived expected barometer reading per floor, computed from live surface pressure. '
  'Use expected_pressure_hpa ± 0.6 hPa (±5 m) as the acceptance window for floor verification.';

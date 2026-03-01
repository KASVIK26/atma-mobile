/**
 * Barometer Service for altitude and pressure sensing
 * Uses expo-sensors Barometer for real hardware readings on physical devices.
 * Falls back to mock data on emulators that don't have a pressure sensor.
 */

import { Barometer } from 'expo-sensors';

// Fallback mock value used only when the hardware sensor is unavailable
let mockPressureValue = 956.72;

export interface BarometerReading {
  pressure: number;   // hPa (hectopascals)
  altitude: number;   // meters (derived from pressure)
  timestamp: number;
  unit?: string;      // 'hPa'
  source?: string;    // 'hardware' | 'mock'
  available?: boolean;
}

/**
 * Calculate altitude from atmospheric pressure using barometric formula
 * Reference: https://en.wikipedia.org/wiki/Barometric_formula
 *
 * altitude = 44330 * (1.0 - (pressure/seaLevelPressure)^(1/5.255))
 *
 * @param pressure - Current atmospheric pressure in hPa
 * @param seaLevelPressure - Reference sea level pressure (default 1013.25 hPa)
 * @returns altitude in meters
 */
export function calculateAltitudeFromPressure(
  pressure: number,
  seaLevelPressure: number = 1013.25
): number {
  return 44330 * (1.0 - Math.pow(pressure / seaLevelPressure, 1 / 5.255));
}

/**
 * Calculate pressure from altitude (inverse barometric formula)
 * @param altitude - Altitude in meters
 * @param seaLevelPressure - Reference sea level pressure (default 1013.25 hPa)
 * @returns pressure in hPa
 */
export function calculatePressureFromAltitude(
  altitude: number,
  seaLevelPressure: number = 1013.25
): number {
  return seaLevelPressure * Math.pow(1.0 - altitude / 44330, 5.255);
}

/**
 * Calculate height above the baseline from two pressure readings.
 *
 * Uses the hypsometric equation (accurate at any pressure, not just near 1013.25 hPa):
 *
 *   Δh = (Rd · Tv / g) · ln(P_base / P_device)
 *
 * where:
 *   Rd = 287.058 J·kg⁻¹·K⁻¹  (specific gas constant, dry air)
 *   Tv = 293 K                  (virtual temp, ≈ 20 °C — adjust for local climate)
 *    g = 9.80665 m·s⁻²
 *   → scale_height ≈ 8568 m
 *
 * Why not the old `ΔP × 8.4` linear constant?
 *   That constant assumes P_base = 1013.25 hPa.  At Indore (~956 hPa)
 *   the correct conversion is ≈ 7.93 m/hPa, not 8.4 — a ~6% error per floor.
 *   The log formula is self-correcting regardless of local surface pressure.
 *
 * @param basePressure   – Live surface pressure at building ground floor (hPa).
 *                         Provide buildings.surface_pressure_hpa from the DB
 *                         (updated hourly via Open-Meteo).
 * @param devicePressure – Current barometer reading on the student's device (hPa).
 * @returns height above ground floor in metres (positive = higher floor).
 */
export function calculateFloorHeightFromPressure(
  basePressure: number,
  devicePressure: number
): number {
  if (basePressure <= 0 || devicePressure <= 0) return 0;

  // Scale height for standard atmosphere at 20 °C:
  //   Rd * Tv / g = 287.058 * 293 / 9.80665 ≈ 8568 m
  const SCALE_HEIGHT_M = 8568;
  return SCALE_HEIGHT_M * Math.log(basePressure / devicePressure);
}

/**
 * Estimate the floor a student is currently on.
 *
 * @param basePressure      – Live surface pressure at building ground (hPa).
 *                            Use buildings.surface_pressure_hpa from the DB.
 * @param devicePressure    – Device barometer reading (hPa).
 * @param floorHeightMeters – Average floor-to-floor height (default 3.5 m).
 *                            Typical Indian university buildings: 3.2–3.8 m.
 *                            Override per building if you know the real value.
 * @returns floor index where 0 = ground floor, 1 = first floor, etc.
 *          Negative values mean the device reads HIGHER than the baseline
 *          (rare; could indicate the student is on a ramp/basement or weather).
 */
export function estimateFloorNumber(
  basePressure: number,
  devicePressure: number,
  floorHeightMeters: number = 3.5
): number {
  const heightDifference = calculateFloorHeightFromPressure(basePressure, devicePressure);
  return Math.round(heightDifference / floorHeightMeters);
}

/**
 * Expected pressure delta between adjacent floors.
 * Useful for setting verification tolerances.
 *
 * At Indore (~956 hPa, 20 °C):
 *   pressureDropPerFloor(956, 3.5) ≈ 0.39 hPa
 *
 * @param surfacePressure   – Current Open-Meteo surface pressure (hPa).
 * @param floorHeightMeters – Floor height (default 3.5 m).
 * @returns pressure drop in hPa for one floor.
 */
export function pressureDropPerFloor(
  surfacePressure: number,
  floorHeightMeters: number = 3.5
): number {
  // Derived from inverting the hypsometric formula:
  //   ΔP_floor = P_base * (1 - exp(-floor_height / scale_height))
  const SCALE_HEIGHT_M = 8568;
  return surfacePressure * (1 - Math.exp(-floorHeightMeters / SCALE_HEIGHT_M));
}

/**
 * Compute the expected barometer reading for a known floor.
 * Use this to verify: |device_pressure - expected_pressure| ≤ tolerance
 *
 * @param surfacePressure   – Open-Meteo surface pressure at building ground (hPa).
 * @param floorNumber       – Target floor (0 = ground).
 * @param floorHeightMeters – Floor height (default 3.5 m).
 * @returns expected barometer reading in hPa.
 */
export function expectedPressureAtFloor(
  surfacePressure: number,
  floorNumber: number,
  floorHeightMeters: number = 3.5
): number {
  const SCALE_HEIGHT_M = 8568;
  const floorAltitude = floorNumber * floorHeightMeters;
  return surfacePressure * Math.exp(-floorAltitude / SCALE_HEIGHT_M);
}

/**
 * Check whether the device has a barometer/pressure sensor.
 */
export async function requestBarometerPermission(): Promise<boolean> {
  try {
    const available = await Barometer.isAvailableAsync();
    if (!available) {
      console.warn('[BarometerService] Hardware barometer not available on this device/emulator — will use mock data');
    }
    return available;
  } catch (error) {
    console.error('[BarometerService] Error checking barometer availability:', error);
    return false;
  }
}

/**
 * Get a single barometer reading.
 * On real hardware: subscribes to expo-sensors Barometer, collects one reading, unsubscribes.
 * On emulators without sensor: falls back to mock value ± noise.
 *
 * Kalman filtering is applied on top using BarometerKalmanFilter for smoothing.
 */
export async function getBarometerReading(): Promise<BarometerReading | null> {
  try {
    const available = await Barometer.isAvailableAsync();

    if (available) {
      // Read from hardware sensor with a 3-second timeout
      const pressure = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          subscription.remove();
          reject(new Error('Barometer read timeout'));
        }, 3000);

        const subscription = Barometer.addListener(({ pressure: p }) => {
          clearTimeout(timer);
          subscription.remove();
          resolve(p);
        });
      });

      const altitude = calculateAltitudeFromPressure(pressure);
      console.log(`[BarometerService] ✅ Hardware pressure: ${pressure.toFixed(2)} hPa, altitude: ${altitude.toFixed(1)}m`);

      return {
        pressure,
        altitude,
        timestamp: Date.now(),
        unit: 'hPa',
        source: 'hardware',
        available: true,
      };
    } else {
      // Emulator / no sensor → mock fallback
      const noise = (Math.random() - 0.5) * 0.5;
      const currentPressure = mockPressureValue + noise;
      const altitude = calculateAltitudeFromPressure(currentPressure);
      console.warn(`[BarometerService] ⚠️ Mock pressure: ${currentPressure.toFixed(2)} hPa (no hardware sensor)`);

      return {
        pressure: currentPressure,
        altitude,
        timestamp: Date.now(),
        unit: 'hPa',
        source: 'mock',
        available: false,
      };
    }
  } catch (error) {
    console.error('[BarometerService] Error getting barometer reading:', error);
    return null;
  }
}

/**
 * FOR TESTING: Manually override the mock pressure value
 */
export function setMockPressure(pressureHpa: number): void {
  mockPressureValue = pressureHpa;
  console.log(`[BarometerService] Mock pressure set to ${pressureHpa} hPa`);
}

/**
 * Subscribe to continuous barometer updates.
 * Returns an unsubscribe function. On unavailable devices yields mock readings
 * via setInterval so callers always get a stream regardless of hardware.
 *
 * @param onReading  – called with each new BarometerReading
 * @param intervalMs – update interval for mock fallback (default 1000ms)
 */
export async function subscribeToBarometer(
  onReading: (reading: BarometerReading) => void,
  intervalMs = 1000
): Promise<() => void> {
  const available = await Barometer.isAvailableAsync();

  if (available) {
    const filter = new BarometerKalmanFilter();
    const sub = Barometer.addListener(({ pressure: p }) => {
      const smoothed = filter.update(p);
      onReading({
        pressure: smoothed,
        altitude: calculateAltitudeFromPressure(smoothed),
        timestamp: Date.now(),
        unit: 'hPa',
        source: 'hardware',
        available: true,
      });
    });
    return () => sub.remove();
  } else {
    // Emulator fallback — emit mock data on an interval
    const filter = new BarometerKalmanFilter(mockPressureValue);
    const id = setInterval(() => {
      const noise = (Math.random() - 0.5) * 0.5;
      const raw = mockPressureValue + noise;
      const smoothed = filter.update(raw);
      onReading({
        pressure: smoothed,
        altitude: calculateAltitudeFromPressure(smoothed),
        timestamp: Date.now(),
        unit: 'hPa',
        source: 'mock',
        available: false,
      });
    }, intervalMs);
    return () => clearInterval(id);
  }
}

/**
 * Kalman filter for barometer readings
 * Smooths pressure readings to reduce noise
 */
export class BarometerKalmanFilter {
  private q: number = 0.01;
  private r: number = 0.5;
  private x: number;
  private p: number = 1;
  private lastTimestamp: number = 0;

  constructor(initialValue: number = 1013.25) {
    this.x = initialValue;
  }

  /**
   * Update filter with new measurement
   * @param measurement - New pressure measurement in hPa
   * @returns smoothed pressure estimate
   */
  update(measurement: number): number {
    // Predict
    this.p = this.p + this.q;

    // Correct
    const k = this.p / (this.p + this.r); // Kalman gain
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;

    this.lastTimestamp = Date.now();
    return this.x;
  }

  /**
   * Reset filter
   */
  reset(initialValue: number = 1013.25): void {
    this.x = initialValue;
    this.p = 1;
    this.lastTimestamp = 0;
  }

  /**
   * Get current smoothed value
   */
  getValue(): number {
    return this.x;
  }
}

/**
 * Strategy for using barometer for floor verification
 * This is STEP 2 of your 3-step verification process
 */
export interface FloorVerificationStrategy {
  /**
   * Verify student is on correct floor
   * @param baselinePressure - Ground floor baseline pressure
   * @param currentPressure - Student's current pressure reading
   * @param expectedFloor - Expected floor number (0 = ground)
   * @param tolerance - Floor tolerance (±0.5 floors = ±0.5m)
   * @returns verification result
   */
  verifyFloor(
    baselinePressure: number,
    currentPressure: number,
    expectedFloor: number,
    tolerance?: number
  ): {
    isOnCorrectFloor: boolean;
    estimatedFloor: number;
    heightDifference: number;
    confidence: "high" | "medium" | "low";
  };
}

/**
 * Default floor verification implementation
 */
export const defaultFloorVerification: FloorVerificationStrategy = {
  verifyFloor(baselinePressure, currentPressure, expectedFloor, tolerance = 0.5) {
    const heightDifference = calculateFloorHeightFromPressure(
      baselinePressure,
      currentPressure
    );
    const estimatedFloor = estimateFloorNumber(
      baselinePressure,
      currentPressure
    );

    const floorDifference = Math.abs(estimatedFloor - expectedFloor);

    return {
      isOnCorrectFloor: floorDifference <= tolerance,
      estimatedFloor,
      heightDifference,
      confidence:
        floorDifference < 0.25
          ? "high"
          : floorDifference < 0.5
            ? "medium"
            : "low",
    };
  },
};

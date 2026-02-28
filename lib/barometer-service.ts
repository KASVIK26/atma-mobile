/**
 * Barometer Service for altitude and pressure sensing
 * Used for verifying student is on correct floor in multi-story buildings
 * Primary verification method (more accurate than GPS distance)
 * 
 * NOTE: Expo doesn't have built-in barometer support yet.
 * This implementation provides fallback using GPS altitude calculation
 * and mock data for testing.
 * 
 * For production: Integrate with react-native-nfc-manager or custom native module
 */

// Simulate barometer readings for testing purposes
// In production, this would be replaced with actual sensor data
let mockPressureValue = 956.72; // Default: your testing zone baseline

export interface BarometerReading {
  pressure: number; // hPa (hectopascals)
  altitude: number; // meters (calculated from pressure)
  timestamp: number;
  unit?: string; // 'hPa'
  source?: string; // 'mock' or 'native'
  available?: boolean; // Whether using actual sensor (false = mock data)
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
 * Calculate floor height difference from pressure difference
 * Useful for determining if student is on correct floor
 *
 * Typical floor heights ~3-4 meters
 * Pressure difference ~30-40 hPa per floor
 *
 * @param baselinePressure - Baseline pressure for ground floor in hPa
 * @param currentPressure - Current atmospheric pressure in hPa
 * @returns estimated height difference in meters
 */
export function calculateFloorHeightFromPressure(
  baselinePressure: number,
  currentPressure: number
): number {
  // For every 12 Pa decrease, altitude increases by approximately 1 meter
  // Or: 1 hPa = 100 Pa ≈ 8.4 meters altitude change
  const pressureDifference = baselinePressure - currentPressure;
  return pressureDifference * 8.4;
}

/**
 * Estimate floor number from baseline and current pressure
 * @param baselinePressure - Baseline pressure (typically ground floor)
 * @param currentPressure - Current atmospheric pressure
 * @param floorHeightMeters - Typical floor height (default 3.5m)
 * @returns estimated floor number (0 = ground floor, 1 = first floor, etc.)
 */
export function estimateFloorNumber(
  baselinePressure: number,
  currentPressure: number,
  floorHeightMeters: number = 3.5
): number {
  const heightDifference = calculateFloorHeightFromPressure(
    baselinePressure,
    currentPressure
  );
  return Math.round(heightDifference / floorHeightMeters);
}

/**
 * Request barometer/pressure sensor permission
 * Note: Requires custom native module or external library integration
 */
export async function requestBarometerPermission(): Promise<boolean> {
  try {
    // Placeholder: Would integrate with native barometer module
    console.warn(
      "[BarometerService] Barometer not available in Expo. Requires custom native module.",
      "Consider using: react-native-sensors or custom implementation"
    );
    return false;
  } catch (error) {
    console.error("[BarometerService] Error checking permission:", error);
    return false;
  }
}

/**
 * Get current barometer reading
 * FALLBACK: Uses mock data since Expo doesn't support barometer
 * 
 * In production, this would:
 * 1. Use actual sensor hardware via native module
 * 2. Apply Kalman filter for smoothing
 * 3. Return pressure in hPa with timestamp
 * 
 * For testing: Can manually set mockPressureValue for different floor scenarios
 */
export async function getBarometerReading(): Promise<BarometerReading | null> {
  try {
    // Expo managed workflow doesn't support barometer access
    // This limitation requires either:
    // 1. Custom native module (complex)
    // 2. EAS Build with custom Expo plugin (medium)
    // 3. Bare React Native workflow (not using Expo)
    
    // Return mock data for testing
    // In real scenarios, add small noise to simulate sensor variance
    const noise = (Math.random() - 0.5) * 0.5; // ±0.25 hPa
    const currentPressure = mockPressureValue + noise;
    const altitude = calculateAltitudeFromPressure(currentPressure);
    
    const reading: BarometerReading = {
      pressure: currentPressure,
      altitude,
      timestamp: Date.now(),
    };

    console.log(
      `[BarometerService] Mock pressure: ${currentPressure.toFixed(2)} hPa, Altitude: ${altitude.toFixed(2)}m (NOT from actual sensor)`
    );

    return reading;
  } catch (error) {
    console.error("[BarometerService] Error getting barometer reading:", error);
    return null;
  }
}

/**
 * FOR TESTING: Manually set a pressure value (simulates being on different floors)
 * Example:
 *   setMockPressure(956.72) // Ground floor
 *   setMockPressure(956.44) // Floor +1 (approx 2.4m higher)
 *   setMockPressure(956.16) // Floor +2 (approx 4.8m higher)
 */
export function setMockPressure(pressureHpa: number): void {
  mockPressureValue = pressureHpa;
  console.log(`[BarometerService] Mock pressure set to ${pressureHpa} hPa`);
}

/**
 * Kalman filter for barometer readings
 * Smooths pressure readings to reduce noise
 */
export class BarometerKalmanFilter {
  private q: number = 0.01; // Process noise (how much we trust new measurements)
  private r: number = 0.5; // Measurement noise (how much sensor noise we expect)
  private x: number = 1013.25; // State (current pressure estimate)
  private p: number = 1; // Estimate error
  private lastTimestamp: number = 0;

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

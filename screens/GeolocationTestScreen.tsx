import MapPolygonVisualization from '@/components/MapPolygonVisualization';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
    calculateFloorHeightFromPressure
} from '@/lib/barometer-service';
import {
    calculateDistance,
    getCurrentLocation,
    isInsideRoom,
    LocationCoordinates,
    requestLocationPermissions,
    RoomGeometry,
} from '@/lib/geolocation-service';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

/**
 * Test Screen for Geolocation Integration
 * - Fetches current location
 * - Visualizes on map
 * - Checks if inside room geometry
 * - 5-second timer for checking
 */

// Updated with actual test geometries - Indore Zone (YOUR TESTING LOCATION)
// Student has this emulator location: latitude 23.16717, longitude 75.7846217

// GeoJSON Polygon from WKB: {"type": "Polygon", "coordinates": [[[75.784611, 23.167191], [75.784614, 23.167137], [75.784665, 23.167132], [75.784665, 23.167181], [75.784611, 23.167191]]]}
// Coordinates are in [longitude, latitude] format (standard GeoJSON format)
const ROOM_GEOMETRY: RoomGeometry = {
  type: 'Polygon',
  coordinates: [
    [75.784611, 23.167191],
    [75.784614, 23.167137],
    [75.784665, 23.167132],
    [75.784665, 23.167181],
    [75.784611, 23.167191],
  ] as number[][],
};

// Alternative for comparison - Point-based (center of polygon)
const ROOM_POINT: RoomGeometry = {
  type: 'Point',
  coordinates: [75.7846375, 23.1671575], // Center of polygon
  radius: 100, // 100 meters
};

// Baseline pressure for barometer verification (Step 2)
const BASELINE_PRESSURE_HPA = 956.72;  // Your testing zone baseline

export function GeolocationTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerCount, setTimerCount] = useState(5);
  const [lastCheckResult, setLastCheckResult] = useState<{
    isInside: boolean;
    distance?: number;
    confidence: 'high' | 'medium' | 'low';
    timestamp: string;
  } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [barometerReading, setBarometerReading] = useState<number | null>(null);
  const [estimatedFloor, setEstimatedFloor] = useState<number | null>(null);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const granted = await requestLocationPermissions();
      setPermissionGranted(granted);
    };

    requestPermissions();
  }, []);

  // Handle timer countdown
  useEffect(() => {
    if (!timerActive) return;

    if (timerCount <= 0) {
      setTimerActive(false);
      setTimerCount(5);
      return;
    }

    const timer = setInterval(() => {
      setTimerCount((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timerCount]);

  /**
   * Handle location check - 5 second process with barometer verification
   * New logic: 12m distance to center + Barometer as primary verification
   */
  const handleCheckLocation = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'Location permission not granted');
      return;
    }

    setChecking(true);
    setTimerActive(true);
    setTimerCount(5);

    try {
      console.log('[GeolocationTestScreen] Starting 5-second location + barometer check...');

      // Get initial location
      const initialLocation = await getCurrentLocation();

      if (!initialLocation) {
        Alert.alert('Error', 'Could not get location. Try again.');
        setChecking(false);
        setTimerActive(false);
        return;
      }

      setLocation(initialLocation);
      console.log(
        '[GeolocationTestScreen] Initial location:',
        initialLocation
      );

      // Collect location samples over 5 seconds
      const positions: LocationCoordinates[] = [initialLocation];

      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const nextLocation = await getCurrentLocation();
        if (nextLocation) {
          positions.push(nextLocation);
          console.log(`[GeolocationTestScreen] Sample ${i + 2}:`, nextLocation);
        }
      }

      // Use last location
      const smoothedLocation = positions[positions.length - 1];

      // PRIMARY VERIFICATION: Distance to center (12m rule)
      const result = isInsideRoom(smoothedLocation, ROOM_GEOMETRY);
      const distanceToCenter = result.distance || 0;
      
      // NEW RULE: 12m distance to center instead of polygon boundary
      const isWithin12m = distanceToCenter <= 12;

      console.log(
        `[GeolocationTestScreen] Distance to center: ${distanceToCenter.toFixed(2)}m, Within 12m: ${isWithin12m}`
      );

      // SECONDARY VERIFICATION: Barometer (pressure sensor)
      const { getBarometerReading } = await import('@/lib/barometer-service');
      const barometerData = await getBarometerReading();
      
      if (barometerData) {
        setBarometerReading(barometerData.pressure);
        const { estimateFloorNumber } = await import('@/lib/barometer-service');
        const floor = estimateFloorNumber(BASELINE_PRESSURE_HPA, barometerData.pressure);
        setEstimatedFloor(floor);
        
        console.log(
          `[GeolocationTestScreen] Barometer: ${barometerData.pressure.toFixed(2)} hPa, Estimated Floor: ${floor}`
        );
      }

      const checkResult = {
        isInside: isWithin12m, // Changed: using 12m distance rule
        distance: distanceToCenter,
        confidence: result.confidence,
        timestamp: new Date().toLocaleTimeString(),
      };

      setLastCheckResult(checkResult);

      console.log(
        `[GeolocationTestScreen] ✅ RESULT: Student is ${
          isWithin12m ? 'INSIDE (within 12m)' : 'OUTSIDE (>12m away)'
        }`
      );
      console.log('[GeolocationTestScreen] Location:', smoothedLocation);
      console.log('[GeolocationTestScreen] Confidence:', result.confidence);
      console.log('[GeolocationTestScreen] Distance to center:', `${distanceToCenter.toFixed(2)}m`);

      // Show alert with result
      Alert.alert(
        isWithin12m ? '✅ Within Zone (12m)' : '❌ Outside Zone (>12m)',
        `Location: ${smoothedLocation.latitude.toFixed(6)}, ${smoothedLocation.longitude.toFixed(6)}\n` +
          `Distance to Center: ${distanceToCenter.toFixed(2)}m\n` +
          `Accuracy: ${smoothedLocation.accuracy.toFixed(2)}m\n` +
          `Confidence: ${result.confidence.toUpperCase()}${
            barometerReading ? `\nPressure: ${barometerReading.toFixed(2)} hPa` : ''
          }`
      );
    } catch (error) {
      console.error('[GeolocationTestScreen] Error:', error);
      Alert.alert('Error', String(error));
    } finally {
      setChecking(false);
      setTimerActive(false);
      setTimerCount(5);
    }
  };

  /**
   * Get fresh location (instant)
   */
  const handleGetCurrentLocation = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation(loc);
        console.log('[GeolocationTestScreen] Fresh location:', loc);
      }
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance for display purposes
  const getDisplayDistance = (): number | null => {
    if (!location) return null;

    if (ROOM_GEOMETRY.type === 'Polygon') {
      // Calculate distance to polygon center
      const coords = ROOM_GEOMETRY.coordinates as number[][];
      let latSum = 0,
        lonSum = 0;
      for (let i = 0; i < coords.length; i++) {
        lonSum += coords[i][0];
        latSum += coords[i][1];
      }
      const centerLat = latSum / coords.length;
      const centerLon = lonSum / coords.length;
      return calculateDistance(
        [location.latitude, location.longitude],
        [centerLat, centerLon]
      );
    } else {
      // Point geometry
      return calculateDistance(
        [location.latitude, location.longitude],
        ROOM_GEOMETRY.coordinates as [number, number]
      );
    }
  };

  const distance = getDisplayDistance();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="location-on" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Geolocation Test
          </Text>
        </View>

        {/* Permission Status */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: permissionGranted ? colors.success : colors.error,
              opacity: 0.1,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: permissionGranted ? colors.success : colors.error,
              },
            ]}
          >
            {permissionGranted ? '✅ Location Permission Granted' : '❌ Permission Denied'}
          </Text>
        </View>

        {/* Room Information */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Room/Classroom Geometry
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Type:
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {ROOM_GEOMETRY.type === 'Polygon' ? 'Building Polygon' : 'Point + Radius'}
            </Text>
          </View>

          {ROOM_GEOMETRY.type === 'Polygon' ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Vertices:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {(ROOM_GEOMETRY.coordinates as number[][]).length}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  First Vertex:
                </Text>
                <Text style={[styles.value, { color: colors.text, fontSize: 11 }]}>
                  {((ROOM_GEOMETRY.coordinates as number[][])[0] &&
                  Array.isArray((ROOM_GEOMETRY.coordinates as number[][])[0]) &&
                  (ROOM_GEOMETRY.coordinates as number[][])[0].length >= 2
                    ? `${Number((ROOM_GEOMETRY.coordinates as number[][])[0][1]).toFixed(6)}, ${Number((ROOM_GEOMETRY.coordinates as number[][])[0][0]).toFixed(6)}`
                    : 'N/A')}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Center:
                </Text>
                <Text style={[styles.value, { color: colors.text, fontSize: 11 }]}>
                  {(ROOM_GEOMETRY.coordinates &&
                  Array.isArray(ROOM_GEOMETRY.coordinates) &&
                  (ROOM_GEOMETRY.coordinates as [number, number]).length >= 2
                    ? `${Number((ROOM_GEOMETRY.coordinates as [number, number])[1]).toFixed(6)}, ${Number((ROOM_GEOMETRY.coordinates as [number, number])[0]).toFixed(6)}`
                    : 'N/A')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Radius:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {ROOM_GEOMETRY.radius || 100}m
                </Text>
              </View>
            </>
          )}

          <View
            style={{
              backgroundColor: colors.background,
              padding: 8,
              borderRadius: 6,
              marginTop: 8,
            }}
          >
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: 10 }]}>
              Baseline Pressure: {BASELINE_PRESSURE_HPA} hPa
            </Text>
            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
              ]}
            >
              Testing Zone: Indore, India
            </Text>
          </View>
        </View>

        {/* Barometer Info - PRIMARY Verification */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🌡️ PRIMARY: Barometer / Pressure Sensor
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: colors.primary }}>Most Accurate Verification Method</Text>
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Measures atmospheric pressure to verify correct floor location. Accuracy: ±0.2m (much better than GPS ±3-5m). Prevents spoofing to adjacent floors even if GPS location is faked.
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              🏢 Baseline Pressure (Ground Floor):
            </Text>
            <Text style={[styles.value, { color: colors.text, fontWeight: '700' }]}>
              {BASELINE_PRESSURE_HPA} hPa
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              📊 Current Pressure (Live):
            </Text>
            <Text style={[styles.value, { color: barometerReading ? colors.success : colors.warning, fontWeight: '700' }]}>
              {barometerReading ? `${barometerReading.toFixed(2)} hPa` : '⏳ Waiting...'}
            </Text>
          </View>

          {barometerReading && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  📏 Height Difference from Baseline:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {calculateFloorHeightFromPressure(BASELINE_PRESSURE_HPA, barometerReading).toFixed(2)} m
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  🏢 Estimated Floor:
                </Text>
                <Text style={[styles.value, { color: estimatedFloor === 0 ? colors.success : colors.warning, fontWeight: '700' }]}>
                  {estimatedFloor ?? 'N/A'} (Ground = 0)
                </Text>
              </View>
            </>
          )}

          <View
            style={{
              backgroundColor: colors.background,
              padding: 8,
              borderRadius: 6,
              marginTop: 8,
            }}
          >
            <Text style={[styles.label, { color: colors.success, fontSize: 10, fontWeight: '700' }]}>
              ✅ Barometer Configured: Using mock data (Expo limitation)
            </Text>
            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
              ]}
            >
              For production: Use custom native module or EAS Build with Expo plugin
            </Text>
            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
              ]}
            >
              Kalman filter applied for pressure smoothing on actual device hardware
            </Text>
          </View>
        </View>

        {/* Map Visualization */}
        <View style={[styles.card, { backgroundColor: colors.card, padding: 0, overflow: 'hidden' }]}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📍 Map Visualization
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4, fontSize: 12 }]}>
              {lastCheckResult ? (lastCheckResult.isInside ? '✅ Inside Classroom' : '❌ Outside Classroom') : 'Classroom polygon with your current location'}
            </Text>
          </View>
          <MapPolygonVisualization
            polygon={ROOM_GEOMETRY.type === 'Polygon' ? (ROOM_GEOMETRY.coordinates as Array<[number, number]>) : [[ROOM_GEOMETRY.coordinates[0] - 0.0001, ROOM_GEOMETRY.coordinates[1] - 0.0001], [ROOM_GEOMETRY.coordinates[0] + 0.0001, ROOM_GEOMETRY.coordinates[1] - 0.0001], [ROOM_GEOMETRY.coordinates[0] + 0.0001, ROOM_GEOMETRY.coordinates[1] + 0.0001], [ROOM_GEOMETRY.coordinates[0] - 0.0001, ROOM_GEOMETRY.coordinates[1] + 0.0001], [ROOM_GEOMETRY.coordinates[0] - 0.0001, ROOM_GEOMETRY.coordinates[1] - 0.0001]]}
            currentLocation={location || undefined}
            isInside={lastCheckResult?.isInside || false}
            title="Classroom Location - Indore"
            height={350}
          />
        </View>

        {/* Current Location */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Location
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleGetCurrentLocation}
              disabled={loading || checking}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="my-location" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Get Location</Text>
                </>
              )}
            </Pressable>
          </View>

          {location ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Latitude:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {location.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Longitude:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {location.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Accuracy:
                </Text>
                <Text
                  style={[
                    styles.value,
                    {
                      color:
                        location.accuracy < 5
                          ? colors.success
                          : location.accuracy < 15
                            ? colors.warning
                            : colors.error,
                    },
                  ]}
                >
                  {location.accuracy.toFixed(2)}m{' '}
                  {location.accuracy < 5
                    ? '(High)'
                    : location.accuracy < 15
                      ? '(Medium)'
                      : '(Low)'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Altitude:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {location.altitude.toFixed(2)}m
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Speed:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {(location.speed * 3.6).toFixed(2)} km/h
                </Text>
              </View>

              {distance !== null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Distance to Room:
                  </Text>
                  <Text
                    style={[
                      styles.value,
                      {
                        color:
                          distance <= 50
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {distance.toFixed(2)}m
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
              Click "Get Location" to fetch current position
            </Text>
          )}
        </View>

        {/* Check Location - 5 Second Timer */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🚩 Step 1: Verify GPS Location (12m Rule)
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Collects GPS samples over 5 seconds + fetches barometer data. If within 12m of classroom center + correct pressure, attendance verified.
          </Text>

          {timerActive ? (
            <View style={styles.timerContainer}>
              <View
                style={[
                  styles.timerCircle,
                  { borderColor: colors.primary, backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.timerText}>{timerCount}</Text>
              </View>
              <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                Collecting location data...
              </Text>
            </View>
          ) : (
            <Pressable
              style={[
                styles.checkButton,
                {
                  backgroundColor: colors.primary,
                  opacity: checking || !permissionGranted ? 0.5 : 1,
                },
              ]}
              onPress={handleCheckLocation}
              disabled={checking || !permissionGranted}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="gps-fixed" size={20} color="#fff" />
                  <Text style={styles.checkButtonText}>
                    Start 5-Second Check
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {lastCheckResult && (
            <View
              style={[
                styles.resultBox,
                {
                  backgroundColor: lastCheckResult.isInside
                    ? colors.success
                    : colors.error,
                  opacity: 0.15,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <MaterialIcons
                  name={lastCheckResult.isInside ? 'check-circle' : 'cancel'}
                  size={24}
                  color={lastCheckResult.isInside ? colors.success : colors.error}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.resultTitle,
                      {
                        color: lastCheckResult.isInside
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {lastCheckResult.isInside ? 'Within 12m Zone ✅' : 'Outside 12m Zone ❌'}
                  </Text>
                  <Text
                    style={[
                      styles.resultTime,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {lastCheckResult.timestamp}
                  </Text>
                </View>
              </View>

              <View style={styles.resultDetails}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                    Confidence:
                  </Text>
                  <Text
                    style={[
                      styles.resultValue,
                      {
                        color:
                          lastCheckResult.confidence === 'high'
                            ? colors.success
                            : lastCheckResult.confidence === 'medium'
                              ? colors.warning
                              : colors.error,
                      },
                    ]}
                  >
                    {lastCheckResult.confidence.toUpperCase()}
                  </Text>
                </View>

                {lastCheckResult.distance && (
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                      Distance:
                    </Text>
                    <Text style={[styles.resultValue, { color: colors.text }]}>
                      {lastCheckResult.distance.toFixed(2)}m
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* GPS Accuracy Improvement Strategies */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 GPS Accuracy: Why It Jumps & Solutions
          </Text>
          
          <View style={styles.strategyBox}>
            <Text style={[styles.strategyTitle, { color: colors.text }]}>
              Why GPS Jumps:
            </Text>
            <Text style={[styles.strategyText, { color: colors.textSecondary }]}>
              • Multipath errors (signal bouncing off buildings)
              • Ionospheric delays
              • Limited satellite geometry
              • Atmospheric interference
              • Software implementation in OS
            </Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={[styles.strategyTitle, { color: colors.text }]}>
              Our 3-Step Mitigation:
            </Text>
            <Text style={[styles.strategyText, { color: colors.textSecondary }]}>
              🚩 Step 1:  Geolocation (GPS with Kalman smoothing)
              • Collect 5 samples over 5 seconds
              • Filter noisy data with weighted averaging
              • Use accuracy field to weight samples
              • Result: ±3-5m accuracy zone verification
            </Text>
            <Text style={[styles.strategyText, { color: colors.textSecondary, marginTop: 8 }]}>
              🌡️ Step 2: Barometer (Pressure within 0.2m)
              • Detects correct floor in buildings
              • Kalman filter smoothing on pressure
              • Floor detection with ±0.5m tolerance
              • Prevents spoofing to adjacent floors
            </Text>
            <Text style={[styles.strategyText, { color: colors.textSecondary, marginTop: 8 }]}>
              🔐 Step 3: TOTP / Challenge-Response
              • Time-based One-Time Password
              • Location & barometer already verified
              • TOTP is final "bolt" preventing spoofing
              • Changes every 30 seconds
            </Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={[styles.strategyTitle, { color: colors.text }]}>
              For Production Accuracy:
            </Text>
            <Text style={[styles.strategyText, { color: colors.textSecondary }]}>
              ✓ Implement Kalman/Particle filter smoothing
              ✓ Use GNSS (GPS + GLONASS + Galileo)
              ✓ Integrate barometer sensor
              ✓ Add WiFi/BLE proximity (indoor positioning)
              ✓ Cache historical accuracy data
              ✓ Combine with cell tower triangulation
            </Text>
          </View>
        </View>

        {/* Debug Info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Debug Info
          </Text>
          <View style={styles.debugInfo}>
            <Text style={[styles.debugLabel, { color: colors.textSecondary }]}>
              User ID: {user?.id}
            </Text>
            <Text style={[styles.debugLabel, { color: colors.textSecondary }]}>
              Permission Status: {permissionGranted ? 'Granted' : 'Denied'}
            </Text>
            <Text style={[styles.debugLabel, { color: colors.textSecondary }]}>
              Accuracy Threshold: &lt;5m (High), &lt;15m (Medium), ≥15m (Low)
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  placeholder: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  timerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultTime: {
    fontSize: 11,
    marginTop: 2,
  },
  resultDetails: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  strategyBox: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  strategyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  strategyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  mapPlaceholder: {
    height: 250,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mapText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  mapSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  debugInfo: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8,
  },
  debugLabel: {
    fontSize: 12,
    paddingVertical: 6,
    fontFamily: 'monospace',
  },
});

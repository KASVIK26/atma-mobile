import supabase from '@/lib/supabase';
import { booleanPointInPolygon, polygon as createPolygon, point } from '@turf/turf';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  speed: number;
}

export interface RoomGeometry {
  type: 'Polygon' | 'Point';
  coordinates: number[][] | [number, number];
  radius?: number; // in meters, for buffer zone
}

export interface RoomData {
  id: string;
  room_number: string;
  room_name: string;
  floor_number: number;
  latitude: number;
  longitude: number;
  geofence_geojson: RoomGeometry | null;
  baseline_pressure_hpa: number | null;
  building?: {
    id: string;
    name: string;
  };
}

/**
 * Initialize location service
 * Call this once in your app initialization
 */
export const initializeGeolocation = async () => {
  try {
    console.log('[GeolocationService] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[GeolocationService] Initialization error:', error);
    return false;
  }
};

/**
 * Fetch room data from database for a lecture session
 * Gets the actual room geometry and baseline pressure for verification
 */
export const fetchRoomDataForSession = async (
  lectureSessionId: string,
  universityId: string
): Promise<RoomData | null> => {
  try {
    const { data, error } = await supabase
      .from('lecture_sessions')
      .select(`
        room_id,
        rooms(
          id,
          room_number,
          room_name,
          floor_number,
          latitude,
          longitude,
          geofence_geojson,
          baseline_pressure_hpa,
          building:buildings(id, name)
        )
      `)
      .eq('id', lectureSessionId)
      .eq('university_id', universityId)
      .single();

    if (error) throw error;

    if (!data?.rooms) {
      console.warn('[GeolocationService] No room found for lecture session:', lectureSessionId);
      return null;
    }

    const room = data.rooms as any;
    
    // Parse geofence_geojson from database (stored as JSON string)
    let geometry: RoomGeometry | null = null;
    
    if (room.geofence_geojson) {
      try {
        // If it's a string, parse it to object
        if (typeof room.geofence_geojson === 'string') {
          geometry = JSON.parse(room.geofence_geojson);
        } else {
          // Already an object
          geometry = room.geofence_geojson;
        }
        
        console.log('[GeolocationService] Parsed geofence geometry from DB:', {
          type: geometry?.type,
          coordinates: geometry?.type === 'Polygon' ? `${(geometry.coordinates as any)[0].length} points` : 'point',
        });
      } catch (parseError) {
        console.error('[GeolocationService] Error parsing geofence_geojson:', parseError);
        geometry = null;
      }
    }
    
    // If no geofence_geojson, create one from coordinates
    if (!geometry && room.latitude && room.longitude) {
      geometry = {
        type: 'Point',
        coordinates: [parseFloat(room.longitude), parseFloat(room.latitude)],
        radius: 50, // Default 50m radius from center
      };
      console.log('[GeolocationService] Created Point geometry from room coordinates');
    }

    const roomData: RoomData = {
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      floor_number: room.floor_number,
      latitude: parseFloat(room.latitude),  // Ensure numeric type
      longitude: parseFloat(room.longitude),  // Ensure numeric type
      geofence_geojson: geometry,
      baseline_pressure_hpa: room.baseline_pressure_hpa ? parseFloat(room.baseline_pressure_hpa) : null,  // Ensure numeric type
      building: room.building,
    };

    console.log('[GeolocationService] Fetched room data:', {
      room: roomData.room_name,
      geometry: geometry ? 'available' : 'will use point',
      baseline_pressure: roomData.baseline_pressure_hpa,
    });

    return roomData;
  } catch (error) {
    console.error('[GeolocationService] Error fetching room data:', error);
    return null;
  }
};

/**
 * Request location permissions (both platform-specific and background)
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    // Request expo-location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('[GeolocationService] Foreground permission denied');
      return false;
    }

    // Request background location permission if iOS
    if (Platform.OS === 'ios') {
      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus.status !== 'granted') {
        console.warn('[GeolocationService] Background permission denied on iOS');
        // Don't fail, foreground is sufficient for now
      }
    }

    console.log('[GeolocationService] Location permissions granted');
    return true;
  } catch (error) {
    console.error('[GeolocationService] Permission error:', error);
    return false;
  }
};

/**
 * Get current location once (one-time fetch)
 * Uses expo-location for simplicity in foreground
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    const coords: LocationCoordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      altitude: location.coords.altitude || 0,
      speed: location.coords.speed || 0,
    };

    console.log('[GeolocationService] Current location:', coords);
    return coords;
  } catch (error) {
    console.error('[GeolocationService] Error getting location:', error);
    return null;
  }
};

/**
 * Start watching location with callback
 * Used for continuous location updates
 */
export const startWatchingLocation = async (
  callback: (location: LocationCoordinates) => void,
  errorCallback?: (error: Error) => void
): Promise<any> => {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5, // Update every 5 meters
      },
      (location: Location.LocationObject) => {
        const coords: LocationCoordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          altitude: location.coords.altitude || 0,
          speed: location.coords.speed || 0,
        };
        callback(coords);
      }
    );

    console.log('[GeolocationService] Started watching location');
    return subscription;
  } catch (error) {
    console.error('[GeolocationService] Error watching location:', error);
    if (errorCallback) {
      errorCallback(error as Error);
    }
    return null;
  }
};

/**
 * Stop watching location
 */
export const stopWatchingLocation = async (subscription: any) => {
  try {
    if (subscription) {
      subscription.remove();
      console.log('[GeolocationService] Stopped watching location');
    }
  } catch (error) {
    console.error('[GeolocationService] Error stopping location watch:', error);
  }
};

/**
 * Calculate distance between two coordinates in meters
 * Using Haversine formula
 */
export const calculateDistance = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate polygon center point (centroid)
 * Returns [longitude, latitude] to match GeoJSON format
 */
const calculatePolygonCenter = (
  polygonCoordinates: number[][]
): [number, number] => {
  let lat = 0;
  let lon = 0;

  for (let i = 0; i < polygonCoordinates.length; i++) {
    lon += polygonCoordinates[i][0]; // longitude
    lat += polygonCoordinates[i][1]; // latitude
  }

  // Return [longitude, latitude] format for consistency with GeoJSON
  return [lon / polygonCoordinates.length, lat / polygonCoordinates.length];
};

/**
 * Check if student is inside room geometry using Turf.js
 * This properly handles GeoJSON Polygon geometry
 */
export const isInsideRoom = (
  studentLocation: LocationCoordinates,
  roomGeometry: RoomGeometry
): {
  isInside: boolean;
  distance?: number;
  confidence: 'high' | 'medium' | 'low';
} => {
  try {
    // Create Turf point: [longitude, latitude]
    const studentPoint = point([studentLocation.longitude, studentLocation.latitude]);

    if (roomGeometry.type === 'Polygon') {
      // GeoJSON Polygon coordinates: [[[lon, lat], [lon, lat], ...]]
      // First level: array of rings
      // Second level: each ring is an array of [lon, lat] pairs
      // For simple polygon, use the first ring (index 0)
      const rings = roomGeometry.coordinates as number[][][];
      
      if (!rings || rings.length === 0) {
        throw new Error('Polygon has no rings');
      }
      
      const polygonCoords = rings[0];  // Get the first ring (outer boundary)
      
      // Validate polygon coordinates
      if (!polygonCoords || polygonCoords.length < 4) {
        throw new Error(`Polygon must have at least 4 positions, got ${polygonCoords?.length || 0}`);
      }
      
      // Create Turf polygon: createPolygon expects [[[lon, lat], [lon, lat], ...]]
      const turfPolygon = createPolygon([polygonCoords]);
      
      // Use Turf's proper point-in-polygon check
      const isInside = booleanPointInPolygon(studentPoint, turfPolygon);

      // Calculate distance to polygon center (centroid) [lon, lat]
      const [centerLon, centerLat] = calculatePolygonCenter(polygonCoords);
      const distance = calculateDistance(
        [studentLocation.latitude, studentLocation.longitude],
        [centerLat, centerLon] // [lat, lon] format for calculateDistance
      );

      // Accuracy-based confidence
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (studentLocation.accuracy < 5) {
        confidence = 'high';
      } else if (studentLocation.accuracy < 15) {
        confidence = 'medium';
      }

      console.log(
        `[GeolocationService] Student at (${studentLocation.latitude.toFixed(6)}, ${studentLocation.longitude.toFixed(6)}) - Inside: ${isInside}, Distance to center: ${distance.toFixed(2)}m, Accuracy: ${studentLocation.accuracy.toFixed(2)}m`
      );

      return { isInside, distance, confidence };
    } else if (roomGeometry.type === 'Point') {
      const [roomLon, roomLat] = roomGeometry.coordinates as [number, number];
      const distance = calculateDistance(
        [studentLocation.latitude, studentLocation.longitude],
        [roomLat, roomLon]
      );

      const radius = roomGeometry.radius || 50; // Default 50 meters
      const isInside = distance <= radius;

      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (studentLocation.accuracy < 5) {
        confidence = 'high';
      } else if (studentLocation.accuracy < 15) {
        confidence = 'medium';
      }

      console.log(
        `[GeolocationService] Student at (${studentLocation.latitude.toFixed(6)}, ${studentLocation.longitude.toFixed(6)}) - Inside: ${isInside}, Distance: ${distance.toFixed(2)}m, Radius: ${radius}m`
      );

      return { isInside, distance, confidence };
    }

    return { isInside: false, confidence: 'low' };
  } catch (error) {
    console.error('[GeolocationService] Error checking if inside room:', error);
    return { isInside: false, confidence: 'low' };
  }
};

/**
 * Helper to convert degrees to radians
 */
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Request barometer/pressure sensor permission
 * Note: This is implicit on Android, but can warn on iOS
 */
export const requestBarometerPermission = async (): Promise<boolean> => {
  try {
    // Barometer permission check (varies by platform)
    console.log('[GeolocationService] Barometer sensor access - checking device compatibility');
    return true;
  } catch (error) {
    console.error('[GeolocationService] Barometer check error:', error);
    return false;
  }
};

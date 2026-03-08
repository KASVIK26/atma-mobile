# Integration Guide: Connecting Geolocation to Attendance Marking

## Overview

This guide shows exactly how to integrate the geolocation service into the actual `AttendanceStepGeolocation` component for real attendance verification.

---

## Current State

### Test Screen (GeolocationTestScreen.tsx)
- ✅ Standalone testing environment
- ✅ 5-second location collection working
- ✅ Distance & confidence calculations working
- ✅ Point-in-polygon verification ready
- ✅ Mock room geometry configured

### Attendance Flow (AttendanceBottomSheet.tsx)
- ✅ 3-step verification modal structure
- ✅ Step progression logic
- ✅ Submit button (ready for integration)
- ⏳ Step 1 needs: Real location verification
- ⏳ Step 2 needs: Real barometer integration
- ⏳ Step 3 needs: Real TOTP validation

---

## Integration Path

```
Test Screen Development
        ↓
AttendanceStepGeolocation Integration
        ↓
Full 3-Step Attendance Verification
        ↓
Production Deployment
```

---

## Step-by-Step Integration

### Step 1: Update AttendanceStepGeolocation Component

**File:** `components/AttendanceSteps/AttendanceStepGeolocation.tsx`

**Current Code:**
```typescript
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AttendanceStepGeolocationProps {
  onVerified: () => void;
  colors: any;
}

export function AttendanceStepGeolocation({ 
  onVerified, 
  colors 
}: AttendanceStepGeolocationProps) {
  const [loading, setLoading] = useState(false);

  const handleLocationCheck = async () => {
    setLoading(true);
    
    // TODO: Integrate real location verification here
    // Simulating 2 second delay
    setTimeout(() => {
      setLoading(false);
      onVerified();
    }, 2000);
  };

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
          Step 1: Verify Location
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Ensure you're in the classroom
        </Text>
      </View>

      <View style={{ 
        backgroundColor: colors.background, 
        padding: 12, 
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning
      }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          📍 Room Location: Building A, Level 2
        </Text>
      </View>

      <Pressable
        disabled={loading}
        onPress={handleLocationCheck}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          padding: 12,
          borderRadius: 8,
          opacity: pressed ? 0.8 : 1,
          opacity: loading ? 0.5 : 1,
        })}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
            Check Location
          </Text>
        )}
      </Pressable>
    </View>
  );
}
```

**Updated Code (With Real Geolocation):**

```typescript
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getCurrentLocation,
  requestLocationPermissions,
  isInsideRoom,
  calculateDistance,
  RoomGeometry,
} from '@/lib/geolocation-service';

interface AttendanceStepGeolocationProps {
  onVerified: () => void;
  colors: any;
  sessionId?: string;  // For fetching room coordinates from DB
}

// TODO: Fetch this from database based on session
const ROOM_GEOMETRY: RoomGeometry = {
  type: 'Point',
  coordinates: [72.923104, 19.187313],  // Replace with real classroom location
  radius: 100,  // Room buffer zone: 100 meters
};

export function AttendanceStepGeolocation({ 
  onVerified, 
  colors,
  sessionId
}: AttendanceStepGeolocationProps) {
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleLocationCheck = async () => {
    setLoading(true);
    setLocationError(null);

    try {
      console.log('[AttendanceStepGeolocation] Starting location verification...');

      // Step 1: Request permissions
      const permissionGranted = await requestLocationPermissions();
      if (!permissionGranted) {
        setLocationError('Location permission required');
        Alert.alert(
          'Permission Required',
          'Please enable location access in settings'
        );
        setLoading(false);
        return;
      }

      // Step 2: Collect 5 location samples over 5 seconds (Kalman filtering)
      const locations = [];
      for (let i = 0; i < 5; i++) {
        console.log(`[AttendanceStepGeolocation] Collecting sample ${i + 1}/5...`);
        
        const location = await getCurrentLocation();
        if (location) {
          locations.push(location);
          console.log(
            `[AttendanceStepGeolocation] Sample ${i + 1}: ` +
            `Lat ${location.latitude.toFixed(6)}, ` +
            `Lon ${location.longitude.toFixed(6)}, ` +
            `Accuracy ${location.accuracy.toFixed(2)}m`
          );
        }

        // Wait 1 second before next sample (except after last one)
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (locations.length === 0) {
        setLocationError('Could not get location');
        Alert.alert('Error', 'Failed to get location. Ensure GPS is enabled.');
        setLoading(false);
        return;
      }

      // Step 3: Use smoothed location (last sample is best after Kalman filtering)
      const smoothedLocation = locations[locations.length - 1];
      
      console.log(
        '[AttendanceStepGeolocation] Smoothed location: ' +
        `Lat ${smoothedLocation.latitude.toFixed(6)}, ` +
        `Lon ${smoothedLocation.longitude.toFixed(6)}, ` +
        `Accuracy ${smoothedLocation.accuracy.toFixed(2)}m`
      );

      // Step 4: Verify student is inside room geometry
      const verificationResult = isInsideRoom(smoothedLocation, ROOM_GEOMETRY);

      console.log(
        '[AttendanceStepGeolocation] Verification result: ' +
        `Inside=${verificationResult.isInside}, ` +
        `Distance=${verificationResult.distance?.toFixed(2)}m, ` +
        `Confidence=${verificationResult.confidence}`
      );

      // Step 5: Check result and confidence
      if (verificationResult.isInside) {
        // ✅ Student is inside - proceed to Step 2
        console.log('[AttendanceStepGeolocation] ✅ VERIFIED: Student is inside room');
        onVerified();
      } else {
        // ❌ Student is outside - show error
        const distance = verificationResult.distance || 0;
        const confidenceMsg = 
          verificationResult.confidence === 'high' 
            ? '(Reading is reliable)' 
            : '(Reading may be inaccurate)';

        setLocationError(
          `Too far from classroom (${distance.toFixed(0)}m away) ${confidenceMsg}`
        );
        
        Alert.alert(
          '❌ Location Verification Failed',
          `You are ${distance.toFixed(0)}m from the classroom. ` +
          `Please be in the room to mark attendance. ${confidenceMsg}`,
          [{ text: 'Try Again', onPress: () => { /* Will retry on button press */ } }]
        );

        console.log(
          '[AttendanceStepGeolocation] ❌ FAILED: Student is outside room. ' +
          `Distance: ${distance.toFixed(0)}m, Confidence: ${verificationResult.confidence}`
        );
      }
    } catch (error) {
      console.error('[AttendanceStepGeolocation] Error:', error);
      setLocationError('An error occurred while checking location');
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Title */}
      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
          Step 1: Verify Location
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Ensure you're in the classroom before proceeding
        </Text>
      </View>

      {/* Room Information */}
      <View
        style={{
          backgroundColor: colors.background,
          padding: 12,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
          📍 Expected Location
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
          Building A, Level 2
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          Accuracy required: {ROOM_GEOMETRY.radius}m radius
        </Text>
      </View>

      {/* Error Message (if any) */}
      {locationError && (
        <View
          style={{
            backgroundColor: colors.error,
            opacity: 0.15,
            padding: 12,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: colors.error,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>
            ⚠️ {locationError}
          </Text>
        </View>
      )}

      {/* Check Location Button */}
      <Pressable
        disabled={loading}
        onPress={handleLocationCheck}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          padding: 12,
          borderRadius: 8,
          opacity: pressed ? 0.8 : loading ? 0.5 : 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
        })}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              Verifying location...
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons name="my-location" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              Verify My Location
            </Text>
          </>
        )}
      </Pressable>

      {/* Info Message */}
      <Text
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        📡 Make sure GPS is enabled for accurate location
      </Text>
    </View>
  );
}
```

---

### Step 2: Update AttendanceBottomSheet to Pass sessionId

**In `components/AttendanceBottomSheet.tsx`**, update the Step 1 component call:

```typescript
<AttendanceStepGeolocation
  onVerified={() => setCurrentStep(2)}
  colors={colors}
  sessionId={session?.id}  // Pass session ID for room lookup
/>
```

---

### Step 3: Fetch Room Coordinates from Database

**In `lib/dashboard-service.ts`, add:**

```typescript
/**
 * Get room geolocation coordinates by session ID
 */
export const getRoomGeometry = async (
  sessionId: string,
  universityId: string
): Promise<RoomGeometry | null> => {
  try {
    const { data, error } = await supabase
      .from('session_locations')  // New table
      .select('latitude, longitude, room_radius')
      .eq('session_id', sessionId)
      .eq('university_id', universityId)
      .single();

    if (error || !data) {
      console.error('Error fetching room geometry:', error);
      return null;
    }

    return {
      type: 'Point',
      coordinates: [data.longitude, data.latitude],
      radius: data.room_radius || 100,
    };
  } catch (error) {
    console.error('Error in getRoomGeometry:', error);
    return null;
  }
};
```

---

### Step 4: Update Environment Variables

**In `.env` file, add:**

```env
# Geolocation Configuration
EXPO_PUBLIC_GEOFENCE_ENABLED=true
EXPO_PUBLIC_GEOFENCE_RADIUS_METERS=100
EXPO_PUBLIC_GPS_SAMPLE_COUNT=5
EXPO_PUBLIC_GPS_SAMPLE_INTERVAL_MS=1000
EXPO_PUBLIC_MIN_ACCURACY_METERS=15
EXPO_PUBLIC_CONFIDENCE_THRESHOLD=medium
```

---

## Testing Workflow

### Before Real Integration: Test the Test Screen

1. **Navigate to Test Screen**
   - Home → "Geo Test" quick action

2. **Verify Basic Functionality**
   - Permission request works
   - Can get current location
   - Can run 5-second check
   - Results display correctly

3. **Observe Console Logs**
   ```
   [AttendanceStepGeolocation] Starting location verification...
   [AttendanceStepGeolocation] Collecting sample 1/5...
   [AttendanceStepGeolocation] Sample 1: Lat 19.187316, Lon 72.923100, Accuracy 3.2m
   ...
   [AttendanceStepGeolocation] Smoothed location: ...
   [AttendanceStepGeolocation] Verification result: Inside=true...
   [AttendanceStepGeolocation] ✅ VERIFIED: Student is inside room
   ```

### Integration Testing: Test in Attendance Modal

1. **Navigate to Mark Attendance Screen**
   - Quick action "Mark Attendance" button

2. **Open Bottom Sheet**
   - Click "Mark Attendance" button on screen

3. **Step 1 Testing**
   - Click "Verify My Location"
   - Watch 5-second timer
   - See results and error messages

4. **Full Flow Testing**
   - Complete all 3 steps
   - Click Submit
   - Verify API call in backend

---

## Database Schema Addition

**Migration: Add room geolocation table**

```sql
CREATE TABLE session_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES universities(id),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  
  -- Geolocation coordinates (WGS84 - GPS standard)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  room_radius_meters INT DEFAULT 100,
  
  -- Altitude verification
  expected_altitude_meters INT,
  altitude_tolerance_meters INT DEFAULT 5,
  
  -- Barometer reading reference
  reference_pressure_hpa DECIMAL(7, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(session_id),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
);

-- Index for fast lookups
CREATE INDEX idx_session_locations_session_id ON session_locations(session_id);
CREATE INDEX idx_session_locations_university_id ON session_locations(university_id);
```

---

## Console Output Examples

### ✅ Successful Verification
```
[AttendanceStepGeolocation] Starting location verification...
[AttendanceStepGeolocation] Collecting sample 1/5...
[AttendanceStepGeolocation] Sample 1: Lat 19.187316, Lon 72.923100, Accuracy 3.2m
[AttendanceStepGeolocation] Sample 2: Lat 19.187318, Lon 72.923102, Accuracy 3.1m
[AttendanceStepGeolocation] Sample 3: Lat 19.187317, Lon 72.923101, Accuracy 3.0m
[AttendanceStepGeolocation] Sample 4: Lat 19.187315, Lon 72.923103, Accuracy 3.4m
[AttendanceStepGeolocation] Sample 5: Lat 19.187314, Lon 72.923104, Accuracy 3.2m
[AttendanceStepGeolocation] Smoothed location: Lat 19.187314, Lon 72.923104, Accuracy 3.2m
[AttendanceStepGeolocation] Verification result: Inside=true, Distance=12.5m, Confidence=high
[AttendanceStepGeolocation] ✅ VERIFIED: Student is inside room
```

### ❌ Failed Verification
```
[AttendanceStepGeolocation] Starting location verification...
[AttendanceStepGeolocation] Collecting sample 1/5...
[AttendanceStepGeolocation] Sample 1: Lat 19.186200, Lon 72.924000, Accuracy 24.5m
[AttendanceStepGeolocation] Sample 2: Lat 19.186250, Lon 72.924050, Accuracy 23.8m
[AttendanceStepGeolocation] Sample 3: Lat 19.186300, Lon 72.924100, Accuracy 24.2m
[AttendanceStepGeolocation] Sample 4: Lat 19.186350, Lon 72.924150, Accuracy 23.9m
[AttendanceStepGeolocation] Sample 5: Lat 19.186400, Lon 72.924200, Accuracy 24.1m
[AttendanceStepGeolocation] Smoothed location: Lat 19.186400, Lon 72.924200, Accuracy 24.1m
[AttendanceStepGeolocation] Verification result: Inside=false, Distance=1245.6m, Confidence=medium
[AttendanceStepGeolocation] ❌ FAILED: Student is outside room. Distance: 1245.6m, Confidence: medium
```

---

## Debugging Checklist

- [ ] Permission dialog appears when clicking "Verify Location"
- [ ] 5 samples collected in 5 seconds
- [ ] Accuracy < 15m (device has GPS signal)
- [ ] Distance to room calculated correctly
- [ ] Confidence indicator matches accuracy
- [ ] Error messages clear and actionable
- [ ] Console logs helpful for debugging
- [ ] Step advances after verification
- [ ] Step remains if verification fails

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Permission Denied" | Grant location in device settings |
| "Could not get location" | Enable GPS, move to open area |
| "Too far from classroom" | Verify room coordinates are correct |
| "Accuracy > 15m (Low)" | Move away from tall buildings |
| "Not progressing to Step 2" | Check console logs, verify distance |

---

## Performance Metrics (Expected)

| Metric | Value |
|--------|-------|
| Permission request | < 1 second |
| Single location fetch | 1-3 seconds |
| 5-sample collection | ~5 seconds |
| Distance calculation | < 10ms |
| Total Step 1 time | 6-8 seconds |
| Memory usage | ~2-3 MB |
| Battery impact | ~0.01% per marking |

---

## Next Phase

Once Step 1 (Geolocation) is integrated and working:

1. **Step 2:** Integrate barometer sensor for altitude verification
2. **Step 3:** Integrate TOTP validation with teacher code
3. **API Integration:** Send verification data to backend
4. **Analytics:** Track location accuracy trends

---

**Last Updated:** February 26, 2026


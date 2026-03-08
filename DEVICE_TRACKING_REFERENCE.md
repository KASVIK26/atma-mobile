# Device Tracking Technical Reference

## Quick Overview

The system tracks which device a student uses for attendance marking, enabling:
- Proxy detection (same student using different devices)
- Device validation (flag suspicious new devices)
- Multi-device scenarios (students with iPad + Phone)
- Historical audit trail (view device changes over time)

---

## Mobile Sessions Table

**Location**: Supabase database  
**Purpose**: Device registration and tracking

```sql
CREATE TABLE mobile_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES universities(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  device_id VARCHAR(255) NOT NULL,        -- Unique identifier per phone
  device_name VARCHAR(255),               -- User-friendly name
  device_model VARCHAR(255),              -- Technical model name
  device_os VARCHAR(50),                  -- iOS, Android, Web
  app_version VARCHAR(50),                -- 1.0.0 format
  
  is_active BOOLEAN DEFAULT true,         -- Soft delete
  last_active_at TIMESTAMP DEFAULT now(), -- Last checkin time
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, device_id)              -- One entry per device per user
);

CREATE INDEX idx_mobile_sessions_user_id ON mobile_sessions(user_id);
CREATE INDEX idx_mobile_sessions_device ON mobile_sessions(device_id);
CREATE INDEX idx_mobile_sessions_active ON mobile_sessions(is_active);
```

---

## Device ID Generation

**Goal**: Create unique, reproducible identifier for each physical device

```typescript
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDeviceInfo = async () => {
  try {
    // Combine multiple device properties for uniqueness
    const deviceId = `${Device.brand || 'Unknown'}-${Device.modelId || Device.modelName || 'Unknown'}-${Date.now()}`;
    const deviceModel = Device.modelName || 'Unknown';
    const deviceOS = Device.osName || Platform.OS;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    return {
      device_id: deviceId,              // "Apple-iPhone14,2-1708614223000"
      device_name: `${Device.brand} ${deviceModel}`,  // "Apple iPhone 14"
      device_model: deviceModel,        // "iPhone 14"
      device_os: deviceOS,              // "iOS"
      app_version: appVersion,          // "1.0.0"
    };
  } catch (err) {
    // Fallback for errors
    return {
      device_id: `unknown-${Platform.OS}-${Date.now()}`,
      device_model: 'Unknown',
      device_os: Platform.OS,
      device_name: 'Unknown Device',
      app_version: '1.0.0',
    };
  }
};
```

### Device ID Components

| Component | Source | Purpose |
|-----------|--------|---------|
| `Device.brand` | OS-level | Manufacturer (Apple, Samsung) |
| `Device.modelId` | OS-level | Technical model (iPhone14,2) |
| `Date.now()` | JavaScript | Timestamp for reproducibility |

**Example Values**:
- iPhone: `Apple-iPhone14,2-1708614223000`
- Android: `Samsung-SM_G991B-1708614223000`
- Web/Fallback: `unknown-web-1708614223000`

---

## Registration on Signup

When student completes signup, device is automatically registered:

```typescript
// In StudentSignUpScreen.tsx - completeSignup()

// 1. Get device info
const deviceInfo = await getDeviceInfo();

// 2. Get auth session
const session = await supabase.auth.getSession();

// 3. Register device in mobile_sessions
if (session?.data?.session?.user) {
  const { error } = await supabase.from('mobile_sessions').insert({
    university_id: selectedUniversity.id,
    user_id: session.data.session.user.id,
    device_id: deviceInfo.device_id,
    device_name: deviceInfo.device_name,
    device_model: deviceInfo.device_model,
    device_os: deviceInfo.device_os,
    app_version: deviceInfo.app_version,
    is_active: true,  // Start as active
  });
  
  if (error) console.error('Device registration failed:', error);
}
```

---

## Device Queries

### Get Student's Registered Devices

```typescript
const { data: devices, error } = await supabase
  .from('mobile_sessions')
  .select('*')
  .eq('user_id', studentId)
  .eq('is_active', true)
  .order('last_active_at', { ascending: false });

// Example result:
// [
//   {
//     id: 'uuid1',
//     user_id: 'student1',
//     device_id: 'Apple-iPhone14,2-1708614223000',
//     device_name: 'Apple iPhone 14',
//     device_model: 'iPhone 14',
//     device_os: 'iOS',
//     app_version: '1.0.0',
//     is_active: true,
//     last_active_at: '2026-02-23T10:30:00Z'
//   },
//   { ... other devices ... }
// ]
```

### Check if Device is Known

```typescript
const { data: deviceSession, error } = await supabase
  .from('mobile_sessions')
  .select('*')
  .eq('user_id', studentId)
  .eq('device_id', currentDeviceId)
  .single();

if (!deviceSession) {
  // NEW DEVICE - requires additional verification
  // Could trigger:
  // - Multi-factor authentication
  // - PIN verification
  // - Guardian notification
}
```

### Update Last Active Time

```typescript
const { error } = await supabase
  .from('mobile_sessions')
  .update({
    last_active_at: new Date().toISOString(),
  })
  .eq('id', deviceSessionId);
```

### Deactivate Lost Device

```typescript
// Soft delete - don't actually remove, just mark inactive
const { error } = await supabase
  .from('mobile_sessions')
  .update({ is_active: false })
  .eq('id', deviceSessionId);

// Student would need to re-verify if they use that device again
```

---

## Attendance Marking Flow

### Step 1: Get Current Device Info
```typescript
const currentDevice = await getDeviceInfo();
```

### Step 2: Check Device Status
```typescript
const { data: deviceSession } = await supabase
  .from('mobile_sessions')
  .select('*')
  .eq('user_id', currentUserId)
  .eq('device_id', currentDevice.device_id)
  .single();
```

### Step 3: Route Based on Device Status
```typescript
if (!deviceSession) {
  // NEW/UNKNOWN DEVICE
  // - Store attempt with device info
  // - Require strong multi-factor: geofence + barometer + TOTP
  // - Flag for review if unusual pattern
  return REQUIRE_STRICT_VALIDATION;
} else if (deviceSession.is_active) {
  // KNOWN DEVICE - normal flow
  // - Still validate geofence + barometer
  // - TOTP optional (based on teacher setting)
  // - Update last_active_at
  return NORMAL_VALIDATION;
} else {
  // DEACTIVATED DEVICE
  // - Reject attendance
  // - Show message: "Please use registered device"
  return REJECT_ATTENDANCE;
}
```

---

## Data Types & TypeScript

```typescript
// Device info structure (what's captured)
interface DeviceInfo {
  device_id: string;      // "Apple-iPhone14,2-1708614223000"
  device_name: string;    // "Apple iPhone 14"
  device_model: string;   // "iPhone 14"
  device_os: string;      // "iOS" | "Android" | "Web"
  app_version: string;    // "1.0.0"
}

// Mobile session record (database row)
interface MobileSession {
  id: string;
  university_id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_model: string;
  device_os: string;
  app_version: string;
  is_active: boolean;
  last_active_at: string;  // ISO timestamp
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

---

## Security Considerations

### Device ID Immutability
```
⚠️ Device ID includes Device.modelId which is hardware-specific
   Cannot be changed without:
   - Rooting/jailbreaking device
   - Factory reset + new signup

✅ Timestamp ensures uniqueness if modelId changes
```

### Spoofing Prevention
```
❌ Device.modelId alone is spoofable
✅ Combined with brand + modelName increases difficulty
✅ Last active timestamp tracking shows usage patterns
✅ Attendance validation includes 3-point check (GPS + pressure + TOTP)
```

### Privacy Compliance
```
📋 Device ID is not a "unique identifier" under GDPR
   (Device can be reset or changed)
✅ No PII stored in device tracking
✅ Data deleted when student account deleted (CASCADE)
✅ Soft delete allows audit trail (is_active = false)
```

---

## Monitoring & Analytics

### Device Distribution by Model
```sql
SELECT device_model, COUNT(*) as student_count
FROM mobile_sessions
WHERE is_active = true
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY device_model
ORDER BY student_count DESC;

-- Result: How many students using iPhone 14 vs Pixel 6, etc.
```

### New Devices Per Day
```sql
SELECT 
  DATE(created_at) as signup_date,
  device_os,
  COUNT(*) as new_devices
FROM mobile_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), device_os
ORDER BY signup_date DESC;
```

### Multi-Device Students
```sql
SELECT 
  user_id,
  COUNT(DISTINCT device_id) as device_count,
  array_agg(device_name) as device_names
FROM mobile_sessions
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(DISTINCT device_id) > 1
ORDER BY device_count DESC;

-- Result: Students using multiple devices (tablet + phone)
```

---

## Packages Used

```json
{
  "expo-device": "^5.0.0",      // Device hardware info (brand, model, OS)
  "react-native": "^0.73.0",    // Platform detection
  "expo-constants": "^15.0.0"   // App version from app.json
}
```

### Package Methods

```typescript
// expo-device
Device.brand              // "Apple", "Samsung", null
Device.modelId            // "iPhone14,2", "SM_G991B", null
Device.modelName          // "iPhone 14", "Galaxy S21", "Unknown"
Device.osName             // "iOS", "Android", null

// react-native
Platform.OS               // "ios", "android", "web"
Platform.Version          // OS version number

// expo-constants
Constants.expoConfig?.version  // From app.json version field
```

---

## Common Issues & Solutions

### Issue: Device.modelId is null
```typescript
// Solution: Fallback chain
const modelId = Device.modelId || Device.modelName || 'unknown';
```

### Issue: Two apps on same device get different IDs
```
Expected behavior - each app is separate login/enrollment
Solution: Device ID uniqueness is per app per device
(This is by design for security)
```

### Issue: Factory reset changes Device.modelId
```
Expected - device.modelId is persistent across resets
But timestamp ensures uniqueness if somehow changes
Monitor: Check last_active_at for unexpected gaps
```

### Issue: Emulator/Simulator has generic device ID
```typescript
// Not a real problem - emulators can't mark real attendance
// But handle gracefully:
if (!Device.modelId) {
  return EMULATOR_MODE;
}
```

---

## Future Enhancements

### Phase 2: Device Trust Levels
```sql
ALTER TABLE mobile_sessions ADD COLUMN trust_level VARCHAR(50);
-- Values: 'trusted' (verified), 'suspicious' (new), 'blocked' (lost/stolen)
```

### Phase 3: Device Verification via SMS/Email
```typescript
// On new device signup:
// 1. Show "New device detected"
// 2. Send verification code to email
// 3. Require code entry before first attendance
```

### Phase 4: Biometric Authentication
```typescript
// On attendance:
// - Fingerprint/FaceID required for unknown devices
// - Optional for known devices
```

### Phase 5: Device History Timeline
```typescript
// In profile settings:
// - View all registered devices
// - See signup dates
// - See last active times
// - Option to "revoke" lost devices
```

---

## Testing Device Tracking

### Manual Test Cases

```typescript
// Test 1: Setup
[ ] Signup on iPhone
[ ] Verify device_id created
[ ] Check device_name shows "Apple iPhone XY"
[ ] device_os should be "iOS"

// Test 2: Multi-device
[ ] Logout on iPhone
[ ] Signup again on Android
[ ] Query mobile_sessions - should have 2 records
[ ] Same user_id, different device_id

// Test 3: Attendance
[ ] Mark attendance on iPhone
[ ] Mark attendance on Android
[ ] Both should show in attendance_records
[ ] Different device_ids in sensor_data

// Test 4: Deactivation  
[ ] Deactivate iPhone (set is_active = false)
[ ] Try marking attendance on iPhone
[ ] Should require re-verification
```

---

**Last Updated**: 2026-02-23  
**Version**: 1.0  
**Status**: Production Ready

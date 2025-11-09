# 📱 ATMA Guardian - Mobile App Development Context
## Comprehensive Guide for React Native Development

**Date:** November 9, 2025  
**Status:** Ready for Development  
**Target Platform:** React Native (iOS & Android)  
**UI Framework:** Stitch (as designed)  
**Backend:** Supabase (PostgreSQL + Edge Functions)  

---

## 🎯 Project Overview

### What is ATMA Guardian Mobile?
A comprehensive mobile attendance management system that verifies student/teacher presence through **3-point validation**:
1. **Geolocation Check** - GPS coordinates verify student is within classroom radius
2. **Barometric Pressure Check** - Air pressure verifies student is on correct floor
3. **TOTP Code Check** - Time-based One-Time Password authenticates via teacher-shared code

### Who Uses It?
- **Students**: Mark attendance with 3-step verification
- **Teachers**: Share TOTP codes and view real-time attendance counts
- **Admins**: Manage sessions, geofences, and altitudes (via web dashboard)

### Current Status
✅ Web Admin Interface (React/Vite) - COMPLETE  
✅ Database Schema - COMPLETE  
✅ TOTP Generation System - COMPLETE  
🆕 Mobile App - **YOU ARE HERE**  

---

## 🏗️ System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────┐
│         PRESENTATION LAYER (React Native)           │
│  ┌─────────────────────────────────────────────┐   │
│  │ Student Screens    │ Teacher Screens        │   │
│  │ • Login            │ • Login                │   │
│  │ • Dashboard        │ • Dashboard            │   │
│  │ • Live Sessions    │ • Live Sessions        │   │
│  │ • 3 Checks         │ • Share TOTP           │   │
│  │ • Success/Fail     │ • Attendance Counter   │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + Realtime
┌──────────────────────▼──────────────────────────────┐
│      BUSINESS LOGIC LAYER (Edge Functions)          │
│  ┌─────────────────────────────────────────────┐   │
│  │ • auth-register-student                     │   │
│  │ • auth-register-teacher                     │   │
│  │ • check-geolocation                         │   │
│  │ • check-barometric-pressure                 │   │
│  │ • verify-attendance-3checks                 │   │
│  │ • get-live-sessions                         │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ PostgreSQL + Realtime
┌──────────────────────▼──────────────────────────────┐
│         DATA LAYER (Supabase PostgreSQL)            │
│  ┌─────────────────────────────────────────────┐   │
│  │ • lecture_sessions                          │   │
│  │ • lecture_room_geofence                     │   │
│  │ • lecture_room_altitude                     │   │
│  │ • totp_attendance_log                       │   │
│  │ • student_location_checks                   │   │
│  │ • student_pressure_checks                   │   │
│  │ • students (enrollment info)                │   │
│  │ • instructors (teacher info)                │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema (for Mobile Context)

### Core Tables You'll Interact With

#### 1. `lecture_sessions`
```typescript
{
  id: UUID;
  course_id: UUID;
  instructor_id: UUID;
  room_id: UUID;
  start_time: DateTime;
  end_time: DateTime;
  status: 'scheduled' | 'ongoing' | 'completed';
  current_totp_code?: string;           // Generated by teacher
  current_totp_expires_at?: DateTime;   // 30-second window
  attendance_count: number;              // Real-time updated
  total_enrolled: number;
}
```

#### 2. `lecture_room_geofence`
```typescript
{
  id: UUID;
  room_id: UUID;
  latitude: Decimal;      // e.g., 28.5358
  longitude: Decimal;     // e.g., 77.3912
  radius_meters: Integer; // e.g., 100
  altitude_meters?: Integer;
  created_at: DateTime;
  updated_at: DateTime;
}
```

#### 3. `lecture_room_altitude`
```typescript
{
  id: UUID;
  room_id: UUID;
  floor_number: Integer;          // e.g., 2
  expected_pressure: Decimal;     // e.g., 1013.20 (hPa)
  pressure_tolerance: Decimal;    // e.g., 5.0 (±hPa)
  created_at: DateTime;
  updated_at: DateTime;
}
```

#### 4. `totp_attendance_log`
```typescript
{
  id: UUID;
  session_id: UUID;
  student_id: UUID;
  totp_code_submitted: string;
  location_verified: boolean;           // From Check 1
  location_distance_meters?: Decimal;
  pressure_verified: boolean;           // From Check 2
  pressure_reading?: Decimal;
  totp_verified: boolean;               // From Check 3
  attendance_status: 'present' | 'absent';
  recorded_at: DateTime;
}
```

#### 5. `student_location_checks`
```typescript
{
  id: UUID;
  session_id: UUID;
  student_id: UUID;
  device_latitude: Decimal;
  device_longitude: Decimal;
  distance_meters: Decimal;
  within_radius: boolean;
  check_timestamp: DateTime;
}
```

#### 6. `student_pressure_checks`
```typescript
{
  id: UUID;
  session_id: UUID;
  student_id: UUID;
  device_pressure: Decimal;
  floor_detected: Integer;
  within_tolerance: boolean;
  check_timestamp: DateTime;
}
```

#### 7. `students` (from auth.users - profile data)
```typescript
{
  id: UUID;                    // From auth.users
  enrollment_id: string;       // Unique student ID
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: DateTime;
  enrolled_courses: UUID[];    // Array of course IDs
  created_at: DateTime;
}
```

#### 8. `instructors` (from auth.users - profile data)
```typescript
{
  id: UUID;                    // From auth.users
  instructor_code: string;     // Unique teacher ID
  full_name: string;
  email: string;
  phone?: string;
  teaching_courses: UUID[];    // Array of course IDs
  created_at: DateTime;
}
```

---

## 🔐 Authentication Flow

### Student Registration/Login

```
┌─────────────────────────────────────────────────┐
│ STUDENT LOGIN SCREEN (Stitch UI)                │
│ • Input: Enrollment ID (e.g., "E001234")        │
│ • Input: Password (hashed, min 8 chars)         │
│ • Button: "Login" or "Register"                 │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │ Validation           │
         │ • Length check       │
         │ • Format check       │
         └───────────┬───────────┘
                     │
         ┌───────────▼─────────────────────────┐
         │ POST /functions/v1/auth-register-   │
         │ student                             │
         │ Body:                               │
         │ {                                   │
         │   "enrollment_id": "E001234",       │
         │   "password": "SecurePass123"       │
         │ }                                   │
         └───────────┬─────────────────────────┘
                     │
         ┌───────────▼─────────────────────────┐
         │ Edge Function:                      │
         │ 1. Check if enrollment_id exists   │
         │ 2. Verify password hash             │
         │ 3. Generate JWT token               │
         │ 4. Return { jwt, user_id, role }   │
         └───────────┬─────────────────────────┘
                     │
         ┌───────────▼─────────────────────────┐
         │ Mobile App:                         │
         │ 1. Store JWT in SecureStorage       │
         │ 2. Store user_id                    │
         │ 3. Store role (student/teacher)     │
         │ 4. Navigate to Dashboard            │
         └─────────────────────────────────────┘
```

### Teacher Registration/Login
Same flow, but with:
- Input: Instructor Code (e.g., "I000123")
- Endpoint: `/functions/v1/auth-register-teacher`
- Response role: "teacher"

---

## 🎯 User Flows

### FLOW 1: Student Marks Attendance

```
STEP 1: STUDENT DASHBOARD
├─ Authentication Check
│  └─ JWT token stored?
├─ Fetch Live Sessions
│  └─ GET /functions/v1/get-live-sessions?student_id={id}
│  └─ Returns: Active sessions + enrollment status
├─ Display Sessions List
│  └─ Show: Course Name, Room, Instructor, Time
└─ Student clicks: "Mark Attendance"

STEP 2: CHECK 1 - GEOLOCATION
├─ Request GPS Permission
│  └─ Android: android.permission.ACCESS_FINE_LOCATION
│  └─ iOS: NSLocationWhenInUseUsageDescription
├─ Get Device GPS Coordinates
│  └─ Access react-native-geolocation-service
│  └─ Coordinates: { latitude, longitude, accuracy }
├─ Calculate Distance
│  └─ Haversine formula: distance = haversine(device, room)
├─ POST /functions/v1/check-geolocation
│  └─ Body: { session_id, student_id, latitude, longitude }
│  └─ Response: { distance, within_radius, status }
├─ Display Result
│  └─ ✓ "15m from room (within 100m)" → PROCEED
│  └─ ✗ "250m away - TOO FAR" → REJECT, show error
└─ Save to local cache for offline access

STEP 3: CHECK 2 - BAROMETRIC PRESSURE
├─ Request Barometer Permission
│  └─ Android: android.permission.BODY_SENSORS
│  └─ iOS: Motion & Fitness permissions
├─ Get Device Barometer Reading
│  └─ Access react-native-sensors
│  └─ Reading: pressure in hPa (hectopascals)
├─ POST /functions/v1/check-barometric-pressure
│  └─ Body: { session_id, student_id, pressure }
│  └─ Response: { floor, within_tolerance, status }
├─ Display Result
│  └─ ✓ "Floor 2 (1013.2 hPa) - VERIFIED" → PROCEED
│  └─ ✗ "Floor mismatch - WRONG ROOM" → REJECT
└─ Save to local cache

STEP 4: CHECK 3 - TOTP CODE
├─ Subscribe to TOTP Stream
│  └─ Supabase Realtime Channel: "session-{id}-totp"
│  └─ Live receive teacher's TOTP code
├─ Display Options
│  ├─ Show received TOTP: "Code received: 123456"
│  └─ Manual input field: "Enter code manually"
├─ Student enters code or auto-fills from stream
├─ POST /functions/v1/verify-attendance-3checks
│  └─ Body:
│     {
│       "session_id": "uuid",
│       "student_id": "uuid",
│       "location_verified": true,
│       "location_distance": 15.5,
│       "pressure_verified": true,
│       "pressure_reading": 1013.2,
│       "totp_code": "123456"
│     }
│  └─ Response: { success, attendance_id, message }
├─ Display Result
│  ├─ ✓ "Attendance Marked Successfully! ✓"
│  │  └─ Show: Timestamp, Session info, Status
│  └─ ✗ "Invalid code" or other error
└─ Update Dashboard count

STEP 5: CONFIRMATION
├─ Show success animation
├─ Display:
│  ├─ Session details
│  ├─ Timestamp marked
│  ├─ All 3 checks status
│  └─ Option to "View More Sessions" or "Home"
└─ Auto-navigate after 3 seconds
```

### FLOW 2: Teacher Shares TOTP Code

```
STEP 1: TEACHER DASHBOARD
├─ Authentication Check
├─ Fetch Live Sessions
│  └─ GET /functions/v1/get-teacher-live-sessions?teacher_id={id}
│  └─ Returns: Sessions where user is instructor
├─ Display Sessions List
└─ Teacher clicks: "Share TOTP"

STEP 2: GENERATE TOTP CODE
├─ POST /functions/v1/generate-totp-code
│  └─ Body: { session_id, instructor_id }
│  └─ Response: { code, expiresAt, refreshAt }
├─ Receive response
│  └─ code: "123456" (6-digit)
│  └─ expiresAt: DateTime (30 seconds from now)
│  └─ refreshAt: DateTime (when to auto-refresh)
└─ Display: "TOTP Code: 123456" (large, visible)

STEP 3: BROADCAST TOTP
├─ Supabase Realtime Channel Publish
│  └─ Channel: "session-{session_id}-totp"
│  └─ Event: "totp_shared"
│  └─ Payload: { code, expiresAt, refreshAt }
├─ All enrolled students receive in real-time
└─ Auto-refresh code after 30 seconds
   └─ Show countdown timer

STEP 4: LIVE ATTENDANCE COUNTER
├─ Subscribe to Attendance Updates
│  └─ Channel: "session-{session_id}-attendance"
│  └─ Listen for: "attendance_recorded" events
├─ Display Counter
│  ├─ "45 / 60 students marked attendance"
│  ├─ Update in real-time (+1 for each student)
│  └─ Show percentage: "75% (45/60)"
├─ List Recent Attendees
│  ├─ Show last 10 students who marked
│  ├─ Display: Name, Timestamp, All Checks Status
│  └─ Scroll for more
└─ End Session Button
   └─ Close attendance marking (lock TOTP)
```

---

## 🛠️ Technology Stack & Best Practices

### React Native Setup
```json
{
  "framework": "React Native (Expo or Bare)",
  "language": "TypeScript",
  "state_management": "Context API + Custom Hooks",
  "navigation": "React Navigation",
  "ui_framework": "Stitch (custom) or NativeBase",
  "http_client": "@react-native-camera-roll/camera-roll",
  "realtime": "Supabase Realtime Client",
  "storage": "AsyncStorage (encrypted with react-native-keychain)",
  "location": "react-native-geolocation-service",
  "sensors": "react-native-sensors (barometer)",
  "forms": "React Hook Form + Zod validation",
  "testing": "Jest + React Native Testing Library"
}
```

### Secure Storage Strategy
```typescript
// Critical Data (NEVER store in AsyncStorage)
- JWT tokens → Keychain (iOS) / Keystore (Android)
- User password → Never stored locally
- Session data → Encrypted AsyncStorage only

// Safe to Store (AsyncStorage)
- User preferences
- Cached session list
- Offline attendance attempts
- UI state
```

### API Request Pattern
```typescript
// All requests include:
1. Authorization Header: "Bearer {jwt_token}"
2. Error Handling: Automatic token refresh on 401
3. Offline Support: Queue requests when offline
4. Retry Logic: Exponential backoff on network errors
5. Timeout: 30 second default timeout

// Example:
const response = await supabase
  .functions
  .invoke('check-geolocation', {
    body: { session_id, student_id, latitude, longitude },
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
```

### Realtime Subscriptions Pattern
```typescript
// Subscribe to TOTP codes
supabase
  .channel(`session-${sessionId}-totp`)
  .on('broadcast', { event: 'totp_shared' }, payload => {
    // Update UI with new code
    setTOTPCode(payload.code);
    startCountdown(payload.expiresAt);
  })
  .subscribe();

// Subscribe to attendance count
supabase
  .channel(`session-${sessionId}-attendance`)
  .on('broadcast', { event: 'attendance_recorded' }, payload => {
    // Increment counter
    setAttendanceCount(prev => prev + 1);
  })
  .subscribe();
```

---

## 📁 Project Structure (Recommended)

```
atma-guardian-mobile/
├── app.json                              # Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env.example
│
├── src/
│   ├── App.tsx                           # Root navigator
│   ├── Navigation.tsx                    # Navigation setup
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx               # Auth state management
│   │   ├── useAuth.ts                    # Auth custom hook
│   │   ├── types.ts                      # Auth types
│   │   ├── StudentLoginScreen.tsx
│   │   ├── TeacherLoginScreen.tsx
│   │   ├── LoginSelector.tsx             # Choose student/teacher
│   │   └── SplashScreen.tsx
│   │
│   ├── screens/
│   │   ├── student/
│   │   │   ├── StudentDashboard.tsx      # Main dashboard
│   │   │   ├── LiveSessionsList.tsx      # Scrollable list
│   │   │   ├── SessionDetail.tsx         # Session overview
│   │   │   ├── AttendanceFlow.tsx        # Main flow coordinator
│   │   │   ├── checks/
│   │   │   │   ├── LocationCheck.tsx     # Check 1: GPS
│   │   │   │   ├── PressureCheck.tsx     # Check 2: Barometer
│   │   │   │   ├── TOTPCheck.tsx         # Check 3: Code entry
│   │   │   │   ├── LoadingScreen.tsx     # Loading states
│   │   │   │   ├── SuccessScreen.tsx     # Success confirmation
│   │   │   │   └── ErrorScreen.tsx       # Error handling
│   │   │   └── ProfileScreen.tsx         # Student profile
│   │   │
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.tsx      # Main dashboard
│   │   │   ├── LiveSessionsList.tsx
│   │   │   ├── SessionDetail.tsx         # Session management
│   │   │   ├── TOTPDisplay.tsx           # Large TOTP display
│   │   │   ├── AttendanceCounter.tsx     # Live counter
│   │   │   ├── AttendeesList.tsx         # Recent attendees
│   │   │   └── ProfileScreen.tsx
│   │   │
│   │   └── shared/
│   │       ├── ProfileScreen.tsx
│   │       └── SettingsScreen.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                    # Auth state
│   │   ├── useGeolocation.ts             # GPS location
│   │   ├── useBarometer.ts               # Pressure sensor
│   │   ├── useLiveSessions.ts            # Fetch sessions
│   │   ├── useRealtimeSubscription.ts    # Realtime channels
│   │   ├── useTOTPStream.ts              # TOTP broadcast
│   │   ├── useAttendanceFlow.ts          # Attendance steps
│   │   └── useOfflineStorage.ts          # Offline queue
│   │
│   ├── services/
│   │   ├── authService.ts                # Auth API calls
│   │   ├── sessionService.ts             # Session APIs
│   │   ├── attendanceService.ts          # Attendance APIs
│   │   ├── geolocationService.ts         # GPS calculations
│   │   ├── barometerService.ts           # Pressure logic
│   │   ├── storageService.ts             # Secure storage
│   │   └── supabaseClient.ts             # Supabase init
│   │
│   ├── types/
│   │   ├── auth.ts                       # Auth types
│   │   ├── session.ts                    # Session types
│   │   ├── location.ts                   # Location types
│   │   ├── pressure.ts                   # Pressure types
│   │   ├── attendance.ts                 # Attendance types
│   │   └── api.ts                        # API response types
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorAlert.tsx
│   │   │
│   │   ├── attendance/
│   │   │   ├── CheckProgress.tsx         # Visual progress
│   │   │   ├── CheckStatus.tsx           # Status display
│   │   │   ├── TOTPInput.tsx             # Code input field
│   │   │   └── CheckAnimation.tsx        # Animations
│   │   │
│   │   └── realtime/
│   │       ├── TOTPCounter.tsx           # Countdown timer
│   │       ├── AttendanceCounter.tsx
│   │       └── LiveBadge.tsx
│   │
│   ├── constants/
│   │   ├── config.ts                     # App config
│   │   ├── colors.ts                     # Stitch colors
│   │   └── strings.ts                    # i18n strings
│   │
│   ├── utils/
│   │   ├── validation.ts                 # Form validation
│   │   ├── geolocation.ts                # Haversine formula
│   │   ├── error-handler.ts              # Error handling
│   │   ├── logger.ts                     # Logging
│   │   └── date-time.ts                  # Date utilities
│   │
│   └── styles/
│       ├── theme.ts                      # Stitch theme
│       └── globals.ts
│
└── __tests__/
    ├── auth/
    ├── services/
    ├── hooks/
    └── utils/
```

---

## 🔑 Key Implementation Details

### 1. Environment Variables (.env.local)

```env
# Supabase Config
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc...

# API Endpoints
REACT_APP_API_TIMEOUT=30000
REACT_APP_RETRY_ATTEMPTS=3

# Geolocation
REACT_APP_GEOFENCE_RADIUS_BUFFER=10  # 10% buffer for GPS accuracy

# Features
REACT_APP_ENABLE_OFFLINE_MODE=true
REACT_APP_ENABLE_DEBUG_LOGS=false
```

### 2. Haversine Distance Formula

```typescript
// Calculate distance between two GPS points
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}
```

### 3. Pressure Floor Detection

```typescript
// Determine floor from pressure reading
function detectFloor(
  devicePressure: number,
  roomAltitude: {
    floor: number;
    expectedPressure: number;
    tolerance: number;
  }
): { floor: number; withinTolerance: boolean } {
  const difference = Math.abs(devicePressure - roomAltitude.expectedPressure);
  const withinTolerance = difference <= roomAltitude.tolerance;
  
  return {
    floor: roomAltitude.floor,
    withinTolerance
  };
}
```

### 4. JWT Token Management

```typescript
// Store JWT securely
async function storeJWT(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

// Retrieve JWT
async function getJWT(): Promise<string | null> {
  return await SecureStore.getItemAsync('auth_token');
}

// Check token expiration
function isTokenExpired(token: string): boolean {
  const decoded = jwtDecode(token);
  const now = Date.now() / 1000;
  return decoded.exp < now;
}

// Auto-refresh on 401
supabaseClient.functions.invoke = async (name, options) => {
  let response = await originalInvoke(name, options);
  
  if (response.status === 401) {
    const newToken = await refreshToken();
    options.headers['Authorization'] = `Bearer ${newToken}`;
    response = await originalInvoke(name, options);
  }
  
  return response;
};
```

### 5. Offline Mode (Queue Failed Requests)

```typescript
interface OfflineAction {
  type: 'attendance' | 'location_check' | 'pressure_check';
  endpoint: string;
  payload: any;
  timestamp: number;
  retries: number;
}

// Queue action when offline
async function queueOfflineAction(action: OfflineAction): Promise<void> {
  const queue = await AsyncStorage.getItem('offline_queue');
  const actions = queue ? JSON.parse(queue) : [];
  actions.push(action);
  await AsyncStorage.setItem('offline_queue', JSON.stringify(actions));
}

// Retry all queued actions when online
async function retryOfflineActions(): Promise<void> {
  const queue = await AsyncStorage.getItem('offline_queue');
  if (!queue) return;
  
  const actions: OfflineAction[] = JSON.parse(queue);
  for (const action of actions) {
    try {
      await supabaseClient.functions.invoke(action.endpoint, {
        body: action.payload
      });
      // Remove from queue
      actions.splice(actions.indexOf(action), 1);
    } catch (error) {
      action.retries++;
      if (action.retries >= 5) {
        actions.splice(actions.indexOf(action), 1);
      }
    }
  }
  
  await AsyncStorage.setItem('offline_queue', JSON.stringify(actions));
}
```

---

## ✅ Development Checklist

### Phase 1: Setup & Auth (Week 1)
- [ ] Create React Native project (Expo)
- [ ] Setup TypeScript configuration
- [ ] Configure Supabase client
- [ ] Implement Secure Storage
- [ ] Build Auth Context + Hooks
- [ ] Create Login Selector Screen
- [ ] Create Student Login Screen
- [ ] Create Teacher Login Screen
- [ ] Implement JWT token management
- [ ] Add auto-login on app start

### Phase 2: Navigation & Screens (Week 1-2)
- [ ] Setup React Navigation
- [ ] Create Student Stack Navigator
- [ ] Create Teacher Stack Navigator
- [ ] Create Shared Stack Navigator
- [ ] Build Student Dashboard Screen
- [ ] Build Teacher Dashboard Screen
- [ ] Build Live Sessions List Screen
- [ ] Build Session Detail Screen
- [ ] Build Profile Screens
- [ ] Add bottom tab navigation

### Phase 3: Location Services (Week 2)
- [ ] Setup react-native-geolocation-service
- [ ] Request location permissions
- [ ] Get device GPS coordinates
- [ ] Implement Haversine formula
- [ ] Build Location Check Screen
- [ ] Integrate with API endpoint
- [ ] Add error handling
- [ ] Implement caching

### Phase 4: Pressure Sensor (Week 2-3)
- [ ] Setup react-native-sensors
- [ ] Request sensor permissions
- [ ] Read barometer data
- [ ] Implement floor detection
- [ ] Build Pressure Check Screen
- [ ] Integrate with API endpoint
- [ ] Add error handling
- [ ] Implement fallback logic

### Phase 5: TOTP Integration (Week 3)
- [ ] Setup Supabase Realtime
- [ ] Implement TOTP channel subscription
- [ ] Build TOTP Input Screen
- [ ] Auto-fill from broadcast
- [ ] Manual entry support
- [ ] Countdown timer
- [ ] Code validation
- [ ] Error handling

### Phase 6: Attendance Flow (Week 3-4)
- [ ] Create Attendance Flow Coordinator
- [ ] Sequence: Location → Pressure → TOTP
- [ ] Build Loading states
- [ ] Build Success screen
- [ ] Build Error screen
- [ ] Implement retry logic
- [ ] Add animations
- [ ] Test all edge cases

### Phase 7: Realtime Features (Week 4)
- [ ] Implement attendance counter (teacher)
- [ ] Live attendance list updates
- [ ] Real-time TOTP code broadcasting
- [ ] Auto-refresh logic
- [ ] Handle disconnections
- [ ] Add reconnection logic
- [ ] Status indicators

### Phase 8: Offline Support (Week 4-5)
- [ ] Implement offline action queue
- [ ] Store failed requests
- [ ] Detect network status
- [ ] Retry on connection restore
- [ ] Add sync status indicator
- [ ] Display offline mode
- [ ] Handle conflict resolution

### Phase 9: Testing & QA (Week 5)
- [ ] Unit tests (hooks, services)
- [ ] Integration tests (flows)
- [ ] E2E tests (full scenarios)
- [ ] Performance testing
- [ ] Security audit
- [ ] Accessibility testing
- [ ] Device compatibility testing

### Phase 10: Deployment (Week 5)
- [ ] Build iOS bundle
- [ ] Build Android bundle
- [ ] Submit to App Store
- [ ] Submit to Google Play
- [ ] Setup crash reporting
- [ ] Setup analytics
- [ ] Create release notes

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 18+
node --version

# npm or yarn
npm --version

# Expo CLI (if using Expo)
npm install -g expo-cli
```

### Initial Setup
```bash
# 1. Create React Native project
npx create-expo-app atma-guardian-mobile
cd atma-guardian-mobile

# 2. Install Supabase client
npm install @supabase/supabase-js

# 3. Install core dependencies
npm install react-native-geolocation-service
npm install react-native-sensors
npm install react-native-keychain
npm install react-navigation react-native-screens

# 4. Install TypeScript
npm install --save-dev typescript @types/react-native

# 5. Copy this documentation to project root
```

### Environment Setup
```bash
# Create .env.local file
cp .env.example .env.local

# Add your Supabase credentials
# REACT_APP_SUPABASE_URL=...
# REACT_APP_SUPABASE_ANON_KEY=...
```

### Start Development
```bash
# iOS
npm start -- --ios

# Android
npm start -- --android

# Web (for testing)
npm start -- --web
```

---

## 📚 Important Notes for Development

### Security Considerations
1. **Never commit secrets** - Use .env files with .gitignore
2. **Always use HTTPS** - Supabase enforces this
3. **Validate JWT tokens** - Check expiration on app start
4. **Secure storage** - Use Keychain/Keystore for sensitive data
5. **RLS policies** - Rely on database-level security, not app-level

### Performance Optimization
1. **Lazy load screens** - Use React.lazy for large screens
2. **Memoize components** - Prevent unnecessary re-renders
3. **Optimize images** - Compress and resize appropriately
4. **Batch API calls** - Combine requests when possible
5. **Cache strategically** - Store session list for 5 mins

### Error Handling Best Practices
1. **User-friendly messages** - "Too far from room" vs technical errors
2. **Retry logic** - Exponential backoff for network errors
3. **Fallback UI** - Show last known state if API fails
4. **Log all errors** - For debugging and monitoring
5. **Graceful degradation** - App should work even if some features fail

### Testing Strategy
1. **Unit tests** - Test individual functions
2. **Integration tests** - Test component interactions
3. **E2E tests** - Test complete user flows
4. **Manual testing** - Test on real devices
5. **Beta testing** - Get user feedback before release

---

## 🔗 Related Documentation

- **Admin Interface**: See `COMPLETE_ANALYSIS_SUMMARY.md`
- **Architecture Deep Dive**: See `DUAL_PLATFORM_SYSTEM_ANALYSIS.md`
- **API Specifications**: See `IMPLEMENTATION_ROADMAP.md`
- **Database Schema**: See `QUICK_START_IMPLEMENTATION.md`
- **TOTP System**: See `TOTP_ARCHITECTURE.md`

---

## 📞 Support & Questions

When building this mobile app:
1. Reference the database schema provided above
2. Follow the security practices outlined
3. Use the project structure as a guide (adjust for your UI framework)
4. Test all three checks thoroughly (location, pressure, TOTP)
5. Implement offline mode early to catch issues
6. Get real device testing ASAP (GPS/barometer won't work in simulators)

**Version:** 1.0 | **Last Updated:** November 9, 2025

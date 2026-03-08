# Mark Attendance Screen - UI Implementation Guide

## Overview
Created a comprehensive Mark Attendance screen with a 3-step verification process using a modal-based bottom sheet. The UI is fully functional and ready for integration with actual sensors and APIs.

## File Structure

### Main Screen
- **[screens/MarkAttendanceScreen.tsx](../screens/MarkAttendanceScreen.tsx)**
  - Main attendance marking screen
  - Automatically fetches the current ongoing class session
  - Displays session details (course code, name, time, location, instructor)
  - Shows "No Ongoing Classes" empty state when no active sessions
  - Handles bottom sheet visibility and data passing
  - Routes: `/(main)/mark-attendance`

### Bottom Sheet Component
- **[components/AttendanceBottomSheet.tsx](../components/AttendanceBottomSheet.tsx)**
  - Modal-based bottom sheet (can be easily converted to Gorhom Bottom Sheet)
  - Displays the 3-step verification process
  - Manages step progression and state
  - Shows session info at the top
  - Has cancel and submit buttons at the bottom
  - Handles final submission (placeholder for now)

### Step Components
Located in `[components/AttendanceSteps/](../components/AttendanceSteps/)`

1. **[AttendanceStepGeolocation.tsx](../components/AttendanceSteps/AttendanceStepGeolocation.tsx)**
   - Step 1: Location Verification
   - UI shows expected room location
   - Mock button to check location
   - Displays status and simulated results
   - TODO: Integrate with `expo-location` for GPS reading

2. **[AttendanceStepBarometer.tsx](../components/AttendanceSteps/AttendanceStepBarometer.tsx)**
   - Step 2: Altitude Verification using device barometer
   - Shows expected altitude vs measured altitude
   - Displays pressure readings
   - Calculates difference and shows verification status
   - TODO: Integrate with device barometer sensor API

3. **[AttendanceStepTOTP.tsx](../components/AttendanceSteps/AttendanceStepTOTP.tsx)**
   - Step 3: TOTP Code Entry
   - 6-character code input from instructor
   - Shows formatted code display on verification
   - Uses `react-native-otp-inputs` library (already installed)
   - Input validation and character counting

## How It Works

### User Flow
1. Student navigates to Mark Attendance screen
2. Screen auto-fetches today's classes using `getTodaysClassesWithStatus()`
3. If ongoing session exists:
   - Shows session card with details (course, time, location, instructor)
   - "Mark Attendance" button enables bottom sheet
4. Clicking "Mark Attendance" opens the bottom sheet modal
5. **Step 1 - Location**: Student clicks "Check Location" to verify GPS position
6. **Step 2 - Altitude**: Student clicks "Check Barometer" to verify altitude/floor
7. **Step 3 - TOTP**: Student enters 6-character code dictated by instructor
8. All steps completed → Submit button enabled
9. Click "Submit" to mark attendance (close sheet and record in attendance history)

### Data Flow
```
getTodaysClassesWithStatus()
    ↓
Filter for status === 'ongoing'
    ↓
Display session info
    ↓
User clicks "Mark Attendance"
    ↓
AttendanceBottomSheet opens
    ↓
3-step verification process
    ↓
markAttendance() [to be integrated]
    ↓
Close sheet & show in attendance history
```

## UI Features

### Visual Feedback
- ✅ Animated step indicators showing progress
- ✅ Status icons and colors for each step
- ✅ Completed step badges showing "Verified"
- ✅ Real-time character counting for TOTP input
- ✅ Loading states for async operations
- ✅ Disabled/enabled button states based on progress

### Session Information Display
- Course code (bold, uppercase)
- Course name
- Time range (start - end)
- Location (room + building)
- Instructor name(s)

### Step Details
- Each step shows a number indicator (1, 2, 3)
- Changes to checkmark when completed
- Status text updates based on verification result
- Detailed description of what each step does

## Integration TODOs

### Geolocation Integration
```typescript
// TODO in AttendanceStepGeolocation.tsx
1. Import expo-location
2. Request location permissions
3. Get current GPS coordinates
4. Compare with room coordinates from session
5. Validate GPS accuracy (within 50m threshold)
6. Save GPS data for multi-layer validation
```

### Barometer Integration
```typescript
// TODO in AttendanceStepBarometer.tsx
1. Import sensor access library (expo-sensors or native)
2. Request sensor permissions if needed
3. Read barometer pressure from device
4. Calculate altitude from pressure using formula
5. Compare with expected room altitude
6. Validate within tolerance (±5m threshold)
7. Save pressure data for multi-layer validation
```

### API Integration
```typescript
// TODO in AttendanceBottomSheet.tsx
// In handleSubmit():
const result = await markAttendance(
  studentId,
  session.id,
  universityId,
  stepStates.totp.code,        // TOTP code
  gpsLatitude,                   // From Step 1
  gpsLongitude,                  // From Step 1
  pressureValue                  // From Step 2
);
```

### Teacher's TOTP Code Sharing
- Teacher dashboard needs UI to generate/display 6-char code
- Timer showing code validity (typically 5-10 minutes)
- Option to refresh/regenerate code
- Shows code in large, easy-to-read format

## Styling

### Color Scheme
- **Primary**: Blue for default states and actions
- **Success**: Green for completed and verified states
- **Warning**: Orange for pending/attention states
- **Danger**: Red for errors
- **Backgrounds**: Card backgrounds with subtle shadows

### Component Hierarchy
```
MarkAttendanceScreen
├── Header (with app logo and title)
├── Title Section
└── Main Content
    ├── If Loading: ActivityIndicator
    ├── If Ongoing Session: SessionCard
    │   ├── Status Badge
    │   ├── Course Info
    │   ├── Details Grid (time, location, instructor)
    │   └── Mark Attendance Button
    └── If No Sessions: EmptyState
        
AttendanceBottomSheet (Modal)
├── Drag Handle
├── Header
│   ├── Title + Close Button
│   └── Session Info
├── Scrollable Steps
│   ├── Step 1: Geolocation
│   ├── Step 2: Barometer
│   └── Step 3: TOTP
└── Action Buttons
    ├── Cancel
    └── Submit (disabled until all steps complete)
```

## Current Mock Behavior

### Geolocation
- Simulates 2-second check
- Always returns success (verified: true)
- Can be easily updated to require real GPS validation

### Barometer
- Simulates 2-second barometer read
- Generates random readings within realistic range
- Calculates altitude from pressure formula
- Validates within 5m tolerance

### TOTP
- Accepts any 6 alphanumeric characters
- Auto-completes when 6 characters entered
- Stores code in component state
- Ready for actual validation against teacher's shared code

## Routing

### Add to App Navigation
To make this screen accessible from the quick action buttons in StudentDashboard:

```typescript
// In StudentDashboard.tsx
const handleMarkAttendance = () => {
  router.push('/(main)/mark-attendance' as any);
};

// Update QuickActionButton
<QuickActionButton
  icon="qr-code-scanner"
  label="Mark Attendance"
  onPress={handleMarkAttendance}
  colors={colors}
/>
```

## Future Enhancements

1. **Gorhom Bottom Sheet Integration**
   - Replace Modal with `@gorhom/bottom-sheet`
   - Add snap points for responsive height
   - Add dynamic background blur

2. **Gesture Handlers**
   - Swipe down to close
   - Pan for changing step sizes
   - Haptic feedback on step completion

3. **Step Animations**
   - More complex entrance animations
   - Transition animations between steps
   - Celebration animation on completion

4. **Offline Support**
   - Store pending attendance records locally
   - Sync when connection restored
   - Show sync status

5. **Accessibility**
   - VoiceOver labels for all steps
   - Keyboard navigation support
   - High contrast mode support

## Testing Checklist

- [ ] Navigate to Mark Attendance screen
- [ ] Verify ongoing session displays correctly
- [ ] Empty state shows when no ongoing classes
- [ ] Bottom sheet opens/closes smoothly
- [ ] Step progression works (1→2→3)
- [ ] Submit button disabled until all steps complete
- [ ] Can complete all steps with mock data
- [ ] Bottom sheet closes after submission
- [ ] Can reopen sheet and start fresh
- [ ] Back button/gesture closes sheet properly

## Files Created/Modified

### New Files
1. `screens/MarkAttendanceScreen.tsx` - Main screen
2. `components/AttendanceBottomSheet.tsx` - Modal bottom sheet
3. `components/AttendanceSteps/AttendanceStepGeolocation.tsx` - Step 1
4. `components/AttendanceSteps/AttendanceStepBarometer.tsx` - Step 2
5. `components/AttendanceSteps/AttendanceStepTOTP.tsx` - Step 3
6. `components/AttendanceSteps/index.ts` - Export barrel
7. `app/(main)/mark-attendance.tsx` - Route

### Modified Files
1. `screens/index.ts` - Added MarkAttendanceScreen export

### Dependencies (Already Installed)
- `react-native-otp-inputs` - For TOTP code input
- `expo-image` - For image display
- `react-native-reanimated` - For animations
- `react-native-safe-area-context` - For safe area handling

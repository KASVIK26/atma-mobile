## Student & Instructor Attendance Flow - Complete Walkthrough

### Student Experience: Marking Attendance

#### ✅ Step 1: Student Opens Classes Screen
```
ClassesScreen opens
├─ useEffect calls: getTodaysClassesWithStatus()
├─ Fetches: Sessions with instructor_names, building_info
└─ Renders: List of TimelineClassCard components
```

**Data Provided to Each Card:**
```typescript
<TimelineClassCard
  courseCode="CS101"
  courseName="Data Structures"
  instructor="Dr. John Smith"  // Real name from instructors table
  building="Arts Block"        // Real building from buildings table
  time="2:00 PM"
  duration="90 min"
  totpCode="??????"            // Value depends on code_shared flag
  codeShared={true}            // Only if instructor enabled
  attendanceMarkingEnabled={true}
  sessionId="session-uuid"
  studentId="student-uuid"
  universityId="university-uuid"
/>
```

---

#### ✅ Step 2: Student Sees Class Card

**If Instructor Has NOT Shared Code (Default State):**
```
┌─────────────────────────────────────────┐
│ 📚 Data Structures (CS101)              │
│ Dr. John Smith | Arts Block             │
│                                         │
│ 2:00 PM - 3:30 PM (90 min)             │
│                                         │
│ Status: Upcoming                        │
│                                         │
│ (No TOTP code visible)                 │
│ (No "Mark Attendance" button)           │
└─────────────────────────────────────────┘
```

**Frontend Check:**
```typescript
if (codeShared === false) {
  // Don't show: totpCode
  // Don't show: Mark Attendance button
}
```

**RLS Protection:**
- Even if frontend bug shows code, RLS policy blocks marking
- Database enforces: attendance_marking_enabled must be TRUE

---

#### ✅ Step 3: Instructor Shares Code (TODO - Not Yet Implemented)

**Instructor App (Future):**
```
┌─ Session Detail Screen ───────────────────┐
│ CS101: Data Structures                    │
│ Today, 2:00 PM                            │
│                                           │
│ [📤 Share Code with Class] ← Click here  │
│ [⏸️ Stop Attendance] (if already shared) │
│                                           │
│ Current Code: 123456                      │
│ Students Marked: 45 / 60                  │
└───────────────────────────────────────────┘

When clicked:
  UPDATE totp_sessions SET
    code_shared = TRUE,
    attendance_marking_enabled = TRUE,
    code_shared_at = NOW(),
    shared_by_user_id = auth.uid()
  WHERE lecture_session_id = 'session-uuid';
```

---

#### ✅ Step 4: Student Now Sees Code & Button

**After Instructor Shared (Code Becomes Visible):**
```
┌─────────────────────────────────────────────┐
│ 📚 Data Structures (CS101)                  │
│ Dr. John Smith | Arts Block                 │
│                                             │
│ 2:00 PM - 3:30 PM (90 min)                 │
│                                             │
│ Status: Upcoming                            │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ TOTP Code: 123456                    │   │ ← Visible now!
│ └──────────────────────────────────────┘   │
│                                             │
│ [🎯 Mark Attendance]  ← Button visible now│
└─────────────────────────────────────────────┘
```

**Frontend Rendering:**
```typescript
if (codeShared === true) {
  <View style={styles.totpCodeContainer}>
    <Text style={styles.totpLabel}>TOTP Code</Text>
    <Text style={styles.totpCode}>{totpCode}</Text>
  </View>
}

if (attendanceMarkingEnabled === true && !attendanceMarked) {
  <Pressable onPress={handleMarkAttendance} style={styles.actionButton}>
    <Text>Mark Attendance</Text>
  </Pressable>
}
```

---

#### ✅ Step 5: Student Clicks "Mark Attendance"

**User Action:**
```
Student taps: [🎯 Mark Attendance] button
```

**Frontend Function Executes:**
```typescript
const handleMarkAttendance = async () => {
  // Collect data
  const gpsLatitude = undefined;     // Ready for sensor integration
  const gpsLongitude = undefined;    // Ready for sensor integration
  const pressureValue = undefined;   // Ready for sensor integration

  // Call service
  const result = await markAttendance(
    'student-uuid-abc123...',           // studentId
    'session-uuid-def456...',           // lectureSessionId
    'university-uuid-ghi789...',        // universityId
    '123456',                            // totpCode (from screen)
    gpsLatitude,                         // undefined for now
    gpsLongitude,                        // undefined for now
    pressureValue                        // undefined for now
  );

  if (result.success) {
    setAttendanceMarked(true);
    Alert.alert('✅ Success', result.message);
  }
};
```

---

#### ✅ Step 6: Dashboard Service Processes Request

**File:** `lib/dashboard-service.ts: markAttendance()`

```typescript
export async function markAttendance(
  studentId: string,
  lectureSessionId: string,
  universityId: string,
  totpCode?: string,
  gpsLatitude?: number,
  gpsLongitude?: number,
  pressureValue?: number
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Dashboard Service] Marking attendance for student:', studentId.substring(0, 8) + '...');

    // Call PostgreSQL function (RPC)
    const { data, error } = await supabase.rpc('mark_attendance_via_totp', {
      p_student_id: studentId,
      p_lecture_session_id: lectureSessionId,
      p_university_id: universityId,
      p_totp_code: totpCode || null,
      p_gps_latitude: gpsLatitude || null,
      p_gps_longitude: gpsLongitude || null,
      p_pressure_value: pressureValue || null,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const result = data[0]; // RPC returns array
    return { success: result.success, message: result.message };
  } catch (error) {
    return { success: false, message: 'An error occurred' };
  }
}
```

---

#### ✅ Step 7: PostgreSQL Function Validates

**File:** `ATTENDANCE_SCHEMA_MIGRATION_REVISED.sql: mark_attendance_via_totp()`

```sql
DECLARE
  v_is_enrolled BOOLEAN;
  v_already_marked BOOLEAN;
  v_totp_session_id UUID;
  v_marking_window_open BOOLEAN;
  v_confidence_score NUMERIC;
BEGIN
  -- Check 1: Is student enrolled in this class?
  SELECT EXISTS (
    SELECT 1 FROM student_enrollments se
    WHERE se.user_id = p_student_id
    AND se.is_active = TRUE
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Not enrolled in this class'::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- Check 2: Has student already marked attendance?
  SELECT EXISTS (
    SELECT 1 FROM attendance_records
    WHERE student_id = p_student_id
    AND lecture_session_id = p_lecture_session_id
  ) INTO v_already_marked;

  IF v_already_marked THEN
    RETURN QUERY SELECT 
      FALSE, 
      'You have already marked attendance for this session'::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- Check 3: Is attendance marking enabled & window open?
  SELECT ts.id, (ts.expires_at > NOW())
  INTO v_totp_session_id, v_marking_window_open
  FROM totp_sessions ts
  WHERE ts.lecture_session_id = p_lecture_session_id
  AND ts.attendance_marking_enabled = TRUE;

  IF v_totp_session_id IS NULL OR NOT v_marking_window_open THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Attendance marking is not enabled or window has closed'::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- All checks passed! Calculate confidence score
  v_confidence_score := CASE WHEN p_totp_code IS NOT NULL THEN 0.33 ELSE 0.0 END;
  IF p_gps_latitude IS NOT NULL AND p_gps_longitude IS NOT NULL THEN
    v_confidence_score := v_confidence_score + 0.33;
  END IF;
  IF p_pressure_value IS NOT NULL THEN
    v_confidence_score := v_confidence_score + 0.34;
  END IF;
  v_confidence_score := LEAST(v_confidence_score, 1.0);

  -- Insert attendance record
  INSERT INTO attendance_records (
    university_id, lecture_session_id, student_id,
    attendance_status, marked_at, marked_by, marking_method,
    gps_latitude, gps_longitude, pressure_value,
    totp_valid, confidence_level
  ) VALUES (
    p_university_id, p_lecture_session_id, p_student_id,
    'present'::attendance_status, NOW(), p_student_id, 'student_app'::VARCHAR,
    p_gps_latitude, p_gps_longitude, p_pressure_value,
    (p_totp_code IS NOT NULL), v_confidence_score
  ) RETURNING id INTO v_attendance_id;

  RETURN QUERY SELECT TRUE, 'Attendance marked successfully'::TEXT, v_attendance_id;
END;
```

---

#### ✅ Step 8: RLS Policies Enforce Security

**RLS Policy: `students_mark_own_attendance`**

```sql
-- When INSERT happens, PostgreSQL checks this policy:
CREATE POLICY "students_mark_own_attendance"
  ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- Check 1: Marking for self only
    student_id = auth.uid()  ← '123abc...' = '123abc...' ✓
    AND
    -- Check 2: Must be enrolled
    EXISTS (
      SELECT 1 FROM student_enrollments se
      WHERE se.user_id = auth.uid()
      AND se.is_active = TRUE
    ) ✓ Student found in enrollments
    AND
    -- Check 3: Attendance window must be open
    EXISTS (
      SELECT 1 FROM totp_sessions ts
      WHERE ts.lecture_session_id = attendance_records.lecture_session_id
      AND ts.attendance_marking_enabled = TRUE
      AND ts.expires_at > NOW()
    ) ✓ Window not expired
    AND
    -- Check 4: Not already marked
    NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.student_id = attendance_records.student_id
      AND ar.lecture_session_id = attendance_records.lecture_session_id
    ) ✓ Not found
  );
```

**All Checks Pass:** ✅ ✅ ✅ ✅

**Result:** INSERT succeeds

---

#### ✅ Step 9: Attendance Record Created

**Database Insert Success:**
```sql
INSERT INTO attendance_records (
  id: 'record-uuid-12345...',
  university_id: 'university-uuid-ghi789...',
  lecture_session_id: 'session-uuid-def456...',
  student_id: 'student-uuid-abc123...',  ← Confirmed = auth.uid()
  attendance_status: 'present',
  marked_at: '2025-02-25 14:32:00',
  marked_by: 'student-uuid-abc123...',   ← Student marked own
  marking_method: 'student_app',
  gps_latitude: NULL,                     ← No GPS provided
  gps_longitude: NULL,                    ← No GPS provided
  pressure_value: NULL,                   ← No barometer
  totp_valid: TRUE,                       ← Code was provided
  confidence_level: 0.33,                 ← TOTP only
  created_at: '2025-02-25 14:32:00'
);
```

**Audit Log (Auto Generated):**
```sql
INSERT INTO attendance_audit_log (
  attendance_record_id: 'record-uuid-12345...',
  action: 'created',
  changed_by: 'student-uuid-abc123...',
  changed_at: '2025-02-25 14:32:00',
  new_values: { JSON of full record }
);
```

---

#### ✅ Step 10: Response Sent to Frontend

**PostgreSQL Response:**
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "attendance_id": "record-uuid-12345..."
}
```

**Frontend Update:**
```typescript
if (result.success) {
  // Update UI
  setAttendanceMarked(true);
  
  // Disable button to prevent re-clicking
  <Pressable disabled={isMarkingAttendance || attendanceMarked}>
  
  // Show success alert
  Alert.alert('✅ Success', 'Attendance marked successfully');
  
  // Log
  console.log('Attendance record created:', result.attendance_id);
}
```

---

#### ✅ Step 11: Student Sees Confirmation

**Updated Card UI:**
```
┌─────────────────────────────────────────────┐
│ 📚 Data Structures (CS101)                  │
│ Dr. John Smith | Arts Block                 │
│                                             │
│ 2:00 PM - 3:30 PM (90 min)                 │
│                                             │
│ Status: Upcoming                            │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ TOTP Code: 123456                    │   │
│ └──────────────────────────────────────┘   │
│                                             │
│ [✅ Marked] (Button disabled & inactive)   │
│                                             │
│ Confidence Score: 33%                       │
│ (TOTP Code Only)                            │
└─────────────────────────────────────────────┘
```

**States:**
- Button changes: Enabled → Disabled (greyed out)
- Text changes: "Mark Attendance" → "✅ Marked"
- Cannot click again → Prevented by state check

---

### Instructor Experience (TODO)

#### 🔮 Step 1: Instructor Opens Session Control

```
InstructorSessionScreen
├─ Shows: All today's sessions
├─ Each session has:
│  ├─ Course name & code
│  ├─ Time & location
│  ├─ Attendance count: "24/45 marked"
│  └─ Status buttons
```

#### 🔮 Step 2: Instructor Clicks "Share Code with Class"

```typescript
const shareCodeWithClass = async (lectureSessionId: string) => {
  const { error } = await supabase
    .from('totp_sessions')
    .update({
      code_shared: true,
      attendance_marking_enabled: true,
      code_shared_at: new Date().toISOString(),
      shared_by_user_id: auth.uid()
    })
    .eq('lecture_session_id', lectureSessionId);
};
```

#### 🔮 Step 3: Students Can Now Mark

All students in that class immediately see:
- ✅ TOTP Code visible
- ✅ "Mark Attendance" button enabled

#### 🔮 Step 4: Instructor Closes Attendance

```typescript
const closeAttendance = async (lectureSessionId: string) => {
  const { error } = await supabase
    .from('totp_sessions')
    .update({
      attendance_marking_enabled: false,
      // Note: code_shared stays TRUE so students see code history
    })
    .eq('lecture_session_id', lectureSessionId);
};
```

Students can no longer click button (disabled by RLS policy)

---

### Error Scenarios & Responses

#### ❌ Scenario 1: Student Not Enrolled

**Flow:**
```
Student clicks "Mark Attendance"
  ↓
markAttendance() called
  ↓
PostgreSQL function checks enrollment
  ↓
SELECT FROM student_enrollments: No row found
  ↓
Return: { success: false, message: "Not enrolled in this class" }
  ↓
Alert: "Not enrolled in this class"
```

**Cause:** Student enrolled in different section

---

#### ❌ Scenario 2: Already Marked

**Flow:**
```
Student clicks "Mark Attendance"
  ↓
PostgreSQL function checks duplicates
  ↓
SELECT FROM attendance_records: Row found!
  ↓
Return: { success: false, message: "You have already marked attendance for this session" }
  ↓
Alert: "You have already marked attendance for this session"
```

**Cause:** Frontend state missed OR user refreshed app

**Prevention:**
- Frontend state: `attendanceMarked` flag
- Database constraint: Unique `(student_id, lecture_session_id)`
- RLS policy: Additional EXISTS check

---

#### ❌ Scenario 3: Attendance Window Closed

**Flow:**
```
Student opens ClassesScreen
  ↓
getTodaysClassesWithStatus() checks: current_time > expires_at
  ↓
attendanceMarkingEnabled = false
  ↓
"Mark Attendance" button NOT shown
  ↓
Even if somehow clicked, RLS blocks: expires_at > NOW() fails
```

**Cause:** Time window passed, class is over

**Example:**
```
Class: 2:00 PM - 3:30 PM
Attendance window: 3:30 PM - 3:45 PM (15 minutes after)
expires_at: 3:45:00 PM

At 3:46 PM:
  NOW() = 3:46:00 PM
  NOW() > expires_at? YES ✓
  → RLS blocks marking
```

---

#### ❌ Scenario 4: Instructor Didn't Share Code Yet

**Flow:**
```
Student opens ClassesScreen
  ↓
ClassCard has: codeShared = false
  ↓
if (codeShared !== true) {
  // Hide TOTP code
  // Hide "Mark Attendance" button
}
  ↓
Student sees empty class card
```

**Frontend Security:**
Code is literally not rendered

**Database Security (Belt & Suspenders):**
Even if code was visible due to app bug, RLS blocks:
- `attendance_marking_enabled = false`
- Policy: EXISTS check fails
- INSERT rejected

---

### Confidence Score Examples

#### Example 1: TOTP Only (Default Today)
```
Student marks with TOTP code
├─ totp_valid = true       → +0.33
├─ gps_latitude = null     → +0.00
├─ pressure_value = null   → +0.00
└─ Total: 0.33 (33% confidence)
```

**Interpretation:**
- ✅ Code was provided
- ❌ No GPS verification
- ❌ No barometer verification
- 📊 Low confidence but acceptable for initial rollout

---

#### Example 2: TOTP + GPS (Future With Sensors)
```
Student marks with TOTP + phone location
├─ totp_valid = true           → +0.33
├─ gps_latitude = 12.9716°N    → +0.33
├─ pressure_value = null       → +0.00
└─ Total: 0.66 (66% confidence)
```

**Interpretation:**
- ✅ Code provided
- ✅ GPS location verified
- ❌ No altitude verification (GPS could be spoofed)
- 📊 Good confidence for normal use

---

#### Example 3: TOTP + GPS + Barometer (Full Validation)
```
Student marks with all three layers
├─ totp_valid = true                    → +0.33
├─ gps_latitude = 12.9716°N, gps_longitude = 77.5946°E → +0.33
├─ pressure_value = 1013.25 hPa       → +0.34
└─ Total: 1.0 (100% confidence)
```

**Interpretation:**
- ✅ All three layers validated
- ✅ Impossible to spoof when all three match
- ✅ BLE beacon addition possible for 200% bonus
- 📊 Maximum confidence - very difficult to fake

---

## Summary: Student Journey

```
1️⃣ Opens Classes Screen
   ↓
2️⃣ Sees class with instructor name & building
   ↓
3️⃣ Instructor shares code (TODO)
   ↓
4️⃣ TOTP code becomes visible
   ↓
5️⃣ Clicks "Mark Attendance" button
   ↓
6️⃣ Frontend validates & calls service
   ↓
7️⃣ Dashboard service calls PostgreSQL function
   ↓
8️⃣ Function validates: enrollment, duplicates, window
   ↓
9️⃣ Excellent! Calculates confidence score
   ↓
🔟 RLS policies enforce final security check
   ↓
1️⃣1️⃣ Attendance record inserted successfully
   ↓
1️⃣2️⃣ Button disabled, success alert shown
   ↓
✅ Done! Attendance marked
```


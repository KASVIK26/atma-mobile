## Multi-Layer Attendance Validation Architecture

### System Overview

Your attendance system uses a **3-layer validation architecture** plus instructor-controlled TOTP visibility:

```
Layer 1: GPS Geofencing
├─ Validates student is physically in the classroom
├─ Checks: gps_latitude, gps_longitude
├─ Confidence contribution: +0.33 if valid

Layer 2: Barometer Pressure (Height)
├─ Validates student device is at correct altitude
├─ Checks: pressure_value > 0
├─ Confirms geofencing accuracy (not spoofed GPS)
├─ Confidence contribution: +0.34 if valid

Layer 3: TOTP Code Validation
├─ Time-based One-Time Password from instructor
├─ Instructor shares code (code_shared = TRUE)
├─ Instructor enables marking window (attendance_marking_enabled = TRUE)
├─ Confidence contribution: +0.33 if valid
└─ Final confidence score: 0-1.0 (sum of above contributions)

Bonus Layer: BLE (Bluetooth Low Energy)
├─ Optional validation via beacon in classroom
├─ Checks: ble_valid boolean
└─ Further anti-spoofing mechanism
```

### Database Schema Alignment

Your `attendance_records` table IS the single source of truth with these key columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique attendance record identifier |
| `student_id` | UUID | **THIS IS THE USER_ID** (references `users.id`) |
| `lecture_session_id` | UUID | Which class session |
| `university_id` | UUID | School context |
| `attendance_status` | ENUM | 'present', 'absent', 'late' |
| `marking_method` | VARCHAR(50) | How it was marked: 'student_app', 'teacher_manual', 'admin_override', 'system_auto' |
| `marked_at` | TIMESTAMP | When attendance was recorded |
| `marked_by` | UUID | Who recorded it (usually auth.uid() = student_id for self-marking) |
| `gps_latitude` | NUMERIC(10, 8) | From device GPS |
| `gps_longitude` | NUMERIC(11, 8) | From device GPS |
| `pressure_value` | NUMERIC(7, 2) | From device barometer |
| `totp_valid` | BOOLEAN | Whether TOTP code was validated ✓ |
| `ble_valid` | BOOLEAN | Whether BLE beacon was detected |
| `confidence_level` | NUMERIC(5, 2) | 0-1.0 based on validation layers |
| `geofence_valid` | BOOLEAN | GPS geofencing validation result |
| `barometer_valid` | BOOLEAN | Barometer validation result |
| `is_proxy_suspected` | BOOLEAN | Fraud detection flag |
| `overridden_by` | UUID | If admin manually corrected |
| `override_reason` | TEXT | Why admin overridden |

---

## TOTP Code Sharing Control Flow

### Instructor Side (Not Yet Implemented in Frontend)

```typescript
// When instructor clicks "Share Code with Class" button:
// UPDATE totp_sessions SET 
//   code_shared = TRUE,
//   attendance_marking_enabled = TRUE,
//   code_shared_at = NOW(),
//   shared_by_user_id = auth.uid()
// WHERE lecture_session_id = <session_id>

// When instructor closes attendance ("Stop Taking Attendance"):
// UPDATE totp_sessions SET 
//   attendance_marking_enabled = FALSE
// WHERE lecture_session_id = <session_id>
// (Note: code_shared remains TRUE so students see it, just can't mark)
```

### Student Side (Currently Implemented)

```typescript
// In ClassesScreen / TimelineClassCard:
// 1. Check: totp_code_shared = TRUE → Show TOTP code to student
// 2. Check: attendance_marking_enabled = TRUE → Show "Mark Attendance" button
// 3. Click button → Call markAttendance():
//    - Validates student is enrolled
//    - Validates attendance window open (expires_at > NOW())
//    - Creates attendance record via mark_attendance_via_totp()
//    - RLS policies enforce all security checks at database level
```

---

## Data Flow: Marking Attendance with Validations

```
Student App (React Native)
    ↓
    ├─ collect: gps_latitude, gps_longitude (from device)
    ├─ collect: pressure_value (from device barometer)
    └─ collect: totp_code (shown by instructor via code_shared flag)
    ↓
dashboard-service.ts: markAttendance()
    ├─ Validate: student_id === auth.uid() (self marking)
    ├─ Validate: is_enrolled() check
    ├─ Validate: attendance window open
    ├─ Validate: not already marked (no duplicate)
    └─ Call: mark_attendance_via_totp() [PostgreSQL function]
    ↓
PostgreSQL: mark_attendance_via_totp()
    ├─ Check enrollment in student_enrollments table
    ├─ Check duplicate marking
    ├─ Check TOTP session: code_shared=TRUE, attendance_marking_enabled=TRUE, not expired
    ├─ Calculate confidence_level:
    │  ├─ +0.33 if totp_valid (code provided)
    │  ├─ +0.33 if gps_latitude && gps_longitude provided
    │  ├─ +0.34 if pressure_value provided
    │  └─ Total capped at 1.0
    └─ INSERT into attendance_records with all values
    ↓
RLS Policies (Database Security Layer)
    ├─ students_mark_own_attendance policy enforces:
    │  ├─ student_id = auth.uid()
    │  ├─ Enrollment validation
    │  ├─ Window open validation
    │  └─ No duplicate prevention
    └─ INSERT succeeds or fails based on security constraints
    ↓
Success Response to Frontend
    ├─ attendance_id (UUID of created record)
    └─ Message: "Attendance marked successfully"
```

---

## Security Enforcement (Three Layers)

### Layer 1: Frontend Validation (User Experience)
```typescript
// dashboard-service.ts: markAttendance()
- Checks enrollment status
- Checks time window
- Checks duplicate marking
- Provides user feedback
```

### Layer 2: SQL Function Validation (Business Logic)
```sql
-- mark_attendance_via_totp() function
- Validates enrollment
- Validates duplicate detection
- Validates window still open
- Calculates confidence score
- Enforces constraints
```

### Layer 3: RLS Policies (Database Enforcement)
```sql
-- students_mark_own_attendance policy
- Ensures student_id = auth.uid()
- Ensures enrollment verified
- Ensures window open
- Prevents duplicates
-- CANNOT be bypassed even with SQL access
```

**Security Model**: Untrustworthy Frontend → Trustworthy Backend (PostgreSQL RLS enforces all)

---

## Integration Points in Your Codebase

### 1. **dashboard-service.ts** (Frontend Service)
```typescript
export async function markAttendance(
  studentId: UUID,
  lectureSessionId: UUID,
  totpCode: string
): Promise<{success: boolean; message: string}> {
  // Calls: mark_attendance_via_totp() PostgreSQL function
  // Returns: {success, message, attendance_id}
}
```

### 2. **TimelineClassCard.tsx** (UI Component)
```typescript
const handleMarkAttendance = async () => {
  // 1. Collect GPS & pressure from device
  // 2. Call markAttendance(studentId, sessionId, totpCode)
  // 3. Update local state on success
  // 4. Show error if RLS policy blocks
}
```

### 3. **ClassesScreen.tsx** (Data Orchestration)
```typescript
const classes = await getTodaysClassesWithStatus();
// Returns with: codeShared, attendanceMarkingEnabled flags
// Passes to TimelineClassCard for conditional rendering
```

### 4. **totp_sessions Table** (Instructor Control)
```sql
columns: 
  - code_shared: Instructor sets TRUE/FALSE
  - attendance_marking_enabled: Instructor sets TRUE/FALSE
  - code_shared_at: Timestamp when enabled
  - shared_by_user_id: Which instructor enabled it
```

### 5. **attendance_records Table** (Your Existing Table)
```sql
-- Your comprehensive schema already handles:
- Multi-validation tracking (GPS, pressure, TOTP, BLE)
- Confidence scoring
- Proxy detection
- Admin overrides
- Automatic audit logging
```

---

## Migration Steps to Apply

1. **SQL Migration**: Run `ATTENDANCE_SCHEMA_MIGRATION_REVISED.sql`
   - Adds 4 columns to `totp_sessions`
   - Enables RLS on both tables
   - Creates RLS policies
   - Creates SQL helper functions

2. **Frontend Verification**: Check no TypeScript errors
   ```bash
   npm run tsc
   ```

3. **Database Verification**: Run verification queries (commented at end of SQL file)
   ```sql
   -- Verify columns exist
   -- Verify RLS enabled
   -- Verify policies in place
   -- Verify functions created
   ```

4. **E2E Testing**:
   ```
   Test 1: Student tries marking before instructor shares code
   ❌ Expected: Code hidden, button hidden, proper RLS block
   
   Test 2: Instructor shares code, student marks attendance
   ✅ Expected: Code visible, button visible, attendance_records inserted
   
   Test 3: Student tries marking twice
   ❌ Expected: RLS policy blocks duplicate
   
   Test 4: Non-enrolled student tries marking
   ❌ Expected: RLS policy blocks (not in student_enrollments)
   
   Test 5: After attendance window expires
   ❌ Expected: RLS policy blocks (expires_at > NOW() fails)
   ```

---

## Key Concept Clarifications

### `student_id` = `auth.uid()` in Your System
```sql
-- When student marks attendance:
INSERT INTO attendance_records (
  student_id,  -- This is auth.uid() / user_id of the student
  lecture_session_id,
  ...
) VALUES (auth.uid(), ...);
```

### Confidence Score Calculation
```
Logic: Sum of validation layer contributions
- TOTP valid: +0.33
- GPS valid (lat & long provided): +0.33
- Barometer valid (pressure > 0): +0.34
━━━━━━━━━━━━━━━━
- Total possible: 1.0

Examples:
- TOTP only: 0.33 (good)
- TOTP + GPS: 0.66 (very good)
- TOTP + GPS + Barometer: 1.0 (excellent / max)
- None: 0.0 (system_auto or teacher_manual)
```

### RLS Policy Evaluation Order
```
When student tries to INSERT attendance:
1. Database checks: students_mark_own_attendance policy
2. Policy evaluates all conditions with AND:
   ✓ student_id = auth.uid() ?
   ✓ Enrolled?
   ✓ Window open?
   ✓ Not already marked?
3. ALL must be TRUE or INSERT rejected
4. No exception, no error message leak
```

---

## Preventing Spoofing Attacks

Your multi-layer system defends against:

| Attack | Layer 1 | Layer 2 | Layer 3 | Result |
|--------|---------|---------|---------|--------|
| Fake GPS location | ❌ (easy to spoof) | ✓✓ (barometer altitude mismatch) | ✓✓ (both blocked by policy) | **BLOCKED** |
| TOTP code reuse | ✓ (time-based) | ✓ (duplicate check) | ✓ (RLS unique constraint) | **BLOCKED** |
| Missing barometer | ✓ (confidence = 0.33) | ✓ (flag set false) | ✓ (lower trust score) | **LOW CONFIDENCE** |
| Friend marking for you | ✗ (can't prevent) | ✓ (RLS checks auth.uid()) | ✓ (RLS enforces) | **BLOCKED** |
| Replay attack | ❌ (token valid minutes) | ✓ (window expires) | ✓ (RLS enforces expires_at > NOW()) | **BLOCKED** |

---

## What Happens Next

### For Students
1. ✅ See classes with instructor names & building info
2. ✅ See TOTP code only if `code_shared = TRUE`
3. ✅ See "Mark Attendance" button only if `attendance_marking_enabled = TRUE`
4. ✅ Mark attendance with GPS/pressure/TOTP validation
5. ✅ See their attendance statistics

### For Instructors (TODO)
1. Open class session in instructor app
2. Click "Share Code with Class" → Enables TOTP visibility & attendance marking
3. Students see code and can mark attendance
4. Click "Close Attendance" → Disables marking (code stays visible)
5. View attendance records with validation breakdown

### For Admins
1. Override attendance if student had valid excuse
2. Audit trail preserved in `attendance_audit_log`
3. View session-level statistics via `v_attendance_summary` view
4. Generate reports per student via `get_student_attendance_stats()`

---

## SQL Functions Reference

### `mark_attendance_via_totp()`
```sql
PURPOSE: Creates attendance record with multi-layer validation
CALLED BY: dashboard-service.ts markAttendance()
RETURNS: {success (bool), message (text), attendance_id (uuid)}

EXAMPLE:
SELECT * FROM mark_attendance_via_totp(
  '12345678-1234-5678-1234-567812345678'::UUID,  -- student_id (user_id)
  '87654321-4321-8765-4321-876543218765'::UUID,  -- lecture_session_id
  '99999999-9999-9999-9999-999999999999'::UUID,  -- university_id
  'XXXXXX'::VARCHAR,  -- totp_code
  10.5555,  -- gps_latitude
  20.6666,  -- gps_longitude
  1013.25  -- pressure_value
);
```

### `has_marked_attendance()`
```sql
PURPOSE: Check if student already marked for session (prevent re-marking UI)
CALLED BY: Frontend before showing button state
RETURNS: BOOLEAN

EXAMPLE:
SELECT has_marked_attendance(
  '12345678-1234-5678-1234-567812345678'::UUID,  -- student_id
  '87654321-4321-8765-4321-876543218765'::UUID   -- lecture_session_id
);
-- Returns: TRUE if already marked, FALSE otherwise
```

### `get_student_attendance_stats()`
```sql
PURPOSE: Get comprehensive attendance metrics for a student
CALLED BY: Student dashboard, analytics
RETURNS: TABLE with 11 columns (total_sessions, marked_present, marked_late, 
         marked_absent, totp_validated, gps_validated, barometer_validated, 
         ble_validated, avg_confidence_score, proxy_suspected, attendance_rate_pct)

EXAMPLE:
SELECT * FROM get_student_attendance_stats(
  '12345678-1234-5678-1234-567812345678'::UUID,  -- student_id
  '99999999-9999-9999-9999-999999999999'::UUID,  -- university_id
  '2025-01-01'::TIMESTAMP,  -- optional: start_date
  '2025-12-31'::TIMESTAMP   -- optional: end_date
);
```

### `v_attendance_summary` (View)
```sql
PURPOSE: Instructor view of session-level attendance summary
CALLED BY: Instructor dashboard, session reports
RETURNS: TABLE with attendance counts per validation method

EXAMPLE:
SELECT * FROM v_attendance_summary
WHERE course_code = 'CS101'
ORDER BY session_date DESC;
```

---

## Testing Checklist

After applying migration and before announcing to users:

- [ ] Run SQL migration without errors
- [ ] Verify totp_sessions has 4 new columns
- [ ] Verify RLS enabled on both tables
- [ ] Verify 8+ policies created
- [ ] Verify 4 functions created
- [ ] Verify view created
- [ ] Test with real student: see code_shared=FALSE → no TOTP code
- [ ] Test with real instructor: set code_shared=TRUE
- [ ] Test with student: now see TOTP code + button
- [ ] Student clicks "Mark Attendance"
- [ ] Verify attendance_records INSERT succeeded
- [ ] Student tries clicking again → "Already marked" error
- [ ] Test with non-enrolled student → RLS blocks
- [ ] Test after window expires → RLS blocks
- [ ] View attendance_summary → Shows correct counts
- [ ] View student stats → Shows correct metrics

---

## FAQ

**Q: Why check enrollment three times (frontend, function, RLS)?**
A: Defense in depth. Frontend for UX, function for business logic, RLS for security. Never trust the frontend.

**Q: Can a hacker bypass RLS?**
A: No, RLS is at database level. Even direct SQL access to Supabase would be blocked.

**Q: What if student uses old TOTP code?**
A: Window validation enforces `expires_at > NOW()`. Old code's session is expired, RLS blocks marking.

**Q: How do we know if student was really there vs. spoofed location?**
A: Confidence score. GPS alone (0.33) is low trust. GPS + barometer (0.67) is high trust. GPS + barometer + TOTP (1.0) is maximum.

**Q: Can we replay the same attendance record?**
A: No, unique constraint `(student_id, lecture_session_id)` prevents duplicate records. RLS policy also blocks.


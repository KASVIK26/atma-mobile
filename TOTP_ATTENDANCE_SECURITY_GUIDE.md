# TOTP & Attendance Security Architecture

## Overview

This document outlines the secure implementation of TOTP code sharing and attendance marking, ensuring that only authorized instructors can enable code sharing and only enrolled students can mark attendance during the enabled window.

## Security Model

### 1. **Code Sharing Control (Instructor → Student)**

**Database Table: totp_sessions**

Add these new columns:

```sql
ALTER TABLE totp_sessions ADD COLUMN IF NOT EXISTS code_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE totp_sessions ADD COLUMN IF NOT EXISTS attendance_marking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE totp_sessions ADD COLUMN IF NOT EXISTS code_shared_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE totp_sessions ADD COLUMN IF NOT EXISTS shared_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_totp_sessions_code_shared ON totp_sessions(code_shared, attendance_marking_enabled);
```

**Workflow:**

1. **Instructor Action**: Clicks "Share Code with Class" in their app
   - Sets `code_shared = TRUE` for the specific `totp_session`
   - Stores `shared_by_user_id = instructor_id` and `code_shared_at = NOW()`
   - This is the ONLY way students see the TOTP code

2. **Student Visibility**:
   - Students do NOT see TOTP code unless `code_shared = TRUE`
   - On `getTodaysDashboardData()`, we conditionally return the code:
     ```typescript
     totp_code: totp?.code_shared ? totp?.code : undefined
     ```

### 2. **Attendance Marking Security**

**Database Table: attendance_records**

Create if doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_session_id UUID NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  attendance_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  marked_via_totp BOOLEAN DEFAULT FALSE,
  totp_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'present', -- present, absent, late, excused
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each student can only mark attendance once per session
  CONSTRAINT unique_student_session UNIQUE(student_id, lecture_session_id)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_lecture_session_id ON attendance_records(lecture_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_time ON attendance_records(attendance_time);
```

### 3. **Row-Level Security (RLS) Policies**

**Policy 1: Students can only view TOTP code if instructor shared it**

```sql
CREATE POLICY "students_see_shared_totp_code"
  ON totp_sessions
  FOR SELECT
  USING (
    code_shared = TRUE 
    OR auth.uid() = shared_by_user_id
  );
```

**Policy 2: Students can only insert attendance for their own enrollment**

```sql
CREATE POLICY "students_can_mark_own_attendance"
  ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- Must be the authenticated user marking their own attendance
    student_id = auth.uid()
    AND EXISTS (
      -- Must be enrolled in this session
      SELECT 1 FROM student_enrollments se
      JOIN lecture_sessions ls ON se.section_id = ls.section_id
      WHERE se.user_id = auth.uid()
      AND ls.id = lecture_session_id
      AND se.is_active = TRUE
    )
    AND EXISTS (
      -- Attendance marking must be enabled
      SELECT 1 FROM totp_sessions ts
      WHERE ts.lecture_session_id = lecture_session_id
      AND ts.attendance_marking_enabled = TRUE
      AND ts.expires_at > NOW()
    )
  );

-- Students can view their own attendance records
CREATE POLICY "students_view_own_attendance"
  ON attendance_records
  FOR SELECT
  USING (student_id = auth.uid());
```

**Policy 3: Instructors can update TOTP sharing flags for their sessions**

```sql
CREATE POLICY "instructors_manage_code_sharing"
  ON totp_sessions
  FOR UPDATE
  USING (
    shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  )
  WITH CHECK (
    shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );
```

## Backend Security Validation

### markAttendance() Function

The `markAttendance()` function in `dashboard-service.ts` performs:

1. **Session Verification**:
   - Check if `attendance_marking_enabled = TRUE`
   - Check if `expires_at > NOW()`
   - Returns error if window closed

2. **RLS Enforcement**:
   - The INSERT INTO `attendance_records` is triggered with `auth.uid()` which:
     - Enforces student ID matches authenticated user
     - Validates enrollment via RLS policy
     - Prevents duplicate attendance

3. **Error Handling**:
   - Catches unique constraint violation (duplicate attendance)
   - Catches enrollment validation failures
   - Returns meaningful error messages

## Data Flow

### Student Perspective

```
┌─────────────────────────────────────────────────────────┐
│ 1. Student opens Classes Screen                          │
│    - getTodaysDashboardData() called                     │
│    - Queries totp_sessions where code_shared = TRUE      │
│    - Only shared codes included in response              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. UI Displays Classes Card                              │
│    - Shows TOTP Code (if code_shared = TRUE)             │
│    - Shows "Mark Attendance" button                      │
│      (if attendance_marking_enabled = TRUE)              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Student Clicks "Mark Attendance"                      │
│    - markAttendance(studentId, sessionId) called         │
│    - Backend checks:                                     │
│      a) attendance_marking_enabled = TRUE                │
│      b) expires_at > NOW()                               │
│      c) RLS validates enrollment                         │
│    - INSERT into attendance_records                      │
│    - Unique constraint prevents duplicates               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Confirmation                                          │
│    - "Attendance Marked Successfully" shown              │
│    - Button disabled to prevent re-marking               │
└─────────────────────────────────────────────────────────┘
```

### Instructor Perspective (Future)

```
Instructor App Flow:
  1. Opens active session
  2. Clicks "Share Code with Class"
  3. Sets code_shared = TRUE, attendance_marking_enabled = TRUE
  4. All enrolled students now see TOTP code
  5. All enrolled students can mark attendance
  6. At end of session, click "Close Attendance"
     - Sets attendance_marking_enabled = FALSE
     - No more attendance marking allowed
```

## Security Guarantees

✅ **Students cannot see TOTP code unless instructor explicitly enables it**
- Code only returned if `code_shared = TRUE`
- Query-level filtering in `getTodaysDashboardData()`

✅ **Students cannot mark attendance if not enrolled**
- RLS policy validates enrollment via `student_enrollments` table
- Junction through `lecture_sessions.section_id`

✅ **Students cannot mark attendance if window is closed**
- Check `attendance_marking_enabled = TRUE`
- Check `expires_at > NOW()`

✅ **Students cannot mark attendance twice**
- Unique constraint on `(student_id, lecture_session_id)`
- Database prevents duplicate inserts

✅ **Only instructors can enable code sharing**
- Update policy checks `instructor_ids` in `lecture_sessions`
- Prevents unauthorized code sharing

✅ **Attendance records are immutable**
- RLS prevents student updates to attendance after insert

## Implementation Checklist

- [ ] Add columns to `totp_sessions` table
- [ ] Create `attendance_records` table
- [ ] Create indexes for performance
- [ ] Implement RLS policies
- [ ] Enable RLS on both tables
- [ ] Test with multiple students
- [ ] Test with timing edge cases
- [ ] Test with duplicate attendance attempts
- [ ] Monitor for performance issues

## Testing Scenarios

### Scenario 1: Code Not Shared
```
GIVEN code_shared = FALSE
WHEN student opens Classes screen
THEN TOTP code NOT visible
AND "Mark Attendance" button NOT visible
```

### Scenario 2: Code Shared
```
GIVEN code_shared = TRUE AND attendance_marking_enabled = TRUE
WHEN student opens Classes screen
THEN TOTP code visible
AND "Mark Attendance" button visible
WHEN student clicks "Mark Attendance"
THEN attendance recorded
AND button disabled
```

### Scenario 3: Attendance Window Closed
```
GIVEN attendance_marking_enabled = FALSE
WHEN student tries to mark attendance
THEN error "Attendance window closed"
```

### Scenario 4: Not Enrolled
```
GIVEN student not in section
WHEN student tries to mark attendance
THEN RLS prevents INSERT
AND error "Not enrolled in this class"
```

## Future Enhancements

1. **TOTP Code Validation**:
   - Verify student-provided code matches `totp_sessions.code`
   - Set `totp_verified = TRUE` only if codes match

2. **Late Attendance**:
   - Check attendance time vs. session start time
   - Set status to `'late'` if marked after start time

3. **Audit Trail**:
   - Log who enabled code sharing (already: `shared_by_user_id`)
   - Log IP address for attendance marking
   - Monitor for suspicious patterns

4. **Attendance Analytics**:
   - Dashboard showing attendance rates per student/class
   - Trend analysis over semester
   - Alerts for low attendance

## Troubleshooting

**Problem**: Students see TOTP code but can't mark attendance
- Check: `attendance_marking_enabled = TRUE`?
- Check: `expires_at > NOW()`?

**Problem**: Student gets "Already marked" error
- Expected behavior - unique constraint working
- Student should see "Attendance Marked" button state

**Problem**: Enrollment validation failing
- Check: `student_enrollments` record exists?
- Check: `is_active = TRUE`?
- Check: Section matches lecture session?

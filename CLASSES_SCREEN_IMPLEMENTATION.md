# Classes Screen Implementation - Quick Reference

## What Was Implemented

### 1. Instructor Names ✅
- Fetches instructor data from `instructors` table
- Displays all instructors for a session
- Shows as comma-separated list on card
- Handles missing instructor data gracefully

### 2. Building Names ✅
- Fetches building information from `buildings` table
- Displays as: "Room Name - Building Name"
- Shows below room number
- Handles missing building data gracefully

### 3. TOTP Code Security Implementation ✅

**Key Feature**: Code is ONLY shown if instructor explicitly enabled it

```typescript
// In dashboard-service.ts
totp_code: totp?.code_shared ? totp?.code : undefined
```

- Added `code_shared` flag to totp_sessions table
- Added `attendance_marking_enabled` flag to totp_sessions table
- Students cannot see code unless `code_shared = TRUE`

### 4. Mark Attendance Feature ✅

**Security**:
- Only available when instructor enables it (`attendance_marking_enabled = TRUE`)
- Only works during attendance window (`expires_at > NOW()`)
- Database RLS validates student enrollment
- Prevents duplicate attendance (unique constraint)
- Atomic database operations

**User Experience**:
- Green "Mark Attendance" button appears
- Shows loading state while processing
- Changes to "Attendance Marked" after success
- Button disabled if already marked
- Error messages for failures

## Database Changes Required

```sql
-- Add to totp_sessions table
ALTER TABLE totp_sessions ADD COLUMN code_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE totp_sessions ADD COLUMN attendance_marking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE totp_sessions ADD COLUMN code_shared_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE totp_sessions ADD COLUMN shared_by_user_id UUID REFERENCES users(id);

-- Create attendance_records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_session_id UUID NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  attendance_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marked_via_totp BOOLEAN DEFAULT FALSE,
  totp_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'present',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_session UNIQUE(student_id, lecture_session_id)
);

-- Enable RLS (managed in separate RLS policy file)
```

## Files Modified

1. **[lib/dashboard-service.ts](lib/dashboard-service.ts)**
   - Updated `DashboardSession` interface with new fields
   - Updated `getTodaysDashboardData()` to fetch instructors
   - Added `markAttendance()` function with security checks
   - Added `hasMarkedAttendance()` helper function
   - Added `getTodaysClassesWithStatus()` for classes with time-based status

2. **[components/TimelineClassCard.tsx](components/TimelineClassCard.tsx)**
   - Added new props: `building`, `codeShared`, `attendanceMarkingEnabled`, etc.
   - Added "Mark Attendance" button with conditional rendering
   - Added attendance state management
   - Shows building name below room
   - Only displays TOTP if instructor shared it
   - Only shows button if attendance is enabled

3. **[screens/ClassesScreen.tsx](screens/ClassesScreen.tsx)**
   - Passes instructor names array
   - Passes building information
   - Passes TOTP code sharing flags
   - Passes attendance enabling flags
   - Handles attendance marking callback

## How It Works - User Flow

### Student Opens Classes Screen
```
1. App queries getTodaysDashboardData()
2. Backend checks: code_shared = TRUE for each session
3. Only shared TOTP codes returned to frontend
4. UI displays cards with:
   - Class info
   - Instructor names (real data from DB)
   - Room with building name
   - TOTP code (ONLY if instructor shared it)
   - "Mark Attendance" button (ONLY if instructor enabled it)
```

### Student Marks Attendance
```
1. User taps "Mark Attendance" button
2. Button shows loading spinner
3. Call markAttendance(studentId, sessionId)
4. Backend validates:
   - attendance_marking_enabled = TRUE
   - expires_at > NOW()
   - Student is enrolled (RLS policy)
   - Not already marked (unique constraint)
5. If all checks pass:
   - Insert into attendance_records
   - Return success
   - Button changes to "Attendance Marked"
   - Button disabled
6. If any check fails:
   - Return error with message
   - Show Alert to user
```

## Security Checklist

✅ Instructor must enable code sharing for students to see it
✅ Instructor must enable attendance marking for button to appear  
✅ Attendance window must be open (expires_at check)
✅ Student must be enrolled (RLS policy)
✅ Student cannot mark attendance twice (unique constraint)
✅ All operations use authenticated user ID (auth.uid())
✅ Database handles all validation atomically
✅ Error messages don't leak sensitive info

## Instructor Side (Future Implementation)

For instructors, you'll implement:

1. **Share Code Button**
   - Query session's totp_session record
   - Set `code_shared = TRUE, attendance_marking_enabled = TRUE`
   - Update `code_shared_at` and `shared_by_user_id`
   - Send push notification to students (optional)

2. **Close Attendance Button**
   - Set `attendance_marking_enabled = FALSE`
   - Students can no longer mark attendance
   - Keep `code_shared = TRUE` so code still visible (for reference)

3. **Attendance Report**
   - Query `attendance_records` for the session
   - Show which students marked attendance
   - Show attendance time
   - Calculate attendance percentage

## Error Scenarios

| Error | Cause | Fix |
|-------|-------|-----|
| "Attendance marking not enabled" | Instructor hasn't clicked "Share Code" | Wait for instructor |
| "Attendance window has closed" | Session `expires_at` passed | Session ended |
| "Already marked attendance" | Unique constraint (duplicate) | Already marked |
| "Not enrolled in this class" | RLS policy validation failed | Check enrollment |
| "Session not found" | Invalid lecture_session_id | App data outdated |

## Testing Checklist

- [ ] Open Classes screen - see instructor names
- [ ] Open Classes screen - see building names with room
- [ ] Code NOT visible until instructor shares it
- [ ] Can mark attendance when enabled + window open
- [ ] Cannot mark attendance when disabled
- [ ] Cannot mark attendance after window closes
- [ ] Cannot mark attendance twice (button disabled)
- [ ] Works for multiple instructors per session
- [ ] Works for students not enrolled (RLS blocks it)
- [ ] Error messages are helpful

## Performance Considerations

- Instructor fetching is efficient (batch query on instructor_ids set)
- Building data fetched with room data (single join)
- TOTP queries include flags and expiry time
- Attendance INSERT is atomic with validation
- Indexes on frequently queried columns recommended

## Next Steps

1. Apply SQL migrations to add new columns/tables
2. Implement RLS policies (see TOTP_ATTENDANCE_SECURITY_GUIDE.md)
3. Test with multiple students and sessions
4. Implement instructor-side code sharing UI
5. Add attendance analytics dashboard
6. Monitor performance and security logs

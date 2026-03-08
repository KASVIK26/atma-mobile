# Schedule Implementation - Quick Start Guide

## What Was Implemented

You now have a complete **live schedule system** that pulls real data from your database. The system automatically:

1. ✅ Fetches lecture sessions from the database
2. ✅ Filters by student enrollment (for students) or instructor assignment (for teachers)
3. ✅ Displays sessions in Daily or Weekly views
4. ✅ Shows TOTP indicators and special class badges
5. ✅ Handles loading and error states

## File Structure

```
NEW FILES CREATED:
├── lib/schedule-service.ts           ← Core schedule fetching service
├── components/SessionBlock.tsx       ← Reusable session display component
└── SCHEDULE_SYSTEM_IMPLEMENTATION.md ← Full documentation

MODIFIED FILES:
└── screens/ViewScheduleScreen.tsx    ← Now uses live data
```

## Key Changes to ViewScheduleScreen

### Before (Mock Data)
```typescript
// Old: Using hardcoded mock data
const generateScheduleData = (): ScheduleClass[] => {
  const today = new Date();
  const classes: ScheduleClass[] = [
    { id: '1', title: 'Psychology', courseCode: 'PSY101', ... },
    { id: '2', title: 'Calculus II', courseCode: 'MAT202', ... },
    // ... more hardcoded classes
  ];
  return classes;
};
```

### After (Live Data)
```typescript
// New: Fetches from database based on user role
useEffect(() => {
  const fetchSchedule = async () => {
    if (isStudent) {
      // Gets student's enrolled sections, then all sessions for those sections
      const result = await getStudentSchedule(studentId, universityId, start, end);
      sessions = result.sessions;
    } else if (isTeacher) {
      // Gets all sessions where teacher is an instructor
      const result = await getTeacherSchedule(instructorId, universityId, start, end);
      sessions = result.sessions;
    }
    // Display sessions
  };
}, [userProfile, instructor]);
```

## How It Works

### For Students:
1. Component loads → Checks user is a student
2. Fetches student enrollments (all sections they're enrolled in)
3. Fetches all lecture sessions for those sections
4. Displays sessions grouped by date
5. User can navigate between days or view weekly

### For Teachers:
1. Component loads → Checks user is a teacher
2. Gets instructor ID from auth context
3. Fetches all lecture sessions where instructor is in instructor_ids array
4. Displays sessions grouped by date
5. User can navigate between days or view weekly

## SessionBlock Component

The `SessionBlock` component replaces the old card rendering with a reusable, animated block that shows:

```
┌─────────────────────────────────────┐
│ Course Name              [UPCOMING]  │ ← Status badge
├─────────────────────────────────────┤
│ COURSE-CODE                         │
├─────────────────────────────────────┤
│ ⏰ 09:00 AM - 10:30 AM (90 mins)   │
│ 📍 Room 301, Building A             │
│ 👤 Prof. Ada Lovelace               │
│ ⏳ Max late: 5 mins                 │
│ ⭐ Special Class                    │
└─────────────────────────────────────┘
```

**Props:**
- `session` - LectureSessionExtended object
- `colors` - Theme colors object
- `isFirstItem` - Adds margin above first item
- `index` - For animation delay

## Testing the Schedule

### Test Case 1: View Student Schedule
1. Login as a student
2. Navigate to "My Schedule" / View Schedule
3. ✅ Should see classes for today (if any)
4. ✅ Should show course name, time, location, instructor
5. ✅ Use date picker to view other days
6. ✅ Click "Weekly" tab to see week view

### Test Case 2: View Teacher Schedule
1. Login as a teacher
2. Navigate to "My Schedule"
3. ✅ Should see all sections/classes you're teaching today
4. ✅ Should show student count if available
5. ✅ Should have TOTP code option if session is ongoing

### Test Case 3: Filter by Date
1. Use left/right arrows to navigate dates
2. ✅ Should update list of classes for selected date
3. ✅ "No classes" message if no sessions on that date

### Test Case 4: Weekly View
1. Click "Weekly" tab
2. ✅ Should show all 7 days of current week
3. ✅ Today should be highlighted in green
4. ✅ Each day shows count of classes

### Test Case 5: Empty State
1. Navigate to a date with no classes
2. ✅ Should show "No classes scheduled" message
3. ✅ Should show a user-friendly icon

### Test Case 6: Loading State
1. Refresh the screen or reopen ViewSchedule
2. ✅ Should briefly show "Loading your schedule..."
3. ✅ Should disappear once data loads

## Data Flow Diagram

```
USER OPENS SCHEDULE
        ↓
[Check User Role]
        ↓
    ┌───┴────┐
    ↓        ↓
 STUDENT   TEACHER
    ↓        ↓
 Get Enrollments  Get Instructor ID
    ↓        ↓
 Get sections → Fetch Sessions
    ↓        ↓
 Fetch Sessions
    ↓
[Filter by Date Range]
    ↓
[Populate Course/Room/Instructor Data]
    ↓
[Convert to ScheduleClass Format]
    ↓
[Display via SessionBlock Component]
```

## Database Queries Used

### Student Schedule
```javascript
// 1. Get student's sections
supabase.from('student_enrollments')
  .select('section_id')
  .eq('student_id', studentId)
  .eq('is_active', true)

// 2. Get sessions for those sections
supabase.from('lecture_sessions')
  .select('*, courses(), rooms(*, buildings())')
  .in('section_id', [sectionIds])
  .eq('is_active', true)
  .eq('is_cancelled', false)
  .gte('session_date', startDate)
  .lte('session_date', endDate)
```

### Teacher Schedule
```javascript
// Get all sessions where instructor is assigned
supabase.from('lecture_sessions')
  .select('*, courses(), rooms(*, buildings())')
  .eq('is_active', true)
  .eq('is_cancelled', false)
  .gte('session_date', startDate)
  .lte('session_date', endDate)
  // Then filter: instructor_ids.includes(instructorId)
```

## Performance Notes

- **Date Range**: Fetches 30 days in past + 90 days in future
- **Caching**: Data is only fetched once when component mounts
- **Efficiency**: Uses array operators for instructor filtering
- **Reusable**: SessionBlock component with React memoization

## Next Steps / Enhancements

1. **Add TOTP Code Display**: Show live TOTP code for active sessions
2. **Attendance from Schedule**: Quick "Mark Attendance" button
3. **Session Notifications**: Remind user 5 mins before class starts
4. **Calendar Integration**: Export to iCal/Google Calendar
5. **Course Filtering**: Filter schedule by specific course
6. **Room View**: See all sessions in a specific room
7. **Real-time Updates**: Subscribe to lecture_sessions table changes

## Troubleshooting

### Schedule Not Loading?
- ✅ Check console for error messages
- ✅ Verify user profile is fully loaded
- ✅ For students: Check student_enrollments exist
- ✅ For teachers: Check instructor record exists with correct ID

### Wrong Data Showing?
- ✅ Verify lecture_sessions have correct course_id
- ✅ For students: Check section_id matches enrollments
- ✅ For teachers: Check instructor_ids array includes teacher

### UI Not Loading?
- ✅ Verify colors object is passed in useTheme()
- ✅ Check SessionBlock import exists
- ✅ Verify theme context is initialized

## Code Examples

### Fetch a Student's Schedule
```typescript
import { getStudentSchedule } from '@/lib/schedule-service';

const result = await getStudentSchedule(
  studentId,
  universityId,
  '2026-02-25',  // Start date (YYYY-MM-DD)
  '2026-05-25'   // End date
);

if (result.error) {
  console.error('Failed to load schedule:', result.error);
} else {
  console.log('Sessions:', result.sessions);
  // Sessions now contains LectureSessionExtended[] with all details
}
```

### Fetch a Teacher's Schedule
```typescript
import { getTeacherSchedule } from '@/lib/schedule-service';

const result = await getTeacherSchedule(
  instructorId,
  universityId,
  '2026-02-25',  // Start date
  '2026-05-25'   // End date
);

if (result.error) {
  console.error('Failed to load schedule:', result.error);
} else {
  console.log('Sessions:', result.sessions);
}
```

### Subscribe to TOTP Updates
```typescript
import { subscribeTOTPUpdates } from '@/lib/schedule-service';

const channel = subscribeTOTPUpdates(
  lectureSessionId,
  (session) => {
    console.log('New TOTP code:', session.code);
    // Update UI with new code
  }
);

// Later, unsubscribe
channel.unsubscribe();
```

## Architecture Decision Rationale

### Why Separate Service?
- ✅ Reusable across app (can use in dashboards too)
- ✅ Testable independently
- ✅ Clean separation of concerns
- ✅ Easy to add caching/optimization

### Why SessionBlock Component?
- ✅ DRY principle (used in daily + weekly views)
- ✅ Consistent styling across views
- ✅ Easy to update card design in one place
- ✅ Animatable/themeable

### Why Dual-Role Support?
- ✅ Single ViewSchedule for both students and teachers
- ✅ Automatic role detection via useAuth()
- ✅ Different queries based on role
- ✅ Simpler navigation (fewer screens)

## File Sizes

- `schedule-service.ts`: ~386 lines
- `SessionBlock.tsx`: ~307 lines
- `ViewScheduleScreen.tsx`: ~984 lines (was ~988, mostly refactored)
- Total: ~1.7KB of new code functionality


# Teacher Schedule View Implementation Guide

## Overview

The teacher schedule view displays all lecture sessions assigned to a teacher filtered by the `instructor_ids` array in the `lecture_sessions` table. This guide explains the complete implementation and how it works.

---

## Architecture

### Data Flow

```
ViewScheduleScreen (Component)
    ↓
useAuth() → gets instructor data
    ↓
getTeacherSchedule() (Service Function)
    ↓
Supabase:
  1. Query lecture_sessions (filtered by university, date range, active status)
  2. Filter client-side by instructor_ids array containment
  3. Fetch instructor names for all instructor_ids
    ↓
convertToScheduleClass() (Format for UI)
    ↓
SessionBlock Components (Display)
```

---

## Key Components

### 1. **Database Schema: lecture_sessions**

```sql
CREATE TABLE lecture_sessions (
  id uuid PRIMARY KEY,
  university_id uuid NOT NULL,
  course_id uuid NOT NULL,
  section_id uuid NOT NULL,
  room_id uuid NOT NULL,
  instructor_ids uuid[] NOT NULL DEFAULT array[]::uuid[],  -- ARRAY of instructor IDs
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  session_status varchar(50) DEFAULT 'scheduled',
  is_active boolean DEFAULT true,
  is_cancelled boolean DEFAULT false,
  -- ... other fields
);
```

**Important**: `instructor_ids` is stored as a PostgreSQL UUID array (`uuid[]`), which allows multiple instructors per lecture session.

### 2. **Schedule Service: getTeacherSchedule()**

File: `lib/schedule-service.ts`

```typescript
export async function getTeacherSchedule(
  instructorId: string,        // UUID of the instructor
  universityId: string,         // UUID of the university
  startDate: string,           // YYYY-MM-DD format
  endDate: string              // YYYY-MM-DD format
): Promise<{ sessions: LectureSessionExtended[] | null; error: Error | null }>
```

#### How It Works:

**Step 1: Query Lecture Sessions**
- Fetches all lecture sessions for the university within the date range
- Filters by: `is_active=true`, `is_cancelled=false`
- Includes related data: courses, rooms, and building details

```typescript
const { data: sessions, error } = await supabase
  .from('lecture_sessions')
  .select(`
    id, university_id, course_id, section_id, room_id,
    instructor_ids,
    session_date, start_time, end_time, session_status,
    courses(id, code, name),
    rooms(id, room_number, room_name, building:buildings(id, name))
  `)
  .eq('university_id', universityId)
  .eq('is_active', true)
  .eq('is_cancelled', false)
  .gte('session_date', startDate)
  .lte('session_date', endDate)
  .order('session_date', { ascending: true })
  .order('start_time', { ascending: true });
```

**Step 2: Filter by Instructor**
- Client-side filtering checks if `instructor_ids` array contains the instructor ID
- This handles the PostgreSQL array containment check

```typescript
const filteredSessions = sessions.filter((session) =>
  session.instructor_ids && 
  Array.isArray(session.instructor_ids) && 
  session.instructor_ids.includes(instructorId)
);
```

**Step 3: Enrich with Instructor Names**
- Fetches instructor details (name, ID) for all instructors in each session
- Allows display of co-instructors if multiple instructors teach the session

```typescript
const extendedSessions = await Promise.all(
  filteredSessions.map(async (session) => {
    let instructors: Array<{ id: string; name: string }> | undefined;
    
    if (session.instructor_ids && session.instructor_ids.length > 0) {
      const { data: instructorData } = await supabase
        .from('instructors')
        .select('id, name')
        .in('id', session.instructor_ids);
      
      instructors = instructorData || [];
    }
    
    return {
      ...session,
      instructors,
      course: session.courses,
      room: session.rooms,
    };
  })
);
```

#### Caching

The function now includes a 5-minute cache to improve performance:

```typescript
const cacheKey = `teacher-${instructorId}-${startDate}-${endDate}`;
const cached = scheduleCache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
  return { sessions: cached.data, error: null };
}

// ... fetch and cache results
scheduleCache.set(cacheKey, {
  data: extendedSessions,
  timestamp: Date.now(),
});
```

---

### 3. **View Component: ViewScheduleScreen**

File: `screens/ViewScheduleScreen.tsx`

#### Authentication & Authorization

```typescript
const { userProfile, isStudent, isTeacher, instructor } = useAuth();
```

- `isTeacher`: Boolean flag indicating if the user is a teacher
- `instructor`: Object containing instructor ID and related data from the `instructors` table

#### Schedule Fetching

The component adapts based on user role:

```typescript
if (isStudent && userProfile.id) {
  // Fetch student schedule by enrollment
  const result = await getStudentSchedule(
    userProfile.id,
    userProfile.university_id,
    startDateStr,
    endDateStr
  );
} else if (isTeacher && instructor?.id) {
  // Fetch teacher schedule by instructor ID
  const result = await getTeacherSchedule(
    instructor.id,                    // Use instructor ID from auth context
    userProfile.university_id,
    startDateStr,
    endDateStr
  );
}
```

#### Date Range Configuration

For teachers, the component now:
1. **Tries to fetch from academic calendar** - Gets semester dates from `academic_calendar` table
2. **Falls back to default range** - Uses ±3 months from today if calendar not found

```typescript
if (isTeacher) {
  // Try academic calendar first
  const { data: calendar } = await supabase
    .from('academic_calendar')
    .select('semester_start_date, semester_end_date')
    .eq('university_id', userProfile?.university_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (calendar) {
    // Use calendar dates
  } else {
    // Fallback: ±3 months from today
    const start = new Date(today);
    start.setMonth(today.getMonth() - 3);
    const end = new Date(today);
    end.setMonth(today.getMonth() + 3);
  }
}
```

#### Display Modes

The component supports two view modes:

**Daily View (Default)**
- Shows classes for a single selected date
- Horizontal date scroller for quick navigation
- Displays full class details (time, location, instructors, etc.)

**Weekly View**
- Shows classes for the current week (Mon-Sun)
- Organized by day with minimal information
- Quick status indicator (U for Upcoming, O for Ongoing)

---

## Usage Example

### For Students:

```typescript
// User is logged in as a student
const { userProfile, isStudent } = useAuth();

// ViewScheduleScreen automatically:
// 1. Checks userProfile.semester_id
// 2. Finds all sections the student is enrolled in
// 3. Fetches lectures for those sections
```

### For Teachers:

```typescript
// User is logged in as a teacher
const { userProfile, isTeacher, instructor } = useAuth();

// ViewScheduleScreen automatically:
// 1. Gets instructor.id from auth context
// 2. Fetches all lectures where instructor_ids contains this instructor
// 3. Displays the combined schedule
```

---

## Multiple Instructors

The system supports **co-teaching scenarios** where multiple instructors teach a single lecture session:

```json
{
  "id": "session-123",
  "course": { "name": "Advanced Database Systems", "code": "CS301" },
  "instructor_ids": ["instructor-1", "instructor-2"],
  "instructors": [
    { "id": "instructor-1", "name": "Dr. Smith" },
    { "id": "instructor-2", "name": "Prof. Johnson" }
  ]
}
```

Each instructor will see this session in their schedule, and both names will be displayed.

---

## Data Types

### LectureSessionExtended

```typescript
interface LectureSessionExtended {
  id: string;
  university_id: string;
  course_id: string;
  section_id: string;
  room_id: string | null;
  instructor_ids: string[];          // Array of UUID strings
  session_date: string;               // YYYY-MM-DD
  start_time: string;                 // HH:mm:ss
  end_time: string;                   // HH:mm:ss
  session_status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_active: boolean;
  is_cancelled: boolean;
  
  // Related data
  course?: { id: string; code: string; name: string };
  room?: { id: string; room_number: string; room_name: string; building?: { id: string; name?: string } };
  instructors?: Array<{ id: string; name: string }>;
}
```

---

## Performance Considerations

### 1. **Caching**
- 5-minute cache for schedule data reduces Supabase API calls
- Cache key includes: `teacher-{instructorId}-{startDate}-{endDate}`
- Separate from student schedule cache

### 2. **Query Optimization**
- Single SQL query to fetch all sessions (not per-section)
- Includes JOINs for courses and rooms in one query
- Date filtering at database level

### 3. **Concurrent Requests**
- Instructor name fetching is parallelized with `Promise.all()`
- Fetches instructor data for all sessions in a single batch query

---

## Logging and Debugging

The implementation includes detailed console logging:

```
[Schedule Service] ========================================
[Schedule Service] 🔍 TEACHER SCHEDULE QUERY PARAMETERS:
[Schedule Service]   - instructorId: a1b2c3d4...
[Schedule Service]   - universityId: e5f6g7h8...
[Schedule Service]   - dateRange: 2026-02-27 to 2026-05-28
[Schedule Service] ========================================
[Schedule Service] STEP 1: Querying lecture_sessions for instructor...
[Schedule Service]   ✓ Query result: Found 45 total lecture sessions
[Schedule Service] STEP 2: Filtering sessions where instructor_ids contains...
[Schedule Service]   ✓ Filter result: 12 sessions assigned to this instructor
[Schedule Service] STEP 3: Enriching sessions with instructor details...
[Schedule Service]   ✓ Enrichment complete
[Schedule Service] ✓ Successfully retrieved 12 sessions
```

---

## Common Issues & Solutions

### Issue 1: Teacher sees no classes
**Solution**: 
- Verify instructor_ids in lecture_sessions table contains the teacher's instructor ID
- Check instructor.id is correctly set in auth context
- Verify is_active=true and is_cancelled=false for sessions

### Issue 2: Co-instructor names not displaying
**Solution**:
- Verify all UUIDs in instructor_ids array exist in instructors table
- Check that instructor records have name field populated

### Issue 3: Performance is slow
**Solution**:
- Check if schedule cache is working (5-minute TTL)
- Verify database indexes on session_date, university_id, section_id
- Monitor concurrent API calls during enrichment step

---

## Related Files

- `lib/schedule-service.ts` - Service functions
- `screens/ViewScheduleScreen.tsx` - Main UI component
- `components/SessionBlock.tsx` - Individual session card component
- `context/AuthContext.tsx` - Authentication and instructor data
- `TABLES_SCHEMA.sql` - Database schema definition

---

## Future Enhancements

1. **RPC-based filtering**: Use PostgreSQL RPC function for array filtering at database level
2. **Week/Day customization**: Allow teachers to set preferred date ranges
3. **Schedule export**: Export schedule to calendar formats (iCal, Google Calendar)
4. **Team schedules**: View combined schedules of multiple instructors
5. **Conflict detection**: Alert when instructor has overlapping sessions

---

## Testing Checklist

- [ ] Teacher can login and see profile
- [ ] Instructor data loads from instructors table
- [ ] Schedule loads for date range (30 days past to 90 days future)
- [ ] Classes filtered correctly by instructor_ids
- [ ] Co-instructor names display correctly
- [ ] Daily view shows selected date classes
- [ ] Weekly view shows current week classes
- [ ] Pull-to-refresh updates schedule
- [ ] Cache expires after 5 minutes and refreshes
- [ ] Error states display meaningful messages
- [ ] Date navigation works correctly


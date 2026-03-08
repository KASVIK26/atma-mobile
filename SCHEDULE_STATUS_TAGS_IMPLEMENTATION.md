# Schedule Status Tags Implementation Guide

## Overview
Sessions now include a `displayStatus` field that is automatically calculated and time-dependent:
- **`upcoming`** - Session hasn't started yet
- **`ongoing`** - Session is currently happening
- **`completed`** - Session has ended

This applies to **BOTH student and teacher schedules** equally.

## How It Works

### Status Calculation Logic (Time-Based)
The `calculateSessionDisplayStatus()` function in `schedule-service.ts` determines status:

1. **If session date is in the past** → `completed`
2. **If session date is in the future** → `upcoming`
3. **If session date is today**:
   - If current time > session end time → `completed`
   - If current time < session start time → `upcoming`
   - If current time is between start and end → `ongoing`

### Examples
```
Today: 2026-02-27 10:00 AM

Session A: 2026-02-26 09:00-11:00 (yesterday)
→ displayStatus = 'completed'

Session B: 2026-02-27 08:00-09:00 (already ended today)
→ displayStatus = 'completed'

Session C: 2026-02-27 09:30-11:30 (happening now)
→ displayStatus = 'ongoing'

Session D: 2026-02-27 12:00-13:30 (later today)
→ displayStatus = 'upcoming'

Session E: 2026-02-28 09:00-11:00 (tomorrow)
→ displayStatus = 'upcoming'
```

## Using in ViewScheduleScreen

### 1. Access the Status
```typescript
const session = sessions[0];
const status = session.displayStatus; // 'completed' | 'ongoing' | 'upcoming'
```

### 2. Style Based on Status
```typescript
const getStatusColor = (status: 'completed' | 'ongoing' | 'upcoming') => {
  switch (status) {
    case 'completed':
      return '#888888'; // gray
    case 'ongoing':
      return '#FF6B00'; // orange
    case 'upcoming':
      return '#4CAF50'; // green
    default:
      return '#888888';
  }
};

const statusColor = getStatusColor(session.displayStatus);
```

### 3. Display Status Badge
```typescript
<View style={styles.statusBadge}>
  <Text style={[
    styles.statusText,
    { color: getStatusColor(session.displayStatus) }
  ]}>
    {session.displayStatus.toUpperCase()}
  </Text>
</View>
```

### 4. Complete Example in Render
```typescript
{sessions.map((session) => (
  <View key={session.id} style={styles.sessionCard}>
    {/* Status Tag */}
    <View style={styles.sessionHeader}>
      <Text style={styles.courseName}>{session.course?.name}</Text>
      <Text style={[
        styles.statusTag,
        {
          color: session.displayStatus === 'completed' ? '#888888'
                : session.displayStatus === 'ongoing' ? '#FF6B00'
                : '#4CAF50'
        }
      ]}>
        {session.displayStatus.toUpperCase()}
      </Text>
    </View>

    {/* Time */}
    <Text style={styles.time}>
      {session.start_time} - {session.end_time}
    </Text>

    {/* Other Details */}
    <Text style={styles.room}>{session.room?.room_name || 'TBA'}</Text>
  </View>
))}
```

## Important Notes

### ✅ Status is Calculated in Real-Time
- Not cached based on time - recalculated fresh each fetch
- Updates automatically as time progresses
- No need to refresh manually for status changes

### ✅ Works for Both Student and Teacher Schedules
- Same `calculateSessionDisplayStatus()` function used for both
- Status tags will show correctly whether viewing student or teacher schedule
- Role-specific filtering still works (student sees enrollments, teacher sees assigned lectures)

### ✅ Database-Level Filtering Unchanged
The following still only run on role-specific basis:
- **Student schedule**: Filters by `student_enrollments` → `section_id`
- **Teacher schedule**: Filters by `instructor_ids` array
- These filters happen in the service layer (schedule-service.ts)
- UI just displays the results with status tags

### ✅ Cache Still Works Normally
- Service-level cache is still 5 minutes
- Data refresh fetches latest sessions
- `displayStatus` is recalculated on each render (not cached)

## Integration Steps

1. ✅ **Service Layer** - Already updated `schedule-service.ts`
   - `calculateSessionDisplayStatus()` function created
   - Both `getStudentSchedule()` and `getTeacherSchedule()` now include `displayStatus`
   - `LectureSessionExtended` interface updated with `displayStatus` field

2. **UI Layer** - Update ViewScheduleScreen.tsx
   - Import the status colors/logic
   - Add status badge to session rendering
   - Style tags based on status value
   - No query changes needed - data already includes status

3. **Testing**
   - View schedule as student → status tags should show
   - View schedule as teacher → status tags should show
   - Go back tomorrow → status should update
   - Check "ongoing" sessions at time they're happening

## Related Code

### Function: `calculateSessionDisplayStatus()`
Location: `lib/schedule-service.ts` lines 145-184

### Updated Interfaces
- `LectureSessionExtended` now includes `displayStatus?: 'completed' | 'ongoing' | 'upcoming'`

### Updated Functions
- `getStudentSchedule()` - adds displayStatus in enrichment step
- `getTeacherSchedule()` - adds displayStatus in enrichment step

## No Breaking Changes
- Student schedule code remains completely untouched in logic
- Teacher schedule RLS policies now fixed with V4 subquery approach
- Status is additive - doesn't change existing data structure
- Both schedules use identical status calculation logic

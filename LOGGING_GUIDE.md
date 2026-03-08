# Schedule Loading - Detailed Logging Guide

## Overview
The schedule loading process now includes comprehensive console logging at every step. This guide explains what each log means and how to debug issues.

---

## Console Log Flow

### 1. **Initial Load / Component Mount**

```
[ViewScheduleScreen] useEffect triggered - deps changed: 
  userProfile=true, 
  isStudent=true, 
  isTeacher=false, 
  instructor=false
```
**Meaning**: The component has mounted or dependencies changed. The schedule fetch is about to start.

---

### 2. **Fetch Initialization**

```
[ViewScheduleScreen] fetchSchedule called - 
  showLoading: true, 
  userProfile: true, 
  isStudent: true, 
  isTeacher: false
[ViewScheduleScreen] ⏳ Setting isLoading = true
```

**Meaning**: 
- `fetchSchedule` function is being called
- `showLoading=true` means the UI will show the loading spinner
- User profile exists and role is correctly detected

---

### 3. **Date Range Calculation**

```
[ViewScheduleScreen] 📅 Date range: 2026-01-26 to 2026-05-25 (120 days)
[ViewScheduleScreen] 🏠 Cache key: 8a3b5c2f-a1b2-4c5d-...
```

**Meaning**: 
- Data will be fetched for 120 days (30 days back + 90 days forward)
- Cache key helps identify if this is a new request or update
- Optimal range for performance: 30 past + 90 future

---

### 4. **Student Schedule Fetching**

```
[ViewScheduleScreen] 👨‍🎓 Fetching STUDENT schedule for user: 8a3b5c2f...
[ViewScheduleScreen] Student schedule fetch: 450ms
```

**Timeline**:
- Request starts
- Returns in ~450ms (typical network latency)

```
[Schedule Service] Fetching student schedule for: 8a3b5c2f...
[Schedule Service] University: 755283d3...
[Schedule Service] Date range: 2026-01-26 to 2026-05-25
[Schedule Service] Found 3 active enrollments
[Schedule Service] Sample enrollments (first 2): [
  {
    "section_id": "0c7465ee-aaee-43a9-b29e-d886a37802aa",
    "batch": 2
  },
  {
    "section_id": "25b89aba-c39f-48ab-ad01-e19e27f39c92",
    "batch": 1
  }
]
[Schedule Service] Fetching sessions for 3 section(s)
```

**Meaning**:
- Found 3 sections the student is enrolled in
- Will fetch lecture sessions for these 3 sections
- Shows first 2 enrollments as sample

---

### 5. **Lecture Sessions Retrieved**

```
[Schedule Service] Retrieved 12 lecture sessions
[Schedule Service] Sample sessions (first 2): [
  {
    "id": "sess-001",
    "course": "Introduction to Psychology",
    "code": "PSY-101",
    "date": "2026-02-25",
    "time": "09:00:00 - 10:30:00",
    "room": "Room 301",
    "building": "Building A",
    "status": "scheduled",
    "instructorIds": 1
  },
  {
    "id": "sess-002",
    "course": "Calculus II",
    "code": "MAT-202",
    "date": "2026-02-25",
    "time": "11:00:00 - 12:30:00",
    "room": "Room 105",
    "building": "Building C",
    "status": "scheduled",
    "instructorIds": 1
  }
]
```

**Meaning**:
- 12 total sessions found for the date range
- Each session shows full details (room, building, status)
- `instructorIds: 1` means 1 instructor teaching the session

---

### 6. **Instructor Information Loading**

```
[Schedule Service] Enriching sessions with instructor details...
[Schedule Service] Fetching instructors for 12 sessions...
```

**Meaning**: 
- Now looking up instructor names from the instructors table
- All 12 sessions have instructor_ids to resolve

---

### 7. **Data Conversion**

```
[ViewScheduleScreen] ✅ Loaded 12 sessions successfully
[ViewScheduleScreen] 📊 Sample sessions: [
  {
    "course": "Introduction to Psychology",
    "date": "2026-02-25",
    "time": "09:00-10:30"
  },
  {
    "course": "Calculus II",
    "date": "2026-02-25",
    "time": "11:00-12:30"
  }
]
[ViewScheduleScreen] Converting 12 sessions to UI format...
[ViewScheduleScreen] Sample conversion: Introduction to Psychology at 09:00:00
[ViewScheduleScreen] ✏️ Converted 12 classes for UI
```

**Meaning**:
- All 12 sessions successfully fetched
- Raw session data shown with course name + time
- Converting to UI format now
- Shows first sample conversion

---

### 8. **Render View Selection**

#### Daily View:
```
[ViewScheduleScreen.renderDailyView] Rendering daily view with data
[ViewScheduleScreen.renderDailyView] Rendering 3 sessions for Feb 25, 2026
```

**Meaning**: 
- 3 sessions scheduled for the selected date (Feb 25)
- Daily view is rendering those 3 sessions

#### Weekly View:
```
[ViewScheduleScreen.renderWeeklyView] Rendering weekly view: Sun Feb 22, 2026 to Sat Feb 28, 2026, total days: 7
[ViewScheduleScreen.renderWeeklyView] Total sessions: 12, grouped by day: 5 days with classes
[ViewScheduleScreen.renderWeeklyView] Week sample - Day 0 (SUN Feb 22): 0 classes
```

**Meaning**:
- Showing full week view
- 12 sessions distributed across 5 days
- Some days have no classes (Sat/Sun)

---

### 9. **Session Block Rendering**

```
[SessionBlock] Rendering session Introduction to Psychology - 
  Room: Room 301, 
  Building: Building A
```

**Meaning**: 
- Individual session card is rendering
- Shows course name, room, and building info

---

### 10. **Completion & State Reset**

```
[ViewScheduleScreen] 🔙 Fetch completed - setting loading states to false
[ViewScheduleScreen] ⏳ Setting isLoading = false
```

**Meaning**: 
- Fetch is complete
- Loading spinner will disappear
- UI should now show the schedule

---

## Pull-to-Refresh Flow

```
[ViewScheduleScreen] 🔄 User triggered pull-to-refresh
[ViewScheduleScreen] Refresh duration: 320ms
[ViewScheduleScreen] 👨‍🎓 Fetching STUDENT schedule for user: 8a3b5c2f...
[Schedule Service] Found 3 active enrollments
...
[ViewScheduleScreen] ✅ Loaded 12 sessions successfully
[ViewScheduleScreen] 🔙 Fetch completed - setting loading states to false
```

**Meaning**:
- User dragged down to refresh
- Fetches latest data in background (~320ms)
- Shows spinner only during refresh (not full load)
- Automatically dismisses spinner when done

---

## Error Scenarios

### No Active Enrollments (Student)

```
[Schedule Service] Found 0 active enrollments
[Schedule Service] ⚠️ No active enrollments found for student
[ViewScheduleScreen] Loaded 0 sessions successfully
[ViewScheduleScreen.renderDailyView] Rendering 0 sessions for Feb 25, 2026
```

**Fix**: Student needs to enroll in a course section through admin panel

---

### Missing Instructor ID (Teacher)

```
[ViewScheduleScreen] 👨‍🏫 Fetching TEACHER schedule for instructor: undefined
[ViewScheduleScreen] ⚠️ Teacher logged in but instructor ID not available yet
[ViewScheduleScreen] Error state: Instructor information is still loading. Please try again.
```

**Fix**: Instructor profile needs to be linked to user account in the users table

---

### Network Error

```
[ViewScheduleScreen] ❌ Schedule fetch error: {
  "code": "ENOTFOUND",
  "message": "Failed to connect to database"
}
[ViewScheduleScreen] ❌ Unexpected error during fetch: Error: Network request failed
```

**Fix**: Check internet connection, Supabase service status, or API key

---

### Database Column Missing

```
[Schedule Service] ❌ Error fetching student schedule: {
  "code": "42703",
  "message": "column student_enrollments.course_id does not exist"
}
[ViewScheduleScreen] ❌ Unexpected error during fetch: Error: column student_enrollments.course_id does not exist
```

**Fix**: Run TABLES_SCHEMA.sql to update database schema

---

## Performance Metrics to Track

```
[ViewScheduleScreen] Student schedule fetch: 450ms
[ViewScheduleScreen] Refresh duration: 320ms
```

**Expected Performance**:
- Initial load: 800ms - 1500ms (includes Supabase connection)
- Refresh: 200ms - 500ms (background)
- Rendering: 50-200ms (UI update)

**Performance Issues**:
- > 2000ms: Slow network or large dataset
- Stuck at "Loading...": Check if any fetch function is missing finally block

---

## Quick Debug Checklist

When schedule is stuck loading:

1. **Check Loading Log**
   ```
   [ViewScheduleScreen] ⏳ Setting isLoading = true
   ```
   If you see this but no "✅ Loaded X sessions", fetch might be hanging

2. **Check for Errors**
   ```
   [Schedule Service] ❌ Error fetching...
   [ViewScheduleScreen] ❌ Unexpected error...
   ```
   Look for specific error messages

3. **Verify Completion**
   ```
   [ViewScheduleScreen] 🔙 Fetch completed - setting loading states to false
   ```
   If missing, fetch didn't complete or error occurred

4. **Check Session Count**
   ```
   [ViewScheduleScreen] ✅ Loaded 12 sessions successfully
   ```
   If this shows 0, check enrollments or session dates

5. **Verify View is Rendering**
   ```
   [ViewScheduleScreen.renderDailyView] Rendering 3 sessions for Feb 25, 2026
   ```
   If missing, data exists but view didn't render

---

## Log Breakpoints for Debugging

### Check if fetch started
```
console.log('[ViewScheduleScreen] fetchSchedule called')
```

### Check if data was retrieved
```
console.log('[ViewScheduleScreen] ✅ Loaded X sessions successfully')
```

### Check if view is rendering first session
```
console.log('[SessionBlock] Rendering session...')
```

### Check loading state being cleared
```
console.log('[ViewScheduleScreen] 🔙 Fetch completed')
```

---

## Console Output Keywords

| Emoji | Meaning |
|-------|---------|
| ⏳ | Loading/Processing started |
| ✅ | Success |
| ❌ | Error occurred |
| ⚠️ | Warning/Caution |
| 🔄 | Refresh/Retry |
| 👨‍🎓 | Student action |
| 👨‍🏫 | Teacher action |
| 🏠 | System/General |
| 📅 | Date/Time related |
| 📊 | Data/Statistics |
| ✏️ | Conversion/Transform |
| 🔙 | Completion |

---

## Expected Output for Successful Load

```
[ViewScheduleScreen] useEffect triggered - deps changed: userProfile=true, isStudent=true, isTeacher=false, instructor=false
[ViewScheduleScreen] fetchSchedule called - showLoading: true, userProfile: true, isStudent: true, isTeacher: false
[ViewScheduleScreen] ⏳ Setting isLoading = true
[ViewScheduleScreen] 📅 Date range: 2026-01-26 to 2026-05-25 (120 days)
[ViewScheduleScreen] 🏠 Cache key: 8a3b5c2f-a1b2-4c5d-...
[ViewScheduleScreen] 👨‍🎓 Fetching STUDENT schedule for user: 8a3b5c2f...
[ViewScheduleScreen] Student schedule fetch: 450ms
[Schedule Service] Fetching student schedule for: 8a3b5c2f...
[Schedule Service] University: 755283d3...
[Schedule Service] Date range: 2026-01-26 to 2026-05-25
[Schedule Service] Found 3 active enrollments
[Schedule Service] Sample enrollments (first 2): [...]
[Schedule Service] Fetching sessions for 3 section(s)
[Schedule Service] Retrieved 12 lecture sessions
[Schedule Service] Sample sessions (first 2): [...]
[Schedule Service] Enriching sessions with instructor details...
[Schedule Service] ✓ Successfully retrieved 12 sessions
[ViewScheduleScreen] ✅ Loaded 12 sessions successfully
[ViewScheduleScreen] Converting 12 sessions to UI format...
[ViewScheduleScreen] ✏️ Converted 12 classes for UI
[ViewScheduleScreen.renderDailyView] Rendering daily view with data
[ViewScheduleScreen.renderDailyView] Rendering 3 sessions for Feb 25, 2026
[SessionBlock] Rendering session Introduction to Psychology - Room: Room 301, Building: Building A
[ViewScheduleScreen] 🔙 Fetch completed - setting loading states to false
```

This indicates everything loaded successfully!

---

**Last Updated**: February 25, 2026
**Status**: ✅ Comprehensive Logging Complete

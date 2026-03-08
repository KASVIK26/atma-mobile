## TEACHER SCHEDULE FIX - QUICK ACTION GUIDE

### Summary
Database has 305 lectures assigned to your teacher, but app shows 0. This is an **RLS policy issue**.

---

## 🚀 Quick Fix (5 minutes)

### Step 1: Run Diagnostic Test
In Expo dev console, run:
```javascript
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```

**Expected output:**
```
✅ Found 305 sessions
✅ Found 305 sessions for this instructor
✅ SUCCESS: Everything is working!
```

**Actual likely output:**
```
✅ Query returned 0 sessions
❌ PROBLEM IDENTIFIED: Query returned 0 sessions!
   Likely causes:
   1. RLS policy blocks read access
```

---

### Step 2: Check RLS Policy in Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run this query:
```sql
SELECT policyname, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'lecture_sessions' 
ORDER BY policyname;
```

**What you're looking for:**
- Is there a policy that only allows students to read?
- Does it check `section_id IN (SELECT section_id FROM student_enrollments ...)`?
- Is there NO policy for teachers?

---

### Step 3: Apply the Fix

**Option A: Better RLS Policy** (Recommended)

In Supabase SQL Editor, run:

```sql
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Students can view their section lectures" ON lecture_sessions;
DROP POLICY IF EXISTS "Allow students to read lectures" ON lecture_sessions;

-- Create new policy that allows teachers + students
CREATE POLICY "Access control for lecture sessions"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND is_cancelled = false
    AND (
      -- Allow students to see their enrolled section's lectures
      section_id IN (
        SELECT section_id FROM student_enrollments 
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR
      -- Allow teachers to see lectures they're assigned to
      instructor_ids @> ARRAY[(
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() AND is_active = true
        LIMIT 1
      )]::uuid[]
    )
  );
```

---

**Option B: Quick 5-minute Fix** (If Option A fails)

In Supabase SQL Editor:

```sql
-- Disable RLS for testing
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;
```

Test if schedule now shows data. If yes, RLS was the issue.
Re-enable and apply Option A:

```sql
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
```

---

### Step 4: Verify the Fix

1. **Clear app cache:**
   - Restart Expo dev server
   - Clear Metro bundler cache (Ctrl+C, then `npm start -- -c`)

2. **Re-run diagnostic test:**
```javascript
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```

3. **Check app:**
   - Open View Schedule screen
   - Should now show lectures for the teacher

---

## 🔍 What Was Wrong

### The Problem
The RLS policy on `lecture_sessions` only allowed:
```sql
section_id IN (SELECT section_id FROM student_enrollments WHERE user_id = auth.uid())
```

This means ONLY students could view lectures. Teachers weren't in `student_enrollments`, so they got 0 results.

### The Solution
Add an OR clause for teachers:
```sql
instructor_ids @> ARRAY[teacher_instructor_id]::uuid[]
```

This allows teachers to view lectures where they're in the `instructor_ids` array.

---

## 📊 Expected Results After Fix

✅ View Schedule Screen
- Teachers see their assigned lectures
- Lectures grouped by date
- Shows course name, time, room, co-instructors
- Daily and Weekly views work

✅ Console Logs
```
[Schedule Service] ✓ Query result: Found 305 total lecture sessions
[Schedule Service] ✓ Filter result: 305 sessions assigned to this instructor
[ViewScheduleScreen] ✅ Loaded 305 sessions successfully
```

---

## 🆘 If It Still Doesn't Work

1. **Check user/instructor linking:**
```sql
SELECT u.id as user_id, u.email, i.id as instructor_id, i.name
FROM users u
LEFT JOIN instructors i ON i.user_id = u.id
WHERE u.id = '532bc75b-c907-4b8b-b675-661cba483195';
```
Should return 1 row with instructor_id filled.

2. **Check instructor_ids array format:**
```sql
SELECT id, instructor_ids, pg_typeof(instructor_ids) as type
FROM lecture_sessions
LIMIT 1;
```
Should show `uuid[]` type.

3. **Run manual filter test:**
```sql
SELECT COUNT(*)
FROM lecture_sessions
WHERE instructor_ids @> ARRAY['1bd061a5-6104-4fb1-b8b1-e5c65f60811a'::uuid];
```
Should return 305.

---

## 📞 Support

If you see different results, check:
- [TEACHER_SCHEDULE_DEBUG_GUIDE.md](TEACHER_SCHEDULE_DEBUG_GUIDE.md) - Detailed debugging
- [TEACHER_SCHEDULE_RLS_CHECK.sql](TEACHER_SCHEDULE_RLS_CHECK.sql) - RLS diagnostic queries
- [TEACHER_SCHEDULE_DIAGNOSTIC.sql](TEACHER_SCHEDULE_DIAGNOSTIC.sql) - Database diagnostic queries


## TEACHER SCHEDULE - ADVANCED TROUBLESHOOTING

### Current Status
❌ Still returning 0 sessions after first RLS fix attempt

---

## 🎯 Root Cause Analysis

### The Query Path
```
User (teacher) logs in
  ↓
auth.uid() = 532bc75b-c907-4b8b-b675-661cba483195
  ↓
getTeacherSchedule(instructor_id, university_id)
  ↓
Supabase Query with RLS policy check
  ↓
❌ Returns 0 sessions (PROBLEM)
```

### The RLS Policy Problem
Even though we fixed the type casting, the policy might still have issues:

**Old broken policies:**
```sql
((instructor_ids)::text[] @> ARRAY[(auth.uid())::text])  -- ❌ Fails
```

**Current policies (if applied):**
```sql
instructor_ids @> ARRAY[auth.uid()::uuid]  -- Should work but...
```

**The issue:** Even this might not work if:
1. The policy wasn't fully applied
2. There's a conflict with remaining old policies
3. Supabase cache issue
4. Type matching problem

---

## 🚀 SOLUTION: Apply Enhanced Fix V2

### What's Different
The V2 fix:
1. **Drops ALL policies first** (including admin and special ones)
2. **Creates fresh policies** with explicit type handling
3. **Separates policies** by role (cleaner, fewer conflicts)
4. **Tests immediately** with verification query

### Apply This Now

**In Supabase SQL Editor:**

1. Open: [TEACHER_SCHEDULE_RLS_FIX_V2.sql](TEACHER_SCHEDULE_RLS_FIX_V2.sql)
2. Copy entire content
3. Paste into Supabase
4. Click **RUN**
5. Look for: `SELECT 7 rows` (7 policies should exist after)

---

## 🧪 Test the Fix

### Step 1: Verify Policies Exist
In Supabase SQL Editor, run:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;
```

Should return (around 7 policies):
```
lecture_sessions_admin_access
lecture_sessions_delete  
lecture_sessions_instructor_insert
lecture_sessions_instructor_update
lecture_sessions_instructor_view        ← KEY ONE FOR TEACHERS
lecture_sessions_student_access
+ others...
```

### Step 2: Test in App Console

```javascript
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```

**Look for this output:**
```
✅ Found 1 instructor(s)
✅ Query returned 305 sessions      ← KEY: Changed from 0 to 305
✅ Found 305 sessions for this instructor
✅ SUCCESS: Everything is working!
```

**If it still shows 0:**
```
❌ Query returned 0 sessions
   Likely causes:
   1. 🔒 RLS policy blocks read access
```

---

## 🔍 If Still Failing: Deep Diagnosis

### Run This SQL Test
In Supabase SQL Editor:

```sql
-- Test 1: Does the policy exist?
SELECT policyname, qual 
FROM pg_policies 
WHERE tablename = 'lecture_sessions' 
  AND policyname = 'lecture_sessions_instructor_view';

-- Test 2: Can we query without RLS?
-- (This tests if data exists)
SELECT COUNT(*) as total_sessions
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false;

-- Test 3: Does instructor_ids contain any UUIDs?
SELECT id, instructor_ids, array_length(instructor_ids, 1) as count
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
LIMIT 3;

-- Test 4: Check instructor table
SELECT id, user_id, name
FROM instructors
WHERE id = '1bd061a5-6104-4fb1-b8b1-e5c65f60811a';
```

### Expected Results

**Test 1:** Should find the policy
```
lecture_sessions_instructor_view | (instructor_ids @> ARRAY[auth.uid()::uuid])
```

**Test 2:** Should show 305+ sessions exist
```
305
```

**Test 3:** Should show instructor_ids is populated
```
uuid[] | 1       ← Array of 1 UUID
```

**Test 4:** Should show instructor exists and is linked to user
```
1bd061a5... | 532bc75b... | Shri Surendra Gupta
```

---

## 🛠️ If Still 0: Advanced Fixes

### Option A: Check auth.uid() Matches

Supabase uses `auth.uid()` from JWT token. If it doesn't match what we expect:

```sql
-- Test if auth.uid() is being set correctly
-- (can only run as authenticated user via app)
-- In Supabase functions or RLS context

-- Create temp test function to debug
CREATE OR REPLACE FUNCTION test_auth_uid()
RETURNS text AS $$
BEGIN
  RETURN auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call from app to see what auth.uid() actually returns
-- SELECT test_auth_uid();
```

### Option B:Disable RLS Temporarily (FOR TESTING ONLY)

```sql
-- DISABLE RLS to test if it's the cause
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;

-- Now test query in app - if it works, RLS is the issue
-- If still 0, data doesn't exist or is filtered

-- RE-ENABLE when done
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
```

### Option C: Check Supabase Logs

In Supabase Dashboard:
1. Go to **Logs** → **API**
2. Look for queries to `lecture_sessions`
3. Check if there are RLS-related errors

---

## 📋 Complete Checklist

- [ ] Applied TEACHER_SCHEDULE_RLS_FIX_V2.sql
- [ ] Restarted Expo dev server (`npm start -- -c`)
- [ ] Ran testTeacherScheduleAccess() in console
- [ ] Verified policies exist in database
- [ ] Checked that instructor.user_id = logged-in user ID
- [ ] Verified instructor_ids array contains UUIDs
- [ ] Cleared browser cache (localStorage.clear())
- [ ] Checked Supabase logs for errors

---

## 🆘 Still Not Working?

### Try This Sequence

**1. Clear Everything**
```bash
# Terminal
cd c:\Users\vikas\atma-mobile
npm start -- -c  # Clear cache and restart
```

**2. In App Console**
```javascript
localStorage.clear();
sessionStorage.clear();
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```

**3. If Diagnostic Shows Different Error**
- Check error code/message
- Search TEACHER_SCHEDULE_DEBUG_GUIDE.md for that error
- Post error details and we'll fix it

---

## 🎚️ RLS Policy Complexity Levels

### Level 1: Simple (Students Only)
```sql
CREATE POLICY "student_view" ON lecture_sessions FOR SELECT
  USING (
    section_id IN (
      SELECT section_id FROM student_enrollments 
      WHERE user_id = auth.uid()
    )
  );
```
✅ Works for students  
❌ Teachers get 0

### Level 2: Add Teachers (What We're Doing)
```sql
CREATE POLICY "student_or_teacher" ON lecture_sessions FOR SELECT
  USING (
    -- Students
    section_id IN (SELECT section_id FROM student_enrollments WHERE user_id = auth.uid())
    OR
    -- Teachers
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );
```
✅ Works for both  
✅ Cleaner than multiple policies

### Level 3: Complex Separate Policies (V2 Approach)
```sql
CREATE POLICY "student" ... USING (...);
CREATE POLICY "teacher" ... USING (instructor_ids @> ARRAY[auth.uid()::uuid]);
CREATE POLICY "admin" ... USING (...);
```
✅ Best for debugging  
✅ Easier to maintain

---

## Next Steps

1. **Apply V2 fix** from [TEACHER_SCHEDULE_RLS_FIX_V2.sql](TEACHER_SCHEDULE_RLS_FIX_V2.sql)
2. **Run diagnostic** in app console
3. **Check results** - should show 305 sessions
4. **Clear cache** and restart app
5. **Open View Schedule** - should show lectures

If still issues, come back with the diagnostic output and we'll debug from there!


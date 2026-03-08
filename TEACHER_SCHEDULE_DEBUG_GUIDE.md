## TEACHER SCHEDULE DEBUGGING GUIDE

### Problem Summary
- ✅ Database has 305 lecture sessions assigned to instructor `1bd061a5-6104-4fb1-b8b1-e5c65f60811a` in date range
- ❌ Supabase query returns 0 results
- **Root Cause**: Likely **RLS (Row Level Security) policy** blocking teacher access

---

## Step 1: Identify the RLS Policy Issue

Run this in Supabase backend to check RLS policies:

```sql
-- Check what RLS policies exist on lecture_sessions
SELECT policyname, qual, permissive, roles
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;
```

### Common RLS Policy Issues

#### Issue A: Policy only allows students to view sessions
```sql
-- CURRENT (BROKEN) POLICY - only checks if user is in student_enrollments
CREATE POLICY "Students can view their section lectures"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    section_id IN (
      SELECT section_id FROM student_enrollments 
      WHERE user_id = auth.uid()
    )
  );
```

**Problem**: Teachers aren't in `student_enrollments`, so they can't see ANY lectures, even those they teach!

---

## Step 2: Fix the RLS Policy

### Solution: Add OR condition for teachers/instructors

Replace the broken policy with:

```sql
-- DROP EXISTING POLICY
DROP POLICY IF EXISTS "Students can view their section lectures" ON lecture_sessions;

-- CREATE NEW POLICY that allows:
-- 1. Students to see their enrolled section lectures
-- 2. Teachers to see lectures they're assigned to
-- 3. Admins to see all lectures (optional)

CREATE POLICY "Access control for lecture sessions"
  ON lecture_sessions FOR SELECT
  to authenticated, anon
  USING (
    is_active = true
    AND (
      -- Allow students to see their section's lectures
      section_id IN (
        SELECT section_id FROM student_enrollments 
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR
      -- Allow teachers/instructors to see lectures they teach
      -- Fetch instructor_id from instructors table where user_id matches
      id IN (
        SELECT ls.id FROM lecture_sessions ls
        WHERE ls.instructor_ids @> ARRAY[(
          SELECT id FROM instructors 
          WHERE user_id = auth.uid() 
          LIMIT 1
        )]::uuid[]
      )
      OR
      -- Allow admins to see everything (optional - remove if not needed)
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
```

---

## Step 3: Simpler Alternative (If Above Doesn't Work)

If the policy is complex, use a simpler approach:

```sql
-- DROP old policy
DROP POLICY IF EXISTS "Access control for lecture sessions" ON lecture_sessions;

-- Create separate policies for different roles
CREATE POLICY "select_for_students"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND section_id IN (
      SELECT section_id FROM student_enrollments 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "select_for_teachers"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND instructor_ids @> ARRAY[(
      SELECT id FROM instructors 
      WHERE user_id = auth.uid()
      LIMIT 1
    )]::uuid[]
  );

CREATE POLICY "select_for_admins"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Step 4: Test the Fix

After applying the RLS policy fix, run this to verify:

```sql
-- Clear Supabase cache by doing a timestamp-based request
SELECT COUNT(*) 
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28'
  AND instructor_ids @> ARRAY['1bd061a5-6104-4fb1-b8b1-e5c65f60811a'::uuid];
```

Should return: **305 sessions**

---

## Step 5: Test in the App

1. **Clear app cache**: Force refresh by pulling down in schedule screen
2. **Check logs** for these expected logs:
   ```
   [Schedule Service]   ✓ Query result: Found 305 total lecture sessions
   [Schedule Service]   ✓ Filter result: 305 sessions assigned to this instructor
   ```
3. **Verify UI** shows sessions for instructor

---

## Alternative: Disable RLS (NOT RECOMMENDED for production)

If you need a quick fix for testing:

```sql
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;
```

Then test. If it works, the issue is RLS. Re-enable and fix the policy:

```sql
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
```

---

## Step 6: Verify Supabase Client Can Access

Create a test endpoint to debug:

```typescript
// lib/test-teacher-schedule.ts
import supabase from '@/lib/supabase';

export async function testTeacherScheduleAccess(userId: string) {
  try {
    console.log('🧪 Testing teacher schedule access for user:', userId);

    // Step 1: Get instructor data
    const { data: instructors, error: instError } = await supabase
      .from('instructors')
      .select('id, name')
      .eq('user_id', userId);

    console.log('Step 1 - Instructors:', instructors);
    if (instError) console.error('Error:', instError);

    if (!instructors?.[0]) {
      console.warn('❌ No instructor found for user');
      return;
    }

    const instructorId = instructors[0].id;
    console.log('Found instructor ID:', instructorId);

    // Step 2: Try to fetch lectures
    const { data: sessions, error: sessError } = await supabase
      .from('lecture_sessions')
      .select('id, course_id, session_date, instructor_ids')
      .eq('university_id', '755283d3-80d9-4a86-b657-9974694f9f43')
      .eq('is_active', true)
      .eq('is_cancelled', false)
      .gte('session_date', '2026-01-28')
      .lte('session_date', '2026-05-28')
      .limit(5);

    console.log('Step 2 - Sessions returned:', sessions?.length ?? 0);
    if (sessError) console.error('Query Error:', sessError);

    if (sessions && sessions.length > 0) {
      console.log('✅ SUCCESS: Found sessions:', sessions);
      
      // Step 3: Check filtering
      const filtered = sessions.filter(s => 
        s.instructor_ids?.includes(instructorId)
      );
      console.log('Filtered sessions for instructor:', filtered.length);
    } else {
      console.warn('⚠️ No sessions returned - likely RLS policy blocking access');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}
```

Run in app console:
```typescript
import { testTeacherScheduleAccess } from '@/lib/test-teacher-schedule';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195');
```

---

## Common Solutions Summary

| Issue | Solution |
|-------|----------|
| RLS blocks teacher access | Add `instructor_ids @> ARRAY[instructor_id]` condition to RLS policy |
| Instructor not linked to user | Ensure `instructors.user_id` = logged-in user |
| Supabase not updated | Clear browser cache, restart app |
| Wrong instructor ID | Check `instructor.id` vs `user.id` difference |
| Date range wrong | Adjust semester fetch logic for teachers |

---

## Files to Check

Run diagnostics in this order:
1. `TEACHER_SCHEDULE_RLS_CHECK.sql` - Check policies
2. Test query in Supabase dashboard
3. Run `testTeacherScheduleAccess(userId)` in app
4. Check network tab for API response


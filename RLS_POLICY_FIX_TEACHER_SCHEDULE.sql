## TEACHER SCHEDULE - RLS POLICY FIX

### Root Cause
The `lecture_sessions` table has an RLS policy that **only allows students** to read lectures based on their section enrollment. Teachers aren't in `student_enrollments`, so they see 0 results.

---

## The Broken Policy

```sql
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

**Problem:** Teachers have `instructor_ids` array, not `student_enrollments` rows.

---

## The Fixed Policy

### Option 1: Single Combined Policy (Recommended)

```sql
DROP POLICY IF EXISTS "Students can view their section lectures" ON lecture_sessions;

CREATE POLICY "Access control for lecture sessions"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND is_cancelled = false
    AND (
      -- ✅ STUDENTS: Can see lectures for their enrolled section
      section_id IN (
        SELECT section_id FROM student_enrollments 
        WHERE user_id = auth.uid() 
          AND is_active = true
      )
      OR
      -- ✅ TEACHERS: Can see lectures they're teaching
      --    (instructor_ids array contains their instructor ID)
      instructor_ids @> ARRAY[(
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
          AND is_active = true
        LIMIT 1
      )]::uuid[]
      OR
      -- ✅ ADMINS: Can see all lectures (optional)
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
          AND role = 'admin'
      )
    )
  );
```

---

### Option 2: Separate Policies (If you prefer)

```sql
DROP POLICY IF EXISTS "Students can view their section lectures" ON lecture_sessions;

-- For Students
CREATE POLICY "students_view_lectures"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND is_cancelled = false
    AND section_id IN (
      SELECT section_id FROM student_enrollments 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- For Teachers  ⭐ THIS IS THE NEW ONE NEEDED
CREATE POLICY "teachers_view_lectures"
  ON lecture_sessions FOR SELECT
  to authenticated
  USING (
    is_active = true
    AND is_cancelled = false
    AND instructor_ids @> ARRAY[(
      SELECT id FROM instructors 
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )]::uuid[]
  );

-- For Admins (optional)
CREATE POLICY "admins_view_all_lectures"
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

## How to Apply the Fix

### In Supabase Dashboard:

1. Open **SQL Editor**
2. Copy and paste **Option 1** (full policy)
3. Click **Run**
4. If successful, you'll see `0 rows affected` (policies don't return rows)

---

## Verify the Fix

### Step 1: Test via SQL
```sql
-- This should now return 305 sessions
SELECT COUNT(*)
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28';
```

### Step 2: Test via App Console
```javascript
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```

Expected:
```
✅ Found 305 sessions
✅ Found 305 sessions for this instructor
✅ SUCCESS: Everything is working!
```

### Step 3: Test in App UI
- Open View Schedule screen
- Should show multiple lecture sessions
- Dates should range from Jan 28, 2026 onwards
- Courses should be visible

---

## Understanding the Fix

### Key Concept: UUID Array Containment

The PostgreSQL operator `@>` checks if an array contains elements:

```sql
-- Does instructor_ids contain this instructor's ID?
instructor_ids @> ARRAY['1bd061a5-6104-4fb1-b8b1-e5c65f60811a'::uuid]
```

This is perfect for the `instructor_ids` UUID array in lecture_sessions.

### The Process:

1. **Get current user's ID** from `auth.uid()` (comes from JWT token)
2. **Find their instructor record** via `instructors` table where `user_id = auth.uid()`
3. **Check if their instructor ID is in** the session's `instructor_ids` array
4. **Allow access** if true

---

## Debugging the Fix

If the policy still doesn't work:

### Check 1: Is the user linked to an instructor?
```sql
SELECT id, name, user_id
FROM instructors
WHERE user_id = '532bc75b-c907-4b8b-b675-661cba483195';
```
Should return 1 row.

### Check 2: Are there sessions with this instructor?
```sql
SELECT COUNT(*)
FROM lecture_sessions
WHERE '1bd061a5-6104-4fb1-b8b1-e5c65f60811a' = ANY(instructor_ids);
```
Should return 305.

### Check 3: Manual policy test
```sql
SELECT COUNT(*)
FROM lecture_sessions
WHERE instructor_ids @> ARRAY['1bd061a5-6104-4fb1-b8b1-e5c65f60811a'::uuid];
```
Should return 305.

### Check 4: View all policies
```sql
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;
```
Should show your new policy without the restriction.

---

## FAQ

**Q: Why does the policy check `is_active = true` twice?**
A: It's in both the overall USING clause and the students' subquery. You can optimize by removing one if preferred.

**Q: Can multiple instructors teach one session?**
A: Yes! That's why we use `instructor_ids` as an array. The `@>` operator handles it.

**Q: What if a teacher is also a student?**
A: The OR condition allows them to see lectures via either role.

**Q: Do I need to adjust the app code?**
A: No! The code already filters `instructor_ids` correctly. Only the RLS policy needed fixing.


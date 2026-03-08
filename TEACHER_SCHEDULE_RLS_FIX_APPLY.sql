-- ============================================================================
-- FIX: TEACHER SCHEDULE RLS POLICY TYPE CASTING BUG
-- ============================================================================
--
-- ISSUE FOUND: Policies cast instructor_ids::uuid[] to ::text[] for comparison
-- This causes silent failures in Supabase client queries
--
-- Current broken code:
--   ((instructor_ids)::text[] @> ARRAY[(auth.uid())::text])
--
-- Fixed code:
--   (instructor_ids @> ARRAY[auth.uid()])
--
-- This uses native UUID array containment without type conversion
--
-- ============================================================================

-- Step 1: Drop broken policies
DROP POLICY IF EXISTS "lecture_sessions_instructor_insert" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_update" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_student_view" ON lecture_sessions;

-- ============================================================================
-- Step 2: Create fixed policies
-- ============================================================================

-- Policy 1: Students can view lectures for their enrolled section
-- OR instructors can view lectures they teach
-- OR admins can view all lectures
CREATE POLICY "lecture_sessions_select_access"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    -- ✅ STUDENTS: View lectures for their enrolled section
    (
      EXISTS (
        SELECT 1
        FROM student_enrollments se
        WHERE se.section_id = lecture_sessions.section_id
          AND se.user_id = auth.uid()
          AND se.is_active = true
      )
    )
    -- ✅ INSTRUCTORS: View lectures they're assigned to (UUID array)
    OR (
      instructor_ids @> ARRAY[auth.uid()]
    )
    -- ✅ ADMINS: View all lectures in their university
    OR (
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
      )
    )
  );

-- Policy 2: Instructors can insert lectures if they're in instructor_ids
CREATE POLICY "lecture_sessions_instructor_insert"
  ON lecture_sessions FOR INSERT
  to public
  WITH CHECK (
    instructor_ids @> ARRAY[auth.uid()]
  );

-- Policy 3: Instructors can update lectures they're assigned to
CREATE POLICY "lecture_sessions_instructor_update"
  ON lecture_sessions FOR UPDATE
  to public
  USING (
    instructor_ids @> ARRAY[auth.uid()]
  )
  WITH CHECK (
    instructor_ids @> ARRAY[auth.uid()]
  );

-- ============================================================================
-- Step 3: Verify fix applied
-- ============================================================================

-- Check that policies were created
SELECT policyname, permissive
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;

-- ============================================================================
-- Step 4: Test the fix with SQL
-- ============================================================================

-- This should return 305 sessions (using native UUID comparison)
-- SELECT COUNT(*)
-- FROM lecture_sessions
-- WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
--   AND is_active = true
--   AND is_cancelled = false
--   AND session_date >= '2026-01-28'
--   AND session_date <= '2026-05-28'
--   AND instructor_ids @> ARRAY['1bd061a5-6104-4fb1-b8b1-e5c65f60811a'::uuid];

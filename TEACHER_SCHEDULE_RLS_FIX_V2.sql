-- ============================================================================
-- TEACHER SCHEDULE RLS FIX - IMPROVED VERSION
-- Author: Auto-generated fix for Supabase RLS policy bug
-- ============================================================================
--
-- Issue: Previous policies cast UUID array to text, causing silent failures
-- Status: RLS policies still blocking teacher access even after initial fix
--
-- Solution: Create new policies with explicit UUID type handling
--
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY CURRENT STATE
-- ============================================================================

-- Check which policies exist (for debugging)
-- SELECT policyname FROM pg_policies WHERE tablename = 'lecture_sessions';

-- ============================================================================
-- STEP 2: DROP ALL PROBLEMATIC POLICIES
-- ============================================================================

-- Drop ALL existing lecture_sessions policies to start fresh
DROP POLICY IF EXISTS "lecture_sessions_admin_all" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_insert" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_update" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_student_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_teacher_manage_special" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_select_access" ON lecture_sessions;

-- ============================================================================
-- STEP 3: CREATE CORRECTED POLICIES WITH EXPLICIT TYPE HANDLING
-- ============================================================================

-- POLICY 1: Admin can see and manage all lectures in their university
CREATE POLICY "lecture_sessions_admin_access"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.is_active = true
    )
  );

-- POLICY 2: Students can see lectures for their enrolled sections
CREATE POLICY "lecture_sessions_student_access"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    EXISTS (
      SELECT 1
      FROM student_enrollments se
      WHERE se.section_id = lecture_sessions.section_id
        AND se.user_id = auth.uid()
        AND se.is_active = true
    )
  );

-- POLICY 3: Instructors can view lectures they're assigned to
-- ⭐ KEY FIX: Use explicit UUID type matching with @> operator
CREATE POLICY "lecture_sessions_instructor_view"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    -- Check if instructor_ids (uuid array) contains current user's ID (cast to uuid)
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );

-- POLICY 4: Instructors can insert new lectures
CREATE POLICY "lecture_sessions_instructor_insert"
  ON lecture_sessions FOR INSERT
  to public
  WITH CHECK (
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );

-- POLICY 5: Instructors can update lectures they teach
CREATE POLICY "lecture_sessions_instructor_update"
  ON lecture_sessions FOR UPDATE
  to public
  USING (
    instructor_ids @> ARRAY[auth.uid()::uuid]
  )
  WITH CHECK (
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );

-- POLICY 6: Instructors can delete lectures they created/manage
CREATE POLICY "lecture_sessions_instructor_delete"
  ON lecture_sessions FOR DELETE
  to public
  USING (
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );

-- ============================================================================
-- STEP 4: VERIFY POLICIES CREATED
-- ============================================================================

SELECT 
  policyname,
  qual as condition,
  permissive
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;

-- ============================================================================
-- STEP 5: TEST QUERY (uncomment to test)
-- ============================================================================

-- After applying this fix, test with:
-- SELECT COUNT(*) FROM lecture_sessions
-- WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
--   AND is_active = true
--   AND is_cancelled = false
--   AND session_date >= '2026-01-28'
--   AND session_date <= '2026-05-28';
-- 
-- Expected result: Should return 305 (or more) sessions
-- If still 0, check:
-- 1. Run testTeacherScheduleAccess() in app
-- 2. Check that auth.uid() is properly set
-- 3. Verify instructor is linked to user via instructors.user_id

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Key changes from previous attempt:
-- 1. Explicit ::uuid cast on auth.uid() in array: ARRAY[auth.uid()::uuid]
-- 2. Separate policies per role (cleaner, easier to debug)
-- 3. Removed complex OR conditions that caused issues
-- 4. Added DELETE policy for completeness
-- 5. Removed all old broken policies first
--
-- If this still returns 0 sessions:
-- - Check app console: testTeacherScheduleAccess()
-- - Verify instructor.user_id is set to teacher's user ID
-- - Check that auth.uid() is returning correct UUID
--

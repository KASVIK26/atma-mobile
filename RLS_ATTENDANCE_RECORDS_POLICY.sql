-- ============================================================
-- RLS: Allow instructors to read attendance_records for their
--      lecture sessions (needed for detail card student list)
-- Run this once in Supabase SQL Editor
-- ============================================================

-- Drop old incorrect policy if it exists
DROP POLICY IF EXISTS "instructor_read_session_attendance" ON attendance_records;
DROP POLICY IF EXISTS "authenticated_read_user_profiles" ON users;

-- 1. Allow instructors to SELECT attendance rows for sessions they teach
--    instructor_ids stores instructors.id (NOT auth.uid()),
--    so we join through the instructors table via user_id
CREATE POLICY "instructor_read_session_attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM lecture_sessions ls
    JOIN instructors i ON i.id = ANY(ls.instructor_ids)
    WHERE ls.id = attendance_records.lecture_session_id
      AND i.user_id = auth.uid()
  )
);

-- 2. Allow any authenticated user to read basic user profiles
--    (needed to show student name + avatar in the instructor's detail modal)
CREATE POLICY "authenticated_read_user_profiles"
ON users
FOR SELECT
TO authenticated
USING (true);

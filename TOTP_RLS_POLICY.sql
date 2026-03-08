-- ============================================
-- CRITICAL FIX: Correct RLS Policy for TOTP Access
-- ============================================
-- NOTE: lecture_sessions.instructor_ids stores instructor.id (not users.id)
--       auth.uid() returns users.id
--       Need to JOIN with instructors table to convert instructor.id → users.id

-- Step 1: Drop all conflicting policies
DROP POLICY IF EXISTS "Instructors can read TOTP for their sessions" ON totp_sessions;
DROP POLICY IF EXISTS "instructors_can_read_totp_sessions" ON totp_sessions;
DROP POLICY IF EXISTS "instructors_read_totp" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_insert" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_update" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_view" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_admin" ON totp_sessions;
DROP POLICY IF EXISTS "allow_instructors_insert_totp" ON totp_sessions;
DROP POLICY IF EXISTS "allow_instructors_update_totp" ON totp_sessions;
DROP POLICY IF EXISTS "allow_instructors_select_totp" ON totp_sessions;

-- Step 2: Create SELECT policy with CORRECT instructor ID matching
CREATE POLICY "allow_instructors_select_totp"
ON totp_sessions
FOR SELECT
USING (
  -- Check if current user's instructor.id is in lecture_sessions.instructor_ids
  lecture_session_id IN (
    SELECT ls.id 
    FROM lecture_sessions ls
    WHERE EXISTS (
      SELECT 1 FROM instructors i
      WHERE i.user_id = auth.uid()
      AND (ls.instructor_ids::uuid[] @> ARRAY[i.id::uuid])
    )
  )
);

-- Step 3: Verify policy created
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'totp_sessions'
ORDER BY policyname;

-- DEBUG: Verify the relationship
SELECT 
  i.id as instructor_id,
  i.user_id,
  auth.uid() as current_user,
  (i.user_id = auth.uid()) as user_matches,
  ls.id as lecture_session_id,
  ls.instructor_ids
FROM instructors i
JOIN lecture_sessions ls ON (ls.instructor_ids::uuid[] @> ARRAY[i.id::uuid])
WHERE ls.id = '944c34f1-9aab-4e66-9933-bd7573490c49'
LIMIT 5;







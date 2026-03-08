-- ============================================================================
-- RLS POLICIES FOR totp_sessions
-- Run this in Supabase → SQL Editor
--
-- Access model:
--   student  → SELECT only, for sessions in their enrolled sections
--   teacher  → SELECT only, for sessions they instruct
--   admin    → full CRUD (SELECT + INSERT + UPDATE + DELETE)
--   service_role (cron) → bypasses RLS automatically, no policy needed
-- ============================================================================

-- STEP 1: Drop any existing policies on totp_sessions
DROP POLICY IF EXISTS "view_totp_sessions"                      ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_view"                      ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_insert"         ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_update"         ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_teacher_insert"            ON public.totp_sessions;
DROP POLICY IF EXISTS "instructors_manage_code_sharing"         ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_student_select"            ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_select"         ON public.totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_admin_all"                 ON public.totp_sessions;
DROP POLICY IF EXISTS "students_read_totp_enrolled"             ON public.totp_sessions;
DROP POLICY IF EXISTS "students_can_read_totp_for_enrolled_sessions" ON public.totp_sessions;

-- STEP 2: Ensure RLS is enabled
ALTER TABLE public.totp_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: Students — SELECT only
-- A student can read the TOTP row for a lecture session if they are
-- actively enrolled in the section that the lecture session belongs to.
-- Join path: auth.uid() → student_enrollments.user_id → section_id
--            → lecture_sessions.section_id → totp_sessions.lecture_session_id
-- ============================================================================
CREATE POLICY "totp_sessions_student_select"
ON public.totp_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    JOIN public.lecture_sessions ls ON ls.section_id = se.section_id
    WHERE se.user_id    = auth.uid()
      AND se.is_active  = true
      AND ls.id         = totp_sessions.lecture_session_id
  )
  AND
  -- Only allow when the authenticated user is actually a student
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id   = auth.uid()
      AND u.role = 'student'
  )
);

-- ============================================================================
-- POLICY 2: Instructors / Teachers — SELECT only
-- An instructor can read TOTP rows for sessions they teach.
-- lecture_sessions.instructor_ids is a uuid[] array.
-- ============================================================================
CREATE POLICY "totp_sessions_instructor_select"
ON public.totp_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lecture_sessions ls
    WHERE ls.id = totp_sessions.lecture_session_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
  )
);

-- ============================================================================
-- POLICY 3: Admins — full CRUD
-- A user with role = 'admin' in the users table gets unrestricted access
-- to all rows in totp_sessions (SELECT, INSERT, UPDATE, DELETE).
-- ============================================================================
CREATE POLICY "totp_sessions_admin_all"
ON public.totp_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id   = auth.uid()
      AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id   = auth.uid()
      AND u.role = 'admin'
  )
);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'totp_sessions'
ORDER BY policyname;

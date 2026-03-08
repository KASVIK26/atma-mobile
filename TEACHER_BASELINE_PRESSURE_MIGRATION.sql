-- ============================================================
-- Migration: Add teacher_baseline_pressure_hpa to totp_sessions
-- Purpose:   Teacher's device barometer reading is captured the
--            moment they press "Start Attendance". This value
--            becomes the source of truth for floor-verification
--            instead of the hourly Open-Meteo surface pressure
--            (which can drift ±0.5–0.8 hPa due to humidity etc.)
-- ============================================================

-- 1. New column: teacher's live barometer reading at session start
ALTER TABLE totp_sessions
  ADD COLUMN IF NOT EXISTS teacher_baseline_pressure_hpa NUMERIC(8, 3) DEFAULT NULL;

-- 2. Comment
COMMENT ON COLUMN totp_sessions.teacher_baseline_pressure_hpa IS
  'Barometer reading (hPa) captured from the teacher device at the '
  'moment Start Attendance is pressed. Used as the calibrated baseline '
  'for student floor-verification; overrides Open-Meteo surface pressure.';

-- 3. Ensure attendance_marking_enabled exists (might already be there)
ALTER TABLE totp_sessions
  ADD COLUMN IF NOT EXISTS attendance_marking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN totp_sessions.attendance_marking_enabled IS
  'Set to TRUE by the teacher (via Start Attendance button) to open the '
  'attendance window for students. Students cannot mark attendance while '
  'this flag is FALSE.';

-- 4. Index for fast lookup when students query the flag
CREATE INDEX IF NOT EXISTS idx_totp_sessions_marking_enabled
  ON totp_sessions (lecture_session_id, attendance_marking_enabled);

-- ============================================================
-- 5. RLS UPDATE policy so teachers can activate attendance
-- ============================================================
-- The existing policy "totp_sessions_instructor_select" grants SELECT only.
-- Without an UPDATE policy the teacher's update call silently matches 0 rows
-- (Supabase/Postgres returns no error but writes nothing).
-- This policy lets an instructor flip attendance_marking_enabled and write
-- their barometer baseline on sessions they teach.

DROP POLICY IF EXISTS "totp_sessions_instructor_start_attendance" ON public.totp_sessions;

CREATE POLICY "totp_sessions_instructor_start_attendance"
ON public.totp_sessions
FOR UPDATE
TO authenticated
USING (
  -- The authenticated user must be an instructor listed on the lecture session
  EXISTS (
    SELECT 1
    FROM public.lecture_sessions ls
    JOIN public.users u ON u.id = auth.uid()
    WHERE ls.id = totp_sessions.lecture_session_id
      AND u.role = 'teacher'
      AND ls.instructor_ids::text[] @> ARRAY[
            -- instructors table links user_id → instructor record id
            (SELECT i.id::text FROM public.instructors i WHERE i.user_id = auth.uid() LIMIT 1)
          ]
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.lecture_sessions ls
    JOIN public.users u ON u.id = auth.uid()
    WHERE ls.id = totp_sessions.lecture_session_id
      AND u.role = 'teacher'
      AND ls.instructor_ids::text[] @> ARRAY[
            (SELECT i.id::text FROM public.instructors i WHERE i.user_id = auth.uid() LIMIT 1)
          ]
  )
);

-- Verify all current policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'totp_sessions'
ORDER BY policyname;

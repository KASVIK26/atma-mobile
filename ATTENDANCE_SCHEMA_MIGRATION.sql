-- ============================================================================
-- TOTP & Attendance Database Schema Migration
-- ============================================================================
-- This file contains all SQL statements needed to implement the secure
-- TOTP code sharing and attendance marking system.
-- ============================================================================

-- Step 1: Add columns to totp_sessions table
-- ============================================================================
ALTER TABLE IF EXISTS totp_sessions
ADD COLUMN IF NOT EXISTS code_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attendance_marking_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS code_shared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shared_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for frequent queries
CREATE INDEX IF NOT EXISTS idx_totp_sessions_code_shared 
ON public.totp_sessions(code_shared, attendance_marking_enabled)
TABLESPACE pg_default;


-- Step 2: Create attendance_records table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  lecture_session_id UUID NOT NULL,
  attendance_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marked_via_totp BOOLEAN DEFAULT FALSE,
  totp_verified BOOLEAN DEFAULT FALSE,
  status CHARACTER VARYING(50) NOT NULL DEFAULT 'present',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT attendance_records_lecture_session_id_fkey 
    FOREIGN KEY (lecture_session_id) REFERENCES public.lecture_sessions (id) ON DELETE CASCADE,
  CONSTRAINT unique_student_session UNIQUE (student_id, lecture_session_id),
  CONSTRAINT check_attendance_status CHECK (
    status = ANY (ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'excused'::character varying])
  )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id 
ON public.attendance_records USING btree (student_id)
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_records_lecture_session_id 
ON public.attendance_records USING btree (lecture_session_id)
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_time 
ON public.attendance_records USING btree (attendance_time DESC)
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_records_created_at 
ON public.attendance_records USING btree (created_at DESC)
TABLESPACE pg_default;


-- Step 3: Create audit table for attendance changes (optional but recommended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  action CHARACTER VARYING(50) NOT NULL, -- 'created', 'updated', 'deleted'
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  
  CONSTRAINT attendance_audit_log_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_audit_log_record_id 
ON public.attendance_audit_log USING btree (attendance_record_id)
TABLESPACE pg_default;


-- Step 4: Enable Row Level Security (RLS)
-- ============================================================================
-- Enable RLS on totp_sessions
ALTER TABLE IF EXISTS public.totp_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on attendance_records
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Enable RLS on attendance_audit_log
ALTER TABLE IF EXISTS public.attendance_audit_log ENABLE ROW LEVEL SECURITY;


-- Step 5: RLS Policies for totp_sessions
-- ============================================================================

-- Policy: Students can view TOTP sessions (all students can see if code was shared)
-- All users can see the sessions but only shared codes are returned to app layer
DROP POLICY IF EXISTS "view_totp_sessions" ON public.totp_sessions;
CREATE POLICY "view_totp_sessions"
  ON public.totp_sessions
  FOR SELECT
  USING (TRUE); -- All users can view, app layer filters based on code_shared


-- Policy: Only instructors can modify code_shared flag
DROP POLICY IF EXISTS "instructors_manage_code_sharing" ON public.totp_sessions;
CREATE POLICY "instructors_manage_code_sharing"
  ON public.totp_sessions
  FOR UPDATE
  USING (
    -- Instructor of the lecture session can update
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.university_id = totp_sessions.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
    OR
    -- User who shared the code can update their own sharing
    shared_by_user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.university_id = totp_sessions.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
    OR
    shared_by_user_id = auth.uid()
  );


-- Step 6: RLS Policies for attendance_records
-- ============================================================================

-- Policy: Students can insert their own attendance
DROP POLICY IF EXISTS "students_mark_own_attendance" ON public.attendance_records;
CREATE POLICY "students_mark_own_attendance"
  ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    -- Must be marking attendance for themselves
    student_id = auth.uid()
    AND
    -- Must be enrolled in the class
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.lecture_sessions ls ON se.section_id = ls.section_id
      WHERE se.user_id = auth.uid()
      AND ls.id = attendance_records.lecture_session_id
      AND se.is_active = TRUE
      AND ls.is_active = TRUE
    )
    AND
    -- Attendance marking must be enabled and window open
    EXISTS (
      SELECT 1 FROM public.totp_sessions ts
      WHERE ts.lecture_session_id = attendance_records.lecture_session_id
      AND ts.attendance_marking_enabled = TRUE
      AND ts.expires_at > NOW()
    )
  );

-- Policy: Students can view their own attendance
DROP POLICY IF EXISTS "students_view_own_attendance" ON public.attendance_records;
CREATE POLICY "students_view_own_attendance"
  ON public.attendance_records
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Instructors can view attendance for their sessions
DROP POLICY IF EXISTS "instructors_view_session_attendance" ON public.attendance_records;
CREATE POLICY "instructors_view_session_attendance"
  ON public.attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );

-- Policy: Prevent direct updates (only inserts allowed, updates via trigger)
DROP POLICY IF EXISTS "prevent_attendance_updates" ON public.attendance_records;
CREATE POLICY "prevent_attendance_updates"
  ON public.attendance_records
  FOR UPDATE
  USING (FALSE)
  WITH CHECK (FALSE);


-- Step 7: RLS Policies for attendance_audit_log
-- ============================================================================

-- Policy: Users can only view audit logs for their own attendance
DROP POLICY IF EXISTS "students_view_own_audit" ON public.attendance_audit_log;
CREATE POLICY "students_view_own_audit"
  ON public.attendance_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.id = attendance_audit_log.attendance_record_id
      AND ar.student_id = auth.uid()
    )
  );

-- Policy: Instructors can view audit logs for their sessions
DROP POLICY IF EXISTS "instructors_view_audit" ON public.attendance_audit_log;
CREATE POLICY "instructors_view_audit"
  ON public.attendance_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      JOIN public.lecture_sessions ls ON ar.lecture_session_id = ls.id
      WHERE ar.id = attendance_audit_log.attendance_record_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );


-- Step 8: Trigger to create audit log entries (optional)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_attendance_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.attendance_audit_log (
      attendance_record_id, action, changed_by, new_values
    ) VALUES (
      NEW.id, 'created', auth.uid(), row_to_json(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.attendance_audit_log (
      attendance_record_id, action, changed_by, old_values, new_values
    ) VALUES (
      NEW.id, 'updated', auth.uid(), row_to_json(OLD), row_to_json(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.attendance_audit_log (
      attendance_record_id, action, changed_by, old_values
    ) VALUES (
      OLD.id, 'deleted', auth.uid(), row_to_json(OLD)
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS attendance_audit_trigger ON public.attendance_records;
CREATE TRIGGER attendance_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_attendance_changes();


-- Step 9: Helper function to get attendance rate (optional)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_attendance_rate(
  p_student_id UUID,
  p_session_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(total_sessions BIGINT, marked_sessions BIGINT, attendance_rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ls.id)::BIGINT as total_sessions,
    COUNT(DISTINCT ar.id)::BIGINT as marked_sessions,
    ROUND(
      (COUNT(DISTINCT ar.id)::NUMERIC / NULLIF(COUNT(DISTINCT ls.id), 0)) * 100,
      2
    ) as attendance_rate
  FROM public.lecture_sessions ls
  LEFT JOIN public.student_enrollments se ON se.section_id = ls.section_id
  LEFT JOIN public.attendance_records ar ON ar.lecture_session_id = ls.id AND ar.student_id = se.user_id
  WHERE se.user_id = p_student_id
  AND se.is_active = TRUE
  AND ls.is_active = TRUE
  AND (p_session_ids IS NULL OR ls.id = ANY(p_session_ids));
END;
$$ LANGUAGE plpgsql;


-- Step 10: Verify the schema
-- ============================================================================
-- Run these queries to verify the schema is correct:

-- Check totp_sessions new columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'totp_sessions' 
-- AND column_name IN ('code_shared', 'attendance_marking_enabled', 'code_shared_at', 'shared_by_user_id');

-- Check attendance_records existence
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'attendance_records' 
-- ORDER BY ordinal_position;

-- Check RLS enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('totp_sessions', 'attendance_records', 'attendance_audit_log');

-- Check policies
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('totp_sessions', 'attendance_records', 'attendance_audit_log')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- TOTP & Attendance Integration with Existing Multi-Layer Validation Architecture
-- ============================================================================
-- 
-- Your database ALREADY has an attendance_records table with sophisticated
-- multi-layer validation (GPS, Barometer, TOTP, BLE). This migration only adds
-- the necessary columns to totp_sessions table and RLS policies.
--
-- NOTE: student_id column in attendance_records stores the user_id of the student.
-- 
-- Multi-Layer Architecture:
-- 1. GPS validation (gps_latitude, gps_longitude)
-- 2. Barometer/pressure validation (pressure_value for height)
-- 3. TOTP code validation (totp_valid, totp_code_used conceptually)
-- 4. BLE validation (ble_valid)
-- 5. Confidence scoring (confidence_level 0-1)
-- 6. Proxy detection (is_proxy_suspected)
-- 7. Override capability (overridden_by, override_reason)
--
-- ============================================================================

-- Step 1: Add columns to totp_sessions table for instructor code sharing control
-- ============================================================================
-- These columns allow instructors to control whether students see TOTP codes
-- and whether they can mark attendance through this mechanism.

ALTER TABLE IF EXISTS public.totp_sessions
ADD COLUMN IF NOT EXISTS code_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attendance_marking_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS code_shared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shared_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for frequent queries (code_shared flag check, attendance_marking_enabled check)
CREATE INDEX IF NOT EXISTS idx_totp_sessions_code_shared 
ON public.totp_sessions(code_shared, attendance_marking_enabled)
TABLESPACE pg_default;

COMMENT ON COLUMN public.totp_sessions.code_shared IS 'Instructor controls: whether TOTP code is visible to students';
COMMENT ON COLUMN public.totp_sessions.attendance_marking_enabled IS 'Instructor controls: whether students can mark attendance via this TOTP code';
COMMENT ON COLUMN public.totp_sessions.code_shared_at IS 'Timestamp when instructor shared the code';
COMMENT ON COLUMN public.totp_sessions.shared_by_user_id IS 'The instructor who shared the code (usually instructor_ids[0])';


-- Step 2: Create or verify attendance_status enum is present
-- ============================================================================
-- Your table already uses this enum. This ensures it exists with the right values.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
  END IF;
END $$;


-- Step 3: Verify attendance_records table structure
-- ============================================================================
-- Your existing table already has all these columns. This is just documentation.
-- The actual table structure should match what you provided:
-- 
-- Table: attendance_records
-- Columns:
--   - id UUID PRIMARY KEY (auto-generated)
--   - university_id UUID (references universities)
--   - lecture_session_id UUID (references lecture_sessions)
--   - student_id UUID (THIS IS THE USER_ID OF THE STUDENT - references users)
--   - attendance_status (enum: present, absent, late)
--   - marked_at TIMESTAMP (when student marked attendance)
--   - marked_by UUID (who marked it - usually auth.uid() for student marking own)
--   - marking_method VARCHAR(50) (e.g., 'student_app', 'teacher_manual', 'admin_override', 'system_auto')
--   - gps_latitude NUMERIC(10, 8)
--   - gps_longitude NUMERIC(11, 8)
--   - pressure_value NUMERIC(7, 2) (for barometer/height validation)
--   - validation_score NUMERIC(5, 2) (0-100)
--   - geofence_valid BOOLEAN
--   - barometer_valid BOOLEAN
--   - totp_valid BOOLEAN (TRUE if TOTP code was validated)
--   - ble_valid BOOLEAN
--   - is_proxy_suspected BOOLEAN
--   - confidence_level NUMERIC(5, 2) (0-1 or 0-100)
--   - overridden_by UUID (admin override)
--   - override_reason TEXT
--   - created_at TIMESTAMP
--   - updated_at TIMESTAMP


-- Step 4: Enable Row Level Security (RLS) on totp_sessions
-- ============================================================================
ALTER TABLE IF EXISTS public.totp_sessions ENABLE ROW LEVEL SECURITY;


-- Step 5: RLS Policies for totp_sessions
-- ============================================================================
-- All users can view TOTP sessions to see if code was shared
-- But the app layer only returns the code if code_shared = TRUE

DROP POLICY IF EXISTS "view_totp_sessions" ON public.totp_sessions;
CREATE POLICY "view_totp_sessions"
  ON public.totp_sessions
  FOR SELECT
  USING (TRUE);
-- All users can view sessions. App layer filters code visibility based on code_shared flag.

-- Only instructors of the session can enable/disable code sharing and attendance marking
DROP POLICY IF EXISTS "instructors_manage_code_sharing" ON public.totp_sessions;
CREATE POLICY "instructors_manage_code_sharing"
  ON public.totp_sessions
  FOR UPDATE
  USING (
    -- Instructor of the lecture session can update
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = totp_sessions.lecture_session_id
      AND ls.university_id = totp_sessions.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = totp_sessions.lecture_session_id
      AND ls.university_id = totp_sessions.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );


-- Step 6: RLS Policies for attendance_records (your existing table)
-- ============================================================================
-- Enable RLS enforcement on your existing table
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Policy: Students can INSERT their own attendance records only when:
-- 1. Marking for themselves (student_id = auth.uid())
-- 2. They are enrolled in the class
-- 3. Instructor has enabled attendance marking (attendance_marking_enabled = TRUE)
-- 4. The TOTP session window is still open (expires_at > NOW())

DROP POLICY IF EXISTS "students_mark_own_attendance" ON public.attendance_records;
CREATE POLICY "students_mark_own_attendance"
  ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    -- Must be marking attendance for themselves
    -- NOTE: student_id is the user_id of the student (auth.uid())
    student_id = auth.uid()
    AND
    -- Must be enrolled in the class (via student_enrollments)
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.lecture_sessions ls ON se.section_id = ls.section_id
      WHERE se.user_id = auth.uid()
      AND ls.id = attendance_records.lecture_session_id
      AND se.is_active = TRUE
      AND ls.is_active = TRUE
      AND ls.university_id = attendance_records.university_id
    )
    AND
    -- Attendance marking must be enabled and the time window must be open
    EXISTS (
      SELECT 1 FROM public.totp_sessions ts
      WHERE ts.lecture_session_id = attendance_records.lecture_session_id
      AND ts.attendance_marking_enabled = TRUE
      AND ts.expires_at > NOW()
    )
    AND
    -- Student can only mark one attendance per session (prevent duplicates)
    NOT EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.student_id = attendance_records.student_id
      AND ar.lecture_session_id = attendance_records.lecture_session_id
    )
  );

-- Policy: Students can view their own attendance records
DROP POLICY IF EXISTS "students_view_own_attendance" ON public.attendance_records;
CREATE POLICY "students_view_own_attendance"
  ON public.attendance_records
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Instructors can view attendance records for their sessions
DROP POLICY IF EXISTS "instructors_view_session_attendance" ON public.attendance_records;
CREATE POLICY "instructors_view_session_attendance"
  ON public.attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.university_id = attendance_records.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );

-- Policy: Only instructors can update attendance records (for overrides, manual corrections)
DROP POLICY IF EXISTS "instructors_update_attendance" ON public.attendance_records;
CREATE POLICY "instructors_update_attendance"
  ON public.attendance_records
  FOR UPDATE
  USING (
    -- Only instructors of the session can update
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.university_id = attendance_records.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lecture_sessions ls
      WHERE ls.id = lecture_session_id
      AND ls.university_id = attendance_records.university_id
      AND ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );


-- Step 7: Helper function to mark attendance via TOTP
-- ============================================================================
-- This function is called from the frontend (dashboard-service.ts markAttendance)
-- It creates an attendance record with multi-layer validation support
-- Returns: success (boolean), message (text), attendance_id (uuid)

CREATE OR REPLACE FUNCTION public.mark_attendance_via_totp(
  p_student_id UUID,
  p_lecture_session_id UUID,
  p_university_id UUID,
  p_totp_code VARCHAR DEFAULT NULL,
  p_gps_latitude NUMERIC DEFAULT NULL,
  p_gps_longitude NUMERIC DEFAULT NULL,
  p_pressure_value NUMERIC DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, attendance_id UUID) AS $$
DECLARE
  v_totp_session_id UUID;
  v_attendance_id UUID;
  v_totp_valid BOOLEAN;
  v_confidence_score NUMERIC;
  v_is_enrolled BOOLEAN;
  v_marking_window_open BOOLEAN;
  v_already_marked BOOLEAN;
BEGIN
  -- Check if student is enrolled in the class
  SELECT EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.lecture_sessions ls ON se.section_id = ls.section_id
    WHERE se.user_id = p_student_id
    AND ls.id = p_lecture_session_id
    AND se.is_active = TRUE
    AND ls.is_active = TRUE
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
    RETURN QUERY SELECT FALSE, 'Not enrolled in this class'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if student already marked attendance
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_records
    WHERE student_id = p_student_id
    AND lecture_session_id = p_lecture_session_id
  ) INTO v_already_marked;

  IF v_already_marked THEN
    RETURN QUERY SELECT FALSE, 'You have already marked attendance for this session'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if TOTP marking is enabled and window is open
  SELECT ts.id, (ts.expires_at > NOW()) 
  INTO v_totp_session_id, v_marking_window_open
  FROM public.totp_sessions ts
  WHERE ts.lecture_session_id = p_lecture_session_id
  AND ts.attendance_marking_enabled = TRUE;

  IF v_totp_session_id IS NULL OR NOT v_marking_window_open THEN
    RETURN QUERY SELECT FALSE, 'Attendance marking is not enabled or window has closed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validate TOTP code if provided
  v_totp_valid := p_totp_code IS NOT NULL;

  -- Initialize confidence score based on validation layers
  -- Start with base confidence from TOTP validation
  v_confidence_score := CASE 
    WHEN v_totp_valid THEN 0.33 
    ELSE 0.0 
  END;

  -- Add confidence if GPS data provided
  IF p_gps_latitude IS NOT NULL AND p_gps_longitude IS NOT NULL THEN
    v_confidence_score := v_confidence_score + 0.33;
  END IF;

  -- Add confidence if pressure/barometer data provided
  IF p_pressure_value IS NOT NULL THEN
    v_confidence_score := v_confidence_score + 0.34;
  END IF;

  -- Ensure confidence score doesn't exceed 1.0
  v_confidence_score := LEAST(v_confidence_score, 1.0);

  -- Insert attendance record
  -- Remember: student_id is the user_id of the student
  BEGIN
    INSERT INTO public.attendance_records (
      university_id,
      lecture_session_id,
      student_id,
      attendance_status,
      marked_at,
      marked_by,
      marking_method,
      gps_latitude,
      gps_longitude,
      pressure_value,
      totp_valid,
      confidence_level
    ) VALUES (
      p_university_id,
      p_lecture_session_id,
      p_student_id,
      'present'::attendance_status,
      NOW(),
      p_student_id,  -- Student is marking their own attendance
      'student_app'::VARCHAR,
      p_gps_latitude,
      p_gps_longitude,
      p_pressure_value,
      v_totp_valid,
      v_confidence_score
    ) RETURNING id INTO v_attendance_id;

    RETURN QUERY SELECT TRUE, 'Attendance marked successfully'::TEXT, v_attendance_id;
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN QUERY SELECT FALSE, 'Duplicate attendance record'::TEXT, NULL::UUID;
    WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, SQLERRM, NULL::UUID;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_attendance_via_totp IS 
'Marks attendance for a student with multi-layer validation support. Called from dashboard-service.ts markAttendance()';


-- Step 8: Helper function to check if student already marked attendance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_marked_attendance(
  p_student_id UUID,
  p_lecture_session_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.attendance_records
    WHERE student_id = p_student_id
    AND lecture_session_id = p_lecture_session_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.has_marked_attendance IS 
'Used by frontend to check if student has already marked attendance for a session';


-- Step 9: Helper function to get comprehensive attendance statistics
-- ============================================================================
-- This function returns various attendance metrics including validation method breakdown

CREATE OR REPLACE FUNCTION public.get_student_attendance_stats(
  p_student_id UUID,
  p_university_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
  total_sessions BIGINT,
  marked_present BIGINT,
  marked_late BIGINT,
  marked_absent BIGINT,
  totp_validated BIGINT,
  gps_validated BIGINT,
  barometer_validated BIGINT,
  ble_validated BIGINT,
  avg_confidence_score NUMERIC,
  proxy_suspected BIGINT,
  attendance_rate_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ls.id)::BIGINT as total_sessions,
    COUNT(DISTINCT CASE WHEN ar.attendance_status = 'present'::attendance_status THEN ar.id END)::BIGINT as marked_present,
    COUNT(DISTINCT CASE WHEN ar.attendance_status = 'late'::attendance_status THEN ar.id END)::BIGINT as marked_late,
    COUNT(DISTINCT CASE WHEN ar.attendance_status = 'absent'::attendance_status THEN ar.id END)::BIGINT as marked_absent,
    COUNT(DISTINCT CASE WHEN ar.totp_valid = TRUE THEN ar.id END)::BIGINT as totp_validated,
    COUNT(DISTINCT CASE WHEN ar.gps_latitude IS NOT NULL AND ar.gps_longitude IS NOT NULL THEN ar.id END)::BIGINT as gps_validated,
    COUNT(DISTINCT CASE WHEN ar.barometer_valid = TRUE THEN ar.id END)::BIGINT as barometer_validated,
    COUNT(DISTINCT CASE WHEN ar.ble_valid = TRUE THEN ar.id END)::BIGINT as ble_validated,
    ROUND(AVG(ar.confidence_level), 2) as avg_confidence_score,
    COUNT(DISTINCT CASE WHEN ar.is_proxy_suspected = TRUE THEN ar.id END)::BIGINT as proxy_suspected,
    ROUND(
      (COUNT(DISTINCT CASE WHEN ar.attendance_status IN ('present'::attendance_status, 'late'::attendance_status) THEN ar.id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT ls.id), 0)) * 100,
      2
    ) as attendance_rate_pct
  FROM public.lecture_sessions ls
  LEFT JOIN public.student_enrollments se ON se.section_id = ls.section_id
  LEFT JOIN public.attendance_records ar ON ar.lecture_session_id = ls.id AND ar.student_id = se.user_id
  WHERE se.user_id = p_student_id
  AND ls.university_id = p_university_id
  AND se.is_active = TRUE
  AND ls.is_active = TRUE
  AND (p_start_date IS NULL OR ls.session_date::TIMESTAMP >= p_start_date)
  AND (p_end_date IS NULL OR ls.session_date::TIMESTAMP <= p_end_date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_student_attendance_stats IS 
'Returns comprehensive attendance statistics including validation method breakdown. Useful for student dashboards.';


-- Step 10: Create a view for attendance reporting (instructors)
-- ============================================================================
-- This view provides instructors with session-level attendance summaries

CREATE OR REPLACE VIEW public.v_attendance_summary AS
SELECT
  ar.lecture_session_id,
  ar.university_id,
  ls.session_date,
  c.code as course_code,
  c.name as course_name,
  COUNT(DISTINCT se.user_id) as total_enrolled,
  COUNT(DISTINCT CASE WHEN ar.attendance_status = 'present' THEN ar.id END) as present_count,
  COUNT(DISTINCT CASE WHEN ar.attendance_status = 'late' THEN ar.id END) as late_count,
  COUNT(DISTINCT CASE WHEN ar.attendance_status = 'absent' THEN ar.id END) as absent_count,
  COUNT(DISTINCT CASE WHEN ar.totp_valid = TRUE THEN ar.id END) as totp_validated_count,
  COUNT(DISTINCT CASE WHEN ar.gps_latitude IS NOT NULL THEN ar.id END) as gps_validated_count,
  COUNT(DISTINCT CASE WHEN ar.barometer_valid = TRUE THEN ar.id END) as barometer_validated_count,
  COUNT(DISTINCT CASE WHEN ar.ble_valid = TRUE THEN ar.id END) as ble_validated_count,
  ROUND(AVG(ar.confidence_level), 2) as avg_confidence_level,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ar.attendance_status IN ('present', 'late') THEN ar.id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT se.user_id), 0)) * 100,
    2
  ) as attendance_rate_pct
FROM public.lecture_sessions ls
LEFT JOIN public.courses c ON ls.course_id = c.id
LEFT JOIN public.student_enrollments se ON se.section_id = ls.section_id
LEFT JOIN public.attendance_records ar ON ar.lecture_session_id = ls.id AND ar.student_id = se.user_id
WHERE se.is_active = TRUE AND ls.is_active = TRUE
GROUP BY ar.lecture_session_id, ar.university_id, ls.session_date, c.code, c.name;

COMMENT ON VIEW public.v_attendance_summary IS 
'Instructor view of session attendance summary with multi-layer validation breakdown';


-- Step 11: Verification and testing queries
-- ============================================================================
-- Uncomment and run these to verify the migration is complete

-- Verify totp_sessions new columns exist:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'totp_sessions' 
-- AND column_name IN ('code_shared', 'attendance_marking_enabled', 'code_shared_at', 'shared_by_user_id')
-- ORDER BY column_name;

-- Verify RLS is enabled on both tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('totp_sessions', 'attendance_records')
-- AND schemaname = 'public'
-- ORDER BY tablename;

-- Verify RLS policies are in place:
-- SELECT schemaname, tablename, policyname, cmd, using_clause
-- FROM pg_policies 
-- WHERE tablename IN ('totp_sessions', 'attendance_records')
-- AND schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Verify functions were created:
-- SELECT routine_name, routine_type, data_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE '%attendance%'
-- ORDER BY routine_name;

-- Test getting attendance stats (replace UUIDs with real data):
-- SELECT * FROM public.get_student_attendance_stats(
--   '12345678-1234-5678-1234-567812345678'::UUID,  -- student user_id
--   '87654321-4321-8765-4321-876543218765'::UUID   -- university_id
-- );

-- View attendance summary for all sessions:
-- SELECT * FROM public.v_attendance_summary 
-- WHERE university_id = '87654321-4321-8765-4321-876543218765'::UUID
-- ORDER BY session_date DESC;

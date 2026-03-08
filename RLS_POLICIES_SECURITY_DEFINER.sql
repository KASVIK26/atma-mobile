-- ============================================================================
-- ALTERNATIVE: USING PostgreSQL SECURITY DEFINER FUNCTION
-- Purpose: Bypass RLS policies for trusted operations
-- ============================================================================
--
-- If you want to keep RLS but allow certain operations to bypass it,
-- use a SECURITY DEFINER function. This function runs with the owner's
-- permissions, not the caller's, so it can write regardless of RLS policies.
--
-- This is the proper way to handle cases where app logic needs to write
-- to protected tables after validation.
-- ============================================================================

-- Create a function that bypasses RLS to insert attendance records
-- This function will be called from the app instead of direct INSERT
CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_lecture_session_id UUID,
  p_student_id UUID,
  p_university_id UUID,
  p_attendance_status TEXT,
  p_gps_latitude NUMERIC,
  p_gps_longitude NUMERIC,
  p_pressure_value NUMERIC,
  p_validation_score NUMERIC,
  p_geofence_valid BOOLEAN,
  p_barometer_valid BOOLEAN,
  p_totp_valid BOOLEAN,
  p_is_proxy_suspected BOOLEAN,
  p_confidence_level NUMERIC
)
RETURNS UUID AS $$
DECLARE 
  v_attendance_id UUID;
BEGIN
  -- Validate that the student is actually enrolled in the class
  IF NOT EXISTS (
    SELECT 1 FROM enrollments e
    JOIN lecture_sessions l ON l.class_id = e.class_id
    WHERE l.id = p_lecture_session_id
    AND e.user_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Student not enrolled in this class';
  END IF;

  -- Insert the attendance record
  INSERT INTO attendance_records (
    lecture_session_id,
    student_id,
    university_id,
    attendance_status,
    gps_latitude,
    gps_longitude,
    pressure_value,
    validation_score,
    geofence_valid,
    barometer_valid,
    totp_valid,
    is_proxy_suspected,
    confidence_level,
    created_at,
    updated_at
  ) VALUES (
    p_lecture_session_id,
    p_student_id,
    p_university_id,
    p_attendance_status,
    p_gps_latitude,
    p_gps_longitude,
    p_pressure_value,
    p_validation_score,
    p_geofence_valid,
    p_barometer_valid,
    p_totp_valid,
    p_is_proxy_suspected,
    p_confidence_level,
    NOW(),
    NOW()
  ) RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET SEARCH_PATH = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_attendance TO authenticated;

-- ============================================================================
-- APP CODE CHANGES NEEDED
-- ============================================================================
--
-- Replace the direct INSERT in lib/attendance-service.ts with an RPC call:
--
-- OLD CODE (direct insert):
-- const { data, error } = await supabase
--   .from('attendance_records')
--   .insert([...])
--
-- NEW CODE (using function):
-- const { data, error } = await supabase.rpc('mark_attendance', {
--   p_lecture_session_id: lectureSessionId,
--   p_student_id: studentId,
--   p_university_id: universityId,
--   p_attendance_status: attendanceStatus,
--   p_gps_latitude: gpsLatitude,
--   p_gps_longitude: gpsLongitude,
--   p_pressure_value: pressureValue,
--   p_validation_score: validationScore,
--   p_geofence_valid: geofenceValid,
--   p_barometer_valid: barometerValid,
--   p_totp_valid: totpValid,
--   p_is_proxy_suspected: isProxySuspected,
--   p_confidence_level: confidenceLevel
-- });
--
-- ============================================================================

-- Additional function to get attendance records (also bypasses RLS if needed)
CREATE OR REPLACE FUNCTION public.get_attendance_records(
  p_lecture_session_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  lecture_session_id UUID,
  student_id UUID,
  university_id UUID,
  attendance_status TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  pressure_value NUMERIC,
  validation_score NUMERIC,
  geofence_valid BOOLEAN,
  barometer_valid BOOLEAN,
  totp_valid BOOLEAN,
  is_proxy_suspected BOOLEAN,
  confidence_level NUMERIC,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- Allow students to view their own records
  -- Allow teachers to view attendance for their classes
  -- Allow admins to view all records
  RETURN QUERY
  SELECT 
    ar.id,
    ar.lecture_session_id,
    ar.student_id,
    ar.university_id,
    ar.attendance_status,
    ar.gps_latitude,
    ar.gps_longitude,
    ar.pressure_value,
    ar.validation_score,
    ar.geofence_valid,
    ar.barometer_valid,
    ar.totp_valid,
    ar.is_proxy_suspected,
    ar.confidence_level,
    ar.created_at,
    ar.updated_at
  FROM attendance_records ar
  WHERE 
    -- Own records
    (ar.student_id = auth.uid()::uuid)
    OR
    -- Teacher viewing their class
    (EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = ar.lecture_session_id
      AND l.teacher_id = auth.uid()::text
    ))
    OR
    -- Filter by specific session if provided
    (p_lecture_session_id IS NOT NULL AND ar.lecture_session_id = p_lecture_session_id)
    OR
    -- Filter by specific student if provided
    (p_student_id IS NOT NULL AND ar.student_id = p_student_id)
  LIMIT 1000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET SEARCH_PATH = public;

GRANT EXECUTE ON FUNCTION public.get_attendance_records TO authenticated;

-- ============================================================================
-- QUICK TEST
-- ============================================================================
--
-- Test the function:
-- SELECT * FROM mark_attendance(
--   '...lecture_session_id...',
--   '...student_id...',
--   '...university_id...',
--   'present',
--   23.167170,
--   75.784623,
--   956.60,
--   100.0,
--   true,
--   true,
--   true,
--   false,
--   1.0
-- );
--
-- ============================================================================

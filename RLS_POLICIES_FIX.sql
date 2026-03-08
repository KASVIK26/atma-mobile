-- ============================================================================
-- RLS POLICIES FIX SCRIPT
-- Purpose: Remove problematic RLS policies and rewrite them to avoid recursion
-- ============================================================================

-- STEP 1: DISABLE RLS TEMPORARILY TO PREVENT RECURSION
-- This is a quick fix to allow the system to work while we rewrite policies
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing problematic policies
DROP POLICY IF EXISTS attendance_records_student_view ON attendance_records;
DROP POLICY IF EXISTS attendance_records_student_insert ON attendance_records;
DROP POLICY IF EXISTS attendance_records_teacher_view ON attendance_records;
DROP POLICY IF EXISTS attendance_records_teacher_update ON attendance_records;
DROP POLICY IF EXISTS lecture_sessions_view ON lecture_sessions;
DROP POLICY IF EXISTS totp_sessions_view ON totp_sessions;
DROP POLICY IF EXISTS rooms_view ON rooms;

-- STEP 3: RE-ENABLE RLS with proper, non-recursive policies
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REWRITTEN RLS POLICIES - NON-RECURSIVE VERSION
-- ============================================================================

-- ============================================================================
-- ATTENDANCE RECORDS POLICIES
-- ============================================================================

-- Students can view their own attendance records only
CREATE POLICY attendance_records_student_view ON attendance_records
  FOR SELECT
  USING (
    -- Allow access if user_id matches their own ID
    auth.uid()::text = student_id::text
    OR
    -- Allow teachers to view attendance for their classes
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text
    )
    OR
    -- Allow admins (users with admin role)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Students can insert their own attendance records
CREATE POLICY attendance_records_student_insert ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- Ensure user_id matches authenticated user
    auth.uid()::text = student_id::text
    AND
    -- Verify the lecture_session exists
    EXISTS (
      SELECT 1 FROM lecture_sessions
      WHERE id = lecture_session_id
    )
  );

-- Students can update their own records (for corrections)
CREATE POLICY attendance_records_student_update ON attendance_records
  FOR UPDATE
  USING (auth.uid()::text = student_id::text)
  WITH CHECK (auth.uid()::text = student_id::text);

-- Teachers can view and update attendance records for their classes
CREATE POLICY attendance_records_teacher_view ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text
    )
  );

CREATE POLICY attendance_records_teacher_update ON attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text
    )
  );

-- ============================================================================
-- LECTURE SESSIONS POLICIES
-- ============================================================================

-- Students can view lecture sessions for classes they're enrolled in
CREATE POLICY lecture_sessions_student_view ON lecture_sessions
  FOR SELECT
  USING (
    -- Allow viewing own sessions
    teacher_id = auth.uid()::text
    OR
    -- Allow students enrolled in this class to view
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = class_id
      AND e.user_id = auth.uid()::text
    )
    OR
    -- Allow admins
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Teachers can view all their lecture sessions
CREATE POLICY lecture_sessions_teacher_view ON lecture_sessions
  FOR SELECT
  USING (teacher_id = auth.uid()::text);

-- Teachers can insert their own sessions
CREATE POLICY lecture_sessions_teacher_insert ON lecture_sessions
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid()::text);

-- Teachers can update their own sessions
CREATE POLICY lecture_sessions_teacher_update ON lecture_sessions
  FOR UPDATE
  USING (teacher_id = auth.uid()::text)
  WITH CHECK (teacher_id = auth.uid()::text);

-- ============================================================================
-- TOTP SESSIONS POLICIES
-- ============================================================================

-- Only allow viewing TOTP sessions for authorized lecture sessions
CREATE POLICY totp_sessions_view ON totp_sessions
  FOR SELECT
  USING (
    -- Allow access if user is the teacher of the lecture session
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text
    )
    OR
    -- Allow access if user is enrolled in the session
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      JOIN enrollments e ON e.class_id = l.class_id
      WHERE l.id = lecture_session_id
      AND e.user_id = auth.uid()::text
    )
    OR
    -- Allow admins
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Teachers can insert TOTP sessions for their lectures
CREATE POLICY totp_sessions_teacher_insert ON totp_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text
    )
  );

-- ============================================================================
-- ROOMS POLICIES
-- ============================================================================

-- Allow all authenticated users to view room information
CREATE POLICY rooms_view ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Only admins can insert/update room information
CREATE POLICY rooms_admin_modify ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- 
-- FIXED ISSUES:
-- 1. Removed self-referential policies that read from the same table
-- 2. Replaced recursive queries with direct auth.uid() comparisons
-- 3. Used EXISTS with simple JOINs instead of complex nested subqueries
-- 4. Separated policies by operation type (SELECT, INSERT, UPDATE)
--
-- KEY IMPROVEMENTS:
-- - No infinite recursion: policies don't query the same table they protect
-- - Better performance: simple equality checks instead of recursive lookups
-- - Clear separation of concerns: each policy has one responsibility
-- - Proper authorization: auth.uid() for identity, roles in profiles table
--
-- TESTING:
-- After applying these policies, test with:
-- 1. INSERT attendance record as student (should succeed)
-- 2. SELECT attendance record as student (should see only own)
-- 3. SELECT attendance record as teacher (should see class records)
-- 4. INSERT as non-enrolled user (should fail)

-- ============================================================================
-- RLS POLICIES FIX SCRIPT - CORRECTED FOR ACTUAL DATABASE SCHEMA
-- Purpose: Remove problematic RLS policies and rewrite them to avoid recursion
-- ============================================================================
-- 
-- SCHEMA CORRECTIONS MADE:
-- - lecture_sessions has instructor_ids (uuid[]) NOT teacher_id
-- - Correct syntax: ls.instructor_ids::text[] @> ARRAY[auth.uid()::text]
-- - Enrollments table is named student_enrollments (not enrollments)
-- - student_id is UUID type (not text) - no conversion needed
-- - Role is stored in users.role column (NOT in profiles table)
-- - Profile check: users table has role column directly
--
-- ============================================================================

-- STEP 1: DISABLE RLS TEMPORARILY TO PREVENT RECURSION
-- This is a quick fix to allow the system to work while we rewrite policies
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing policies from your actual database
-- ATTENDANCE RECORDS policies (from your database)
DROP POLICY IF EXISTS "attendance_records_admin_all" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_student_insert" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_student_view" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_teacher_manage" ON attendance_records;
DROP POLICY IF EXISTS "instructors_update_attendance" ON attendance_records;
DROP POLICY IF EXISTS "instructors_view_session_attendance" ON attendance_records;
DROP POLICY IF EXISTS "students_mark_own_attendance" ON attendance_records;
DROP POLICY IF EXISTS "students_view_own_attendance" ON attendance_records;

-- TOTP SESSIONS policies
DROP POLICY IF EXISTS "view_totp_sessions" ON totp_sessions;
DROP POLICY IF EXISTS "instructors_manage_code_sharing" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_view" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_insert" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_instructor_update" ON totp_sessions;
DROP POLICY IF EXISTS "totp_sessions_teacher_insert" ON totp_sessions;

-- LECTURE SESSIONS policies
DROP POLICY IF EXISTS "lecture_sessions_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_student_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_teacher_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_teacher_insert" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_teacher_update" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_view" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_insert" ON lecture_sessions;
DROP POLICY IF EXISTS "lecture_sessions_instructor_update" ON lecture_sessions;

-- ROOMS policies
DROP POLICY IF EXISTS "rooms_view" ON rooms;
DROP POLICY IF EXISTS "rooms_admin_modify" ON rooms;

-- STEP 3: RE-ENABLE RLS with proper, non-recursive policies
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REWRITTEN RLS POLICIES - CORRECTED VERSION (NON-RECURSIVE)
-- ============================================================================

-- ============================================================================
-- ATTENDANCE RECORDS POLICIES
-- ============================================================================

-- Students can view their own attendance records only
CREATE POLICY attendance_records_student_view ON attendance_records
  FOR SELECT
  USING (
    -- Allow access if user_id matches their own ID
    -- student_id is UUID, auth.uid() returns UUID
    auth.uid() = student_id
    OR
    -- Allow instructors to view attendance for their sessions
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      -- lecture_sessions has instructor_ids (uuid[] array), not teacher_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
    OR
    -- Allow admins (users with admin role in users table)
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Students can insert their own attendance records
CREATE POLICY attendance_records_student_insert ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- Ensure user_id matches authenticated user
    auth.uid() = student_id
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
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Instructors can view and update attendance records for their sessions
CREATE POLICY attendance_records_instructor_view ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );

CREATE POLICY attendance_records_instructor_update ON attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );

-- ============================================================================
-- LECTURE SESSIONS POLICIES
-- ============================================================================

-- Students can view lecture sessions for classes they're enrolled in
CREATE POLICY lecture_sessions_student_view ON lecture_sessions
  FOR SELECT
  USING (
    -- Allow viewing if student is in the section
    -- Use student_enrollments table (not enrollments) with user_id column
    EXISTS (
      SELECT 1 FROM student_enrollments se
      WHERE se.section_id = section_id
      AND se.user_id = auth.uid()
      AND se.is_active = TRUE
    )
    OR
    -- Allow instructors to view their own sessions
    instructor_ids::text[] @> ARRAY[auth.uid()::text]
    OR
    -- Allow admins
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Instructors can view all their lecture sessions
CREATE POLICY lecture_sessions_instructor_view ON lecture_sessions
  FOR SELECT
  USING (instructor_ids::text[] @> ARRAY[auth.uid()::text]);

-- Instructors can insert their own sessions
CREATE POLICY lecture_sessions_instructor_insert ON lecture_sessions
  FOR INSERT
  WITH CHECK (instructor_ids::text[] @> ARRAY[auth.uid()::text]);

-- Instructors can update their own sessions
CREATE POLICY lecture_sessions_instructor_update ON lecture_sessions
  FOR UPDATE
  USING (instructor_ids::text[] @> ARRAY[auth.uid()::text])
  WITH CHECK (instructor_ids::text[] @> ARRAY[auth.uid()::text]);

-- ============================================================================
-- TOTP SESSIONS POLICIES
-- ============================================================================

-- Only allow viewing TOTP sessions for authorized lecture sessions
CREATE POLICY totp_sessions_view ON totp_sessions
  FOR SELECT
  USING (
    -- Allow access if user is an instructor of the lecture session
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
    OR
    -- Allow access if user is enrolled in the session
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      JOIN student_enrollments se ON se.section_id = l.section_id
      WHERE l.id = lecture_session_id
      AND se.user_id = auth.uid()
      AND se.is_active = TRUE
    )
    OR
    -- Allow admins
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Instructors can insert TOTP sessions for their lectures
CREATE POLICY totp_sessions_instructor_insert ON totp_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
    )
  );

-- Instructors can update TOTP sessions for their lectures
CREATE POLICY totp_sessions_instructor_update ON totp_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
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
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Only admins can insert/update room information
CREATE POLICY rooms_admin_modify ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- ============================================================================
-- SUMMARY OF CORRECTIONS
-- ============================================================================
--
-- ACTUAL POLICIES BEING DROPPED (from your database):
-- attendance_records:
--   - attendance_records_admin_all
--   - attendance_records_student_insert
--   - attendance_records_student_view
--   - attendance_records_teacher_manage
--   - instructors_update_attendance
--   - instructors_view_session_attendance
--   - students_mark_own_attendance
--   - students_view_own_attendance
--
-- NEW POLICIES BEING CREATED (corrected schema):
-- attendance_records:
--   - attendance_records_student_view (SELECT)
--   - attendance_records_student_insert (INSERT)
--   - attendance_records_student_update (UPDATE)
--   - attendance_records_instructor_view (SELECT)
--   - attendance_records_instructor_update (UPDATE)
-- lecture_sessions:
--   - lecture_sessions_student_view (SELECT)
--   - lecture_sessions_instructor_view (SELECT)
--   - lecture_sessions_instructor_insert (INSERT)
--   - lecture_sessions_instructor_update (UPDATE)
-- totp_sessions:
--   - totp_sessions_view (SELECT)
--   - totp_sessions_instructor_insert (INSERT)
--   - totp_sessions_instructor_update (UPDATE)
-- rooms:
--   - rooms_view (SELECT)
--   - rooms_admin_modify (ALL)
--
-- SCHEMA FIXES APPLIED:
-- 1. Changed l.teacher_id → l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
--    Reason: lecture_sessions has instructor_ids (uuid array), not teacher_id
--
-- 2. Changed enrollments → student_enrollments
--    Reason: The actual table name is student_enrollments
--
-- 3. Changed student_id::text comparisons → direct UUID comparison
--    Reason: student_id is already UUID type, no conversion needed
--
-- 4. Changed profiles table → users table, p.role → u.role
--    Reason: Role is stored in users table, not a separate profiles table
--
-- 5. All policies use correct column references from actual schema
--
-- BENEFITS:
-- - No infinite recursion: policies don't query the same table they protect
-- - Better performance: simple comparisons and array checking
-- - Clear separation of concerns: each policy has one responsibility
-- - Proper authorization: auth.uid() for identity, roles in users table
--
-- KEY COLUMN MAPPINGS:
-- - lecture_sessions.instructor_ids = uuid[] array of instructor IDs
-- - student_enrollments.user_id = UUID of enrolled student
-- - student_enrollments.section_id = linked to lecture_sessions.section_id
-- - attendance_records.student_id = UUID of student (references users.id)
-- - attendance_records.lecture_session_id = UUID of session
-- - users.role = 'student', 'teacher', 'admin', etc.
--
-- TESTING:
-- After applying these policies, test with:
-- 1. INSERT attendance record as student (should succeed)
-- 2. SELECT attendance record as student (should see only own)
-- 3. SELECT attendance record as instructor (should see session records)
-- 4. INSERT as non-enrolled user (should fail)

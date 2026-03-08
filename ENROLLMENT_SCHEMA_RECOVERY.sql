-- ============================================================================
-- ENROLLMENT DATA SCHEMA FIX
-- ============================================================================
-- Issue: Two table structures exist:
-- 1. Pre-enrollment table: email, enrollment_no, first_name, last_name, is_active
-- 2. student_enrollments table: student_id, section_id, course_id, is_active
--
-- ============================================================================

-- ============================================================================
-- Step 1: Create Pre-Enrollment Table (if it doesn't exist)
-- ============================================================================
-- This table holds bulk-imported enrollment data from the institution
-- Students claim this enrollment by signing up with their email

CREATE TABLE IF NOT EXISTS pending_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  
  -- Import data from enrollment system
  email varchar(255) NOT NULL,
  enrollment_no varchar(50) NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  
  -- Link to academic structure
  section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
  
  -- Student self-enrollment
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT false,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  CONSTRAINT unique_enrollment_per_university UNIQUE(university_id, enrollment_no)
);

COMMENT ON TABLE pending_enrollments IS 'Pre-enrollment data imported from institution enrollment system. Students claim by signing up.';
CREATE INDEX IF NOT EXISTS idx_pending_enrollments_email ON pending_enrollments(email, university_id);
CREATE INDEX IF NOT EXISTS idx_pending_enrollments_enrollment_no ON pending_enrollments(enrollment_no, university_id);

-- ============================================================================
-- Step 2: Fix the Trigger - Update to match your actual table structure
-- ============================================================================
-- Drop old trigger
DROP TRIGGER IF EXISTS activate_student_enrollment_on_user_create ON users;
DROP FUNCTION IF EXISTS activate_student_enrollment() CASCADE;

-- Create NEW trigger that works with pending_enrollments table
CREATE OR REPLACE FUNCTION activate_student_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process for student role
  IF NEW.role = 'student' AND NEW.enrollment_id IS NOT NULL THEN
    RAISE NOTICE '[TRIGGER] Activating enrollment for student %: enrollment_id=%', 
      NEW.id, NEW.enrollment_id;
    
    -- Update pending_enrollments table (the pre-enrollment data)
    -- Match by: university_id AND enrollment_no = user.enrollment_id
    UPDATE pending_enrollments
    SET 
      user_id = NEW.id,
      is_active = true,
      updated_at = now()
    WHERE university_id = NEW.university_id
      AND enrollment_no = NEW.enrollment_id
      AND is_active = false;
    
    IF FOUND THEN
      RAISE NOTICE '[TRIGGER] ✅ Activated pending enrollment for enrollment_no %', NEW.enrollment_id;
      RETURN NEW;
    END IF;
    
    RAISE NOTICE '[TRIGGER] ⚠️ No pending enrollment found: university=%, enrollment_no=%', 
      NEW.university_id, NEW.enrollment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER activate_student_enrollment_on_user_create
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION activate_student_enrollment();

-- ============================================================================
-- Step 3: Create View for Display (solves RLS + foreign key display)
-- ============================================================================
-- This view joins pre-enrollment data with foreign key names
-- Allows selective RLS without exposing all tables

DROP VIEW IF EXISTS enrollment_display_info CASCADE;

CREATE VIEW enrollment_display_info AS
SELECT 
  pe.id,
  pe.email,
  pe.enrollment_no,
  pe.first_name,
  pe.last_name,
  pe.is_active,
  pe.user_id,
  pe.university_id,
  
  -- Section info (join through section_id)
  s.name AS section_name,
  
  -- Program info from section
  p.name AS program_name,
  
  -- Branch info from section
  b.name AS branch_name,
  
  -- Semester info from section
  sem.name AS semester_name
  
FROM pending_enrollments pe
LEFT JOIN sections s ON pe.section_id = s.id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN branches b ON s.branch_id = b.id
LEFT JOIN semesters sem ON s.semester_id = sem.id;

-- Grant select access to authenticated users
GRANT SELECT ON enrollment_display_info TO authenticated;

COMMENT ON VIEW enrollment_display_info IS 
'Allows students to view their enrollment data including foreign key names. Reduces need for public RLS on all tables.';

-- ============================================================================
-- Step 4: Create Query Helper for StudentSignUpScreen
-- ============================================================================
-- This query the app should use (returns data + names)

/*
-- Query to execute in StudentSignUpScreen.tsx verifyEmailEnrollment():
SELECT 
  pe.id,
  pe.email,
  pe.enrollment_no,
  pe.first_name,
  pe.last_name,
  pe.is_active,
  (SELECT name FROM sections WHERE id = pe.section_id LIMIT 1) AS section_name,
  (SELECT name FROM programs WHERE id IN (
    SELECT program_id FROM sections WHERE id = pe.section_id
  ) LIMIT 1) AS program_name,
  (SELECT name FROM branches WHERE id IN (
    SELECT branch_id FROM sections WHERE id = pe.section_id
  ) LIMIT 1) AS branch_name,
  (SELECT name FROM semesters WHERE id IN (
    SELECT semester_id FROM sections WHERE id = pe.section_id
  ) LIMIT 1) AS semester_name
FROM pending_enrollments pe
WHERE pe.university_id = $1 
  AND pe.is_active = false
  AND pe.email ILIKE $2;
*/

-- ============================================================================
-- Step 5: Figure Out Your Current Table
-- ============================================================================
-- Run this query to see what tables have email + enrollment_no columns:

/*
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('email', 'enrollment_no', 'enrollment_id')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
*/

-- This will tell you the actual table name you're using for pre-enrollment data

-- ============================================================================
-- Step 6: Update the StudentSignUpScreen query
-- ============================================================================
-- Replace this in verifyEmailEnrollment():

-- CURRENT (broken):
/*
.from('student_enrollments')
.select(`
  id,
  email,
  enrollment_no,
  ...
`)
*/

-- SHOULD BE (fixed):
/*
.from('pending_enrollments')  // or whatever your actual table is called
.select(`
  id,
  email,
  enrollment_no,
  first_name,
  last_name,
  is_active,
  section_id,
  (SELECT name FROM sections WHERE id = section_id) as section_name,
  (SELECT name FROM programs WHERE id = (SELECT program_id FROM sections WHERE id = section_id)) as program_name,
  (SELECT name FROM branches WHERE id = (SELECT branch_id FROM sections WHERE id = section_id)) as branch_name,
  (SELECT name FROM semesters WHERE id = (SELECT semester_id FROM sections WHERE id = section_id)) as semester_name
`)
.eq('university_id', selectedUniversity?.id)
.eq('is_active', false)
.ilike('email', email)
*/

-- ============================================================================
-- Step 7: Smart RLS Policy (No public access needed!)
-- ============================================================================
-- Instead of making tables public, use policies on pending_enrollments view

/*
-- Allow students to read their own enrollment data
CREATE POLICY "users_view_own_enrollment"
ON pending_enrollments
FOR SELECT
TO authenticated
USING (
  (SELECT university_id FROM users WHERE id = auth.uid() LIMIT 1) = university_id
);

-- Allow anyone to search for enrollment by email (for signup verification)
CREATE POLICY "public_search_by_email"
ON pending_enrollments
FOR SELECT
TO anon, authenticated
USING (is_active = false);  // Only show unclaimed enrollments
*/

-- ============================================================================
-- STEP-BY-STEP IMPLEMENTATION GUIDE
-- ============================================================================
-- 
-- 1. First, IDENTIFY your current table:
--    Run the query in Step 5 above to see which table has email + enrollment_no
-- 
-- 2. If table is called something OTHER than 'pending_enrollments':
--    Update all references in the SQL above to match your table name
-- 
-- 3. Create the pre-enrollment table and/or view (Step 1 or 3)
-- 
-- 4. Create/update the trigger (Step 2)
-- 
-- 5. Apply smart RLS policies (Step 7)
-- 
-- 6. Update StudentSignUpScreen.tsx to query from the correct table
-- 
-- 7. Test signup flow
--
-- ============================================================================

-- ============================================================================
-- TRIGGER: Auto-activate student enrollment on user creation
-- ============================================================================
-- Purpose: When a student user is created, automatically activate their
--          corresponding enrollment record AND set user_id
--
-- How it works:
-- 1. Student signs up with email and enrollment_id (e.g., "0801CS221155")
-- 2. User record created in users table with role='student' and enrollment_id
-- 3. This trigger fires automatically
-- 4. Finds the matching enrollment in student_enrollments by enrollment_no
-- 5. Sets is_active = true AND user_id = new_user.id
--
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS activate_student_enrollment_on_user_create ON users;
DROP FUNCTION IF EXISTS activate_student_enrollment() CASCADE;

-- Create the trigger function
CREATE OR REPLACE FUNCTION activate_student_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  -- Only process for student role
  IF NEW.role = 'student' AND NEW.enrollment_id IS NOT NULL THEN
    -- Log what we're doing
    RAISE NOTICE '[TRIGGER] Activating enrollment for student %: enrollment_id=%', 
      NEW.id, NEW.enrollment_id;
    
    -- Match enrollment by university_id + enrollment_no and UPDATE BOTH is_active AND user_id
    UPDATE student_enrollments
    SET is_active = true,
        user_id = NEW.id,
        updated_at = now()
    WHERE university_id = NEW.university_id
      AND enrollment_no = NEW.enrollment_id
      AND is_active = false;
    
    -- Check how many rows were updated
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated > 0 THEN
      RAISE NOTICE '[TRIGGER] ✅ Activated % enrollment(s) for enrollment_id=% and set user_id=%', 
        v_rows_updated, NEW.enrollment_id, NEW.id;
      RETURN NEW;
    END IF;
    
    RAISE NOTICE '[TRIGGER] ⚠️ No inactive enrollment found: university=%, enrollment_id=%', 
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

COMMENT ON FUNCTION activate_student_enrollment() IS 
'Automatically activates student enrollment and sets user_id when user is created. Runs with database owner privileges to bypass RLS.';

COMMENT ON TRIGGER activate_student_enrollment_on_user_create ON users IS 
'Trigger that fires when a new user is inserted. For student role, activates matching enrollment record and links it to the user.';
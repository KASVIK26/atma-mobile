-- ============================================================================
-- TRIGGER: Activate instructor when user registers as teacher
-- When a teacher completes signup, mark their instructor record as active
-- and link the user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_teacher_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new user has role 'teacher', find matching instructor and activate
  IF NEW.role = 'teacher' THEN
    UPDATE instructors
    SET 
      is_active = true,
      user_id = NEW.id,
      updated_at = now()
    WHERE 
      email = NEW.email 
      AND university_id = NEW.university_id
      AND is_active = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_activate_teacher_on_signup ON users;

-- Create trigger that fires AFTER INSERT on users table
CREATE TRIGGER trigger_activate_teacher_on_signup
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION activate_teacher_on_signup();

-- ============================================================================
-- COMMENT
-- ============================================================================
COMMENT ON FUNCTION activate_teacher_on_signup() IS 'Automatically activates instructor record when teacher completes signup via mobile app. Sets is_active=true and links user_id.';

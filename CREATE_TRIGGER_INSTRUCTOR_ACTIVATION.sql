-- ============================================================================
-- TEACHER SIGNUP AUTO-ACTIVATION TRIGGER
-- ============================================================================
-- This trigger automatically activates instructor records when a new teacher
-- user account is created. It matches based on email, university_id, and names.
--
-- IMPORTANT: The instructors table must have records with:
-- - email (must match users.email exactly)
-- - university_id (must match users.university_id)
-- - is_active = false (not yet activated)
-- - user_id = NULL (not yet linked to a user)
--
-- When a user with role = 'teacher' is inserted, this trigger will:
-- 1. Find matching instructor record by email + university_id
-- 2. Set is_active = true
-- 3. Set user_id = new_user.id
-- 4. Update updated_at timestamp
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_teacher_user_created ON "public"."users";
DROP FUNCTION IF EXISTS activate_instructor_on_user_creation();

-- Create the trigger function
CREATE OR REPLACE FUNCTION activate_instructor_on_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the new user has role = 'teacher'
  IF NEW.role = 'teacher' THEN
    -- Update the matching instructor record
    UPDATE "public"."instructors"
    SET
      is_active = true,
      user_id = NEW.id,
      updated_at = NOW()
    WHERE
      "university_id" = NEW.university_id
      AND "email" = NEW.email
      AND "is_active" = false
      AND "user_id" IS NULL;
    
    -- Log the result
    RAISE NOTICE 'Instructor activation trigger executed for user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_teacher_user_created
AFTER INSERT ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION activate_instructor_on_user_creation();

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the trigger works)
-- ============================================================================

-- Check if trigger exists
-- SELECT trigger_name FROM information_schema.triggers WHERE table_name = 'users';

-- Test: Create a test instructor record first
-- INSERT INTO "public"."instructors" 
-- ("id", "university_id", "name", "code", "email", "phone", "department", 
--  "bio", "profile_picture_url", "is_active", "created_at", "updated_at")
-- VALUES
-- (gen_random_uuid(), '755283d3-80d9-4a86-b657-9974694f9f43', 'Test Teacher', 
--  'TT', 'testteacher@example.com', '', 'Computer Science', '', NULL, 
--  false, NOW(), NOW());

-- Then create user and trigger should auto-activate instructor
-- INSERT INTO "public"."users"
-- ("id", "university_id", "email", "first_name", "last_name", "role", 
--  "is_active", "created_at", "updated_at")
-- VALUES
-- (gen_random_uuid(), '755283d3-80d9-4a86-b657-9974694f9f43', 
--  'testteacher@example.com', 'Test', 'Teacher', 'teacher', 
--  true, NOW(), NOW());

-- Verify instructor was activated:
-- SELECT "id", "email", "is_active", "user_id" FROM "public"."instructors" 
-- WHERE "email" = 'testteacher@example.com';

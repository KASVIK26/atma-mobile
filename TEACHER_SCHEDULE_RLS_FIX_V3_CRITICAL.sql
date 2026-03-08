-- ============================================================================
-- CRITICAL FIX: Add Missing UUID Type Cast to Instructor View Policy
-- ============================================================================
--
-- Issue Found: The ::uuid cast was stripped from auth.uid() 
-- This causes UUID array comparison to fail silently
--
-- Current (BROKEN):
--   (instructor_ids @> ARRAY[auth.uid()])
--
-- Fixed:
--   (instructor_ids @> ARRAY[auth.uid()::uuid])
--
-- ============================================================================

-- Drop the broken instructor_view policy
DROP POLICY IF EXISTS "lecture_sessions_instructor_view" ON lecture_sessions;

-- Create the corrected policy with explicit UUID type cast
CREATE POLICY "lecture_sessions_instructor_view"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    instructor_ids @> ARRAY[auth.uid()::uuid]
  );

-- Verify it was created correctly
SELECT 
  policyname,
  qual as condition
FROM pg_policies
WHERE tablename = 'lecture_sessions'
  AND policyname = 'lecture_sessions_instructor_view';

-- ============================================================================
-- Expected output:
-- lecture_sessions_instructor_view | (instructor_ids @> ARRAY[auth.uid()::uuid])
-- ============================================================================

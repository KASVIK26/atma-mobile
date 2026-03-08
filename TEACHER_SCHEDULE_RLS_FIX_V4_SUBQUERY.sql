-- ============================================================================
-- TEACHER SCHEDULE RLS FIX V4: QUERY-BASED APPROACH
-- ============================================================================
--
-- Previous approach (type casting) didn't work because:
-- - PostgreSQL keeps stripping the ::uuid cast
-- - Supabase RLS might handle type casting differently
--
-- New approach:
-- - Query instructors table to get instructor ID for current user
-- - Check if that ID is in the instructor_ids array
-- - Much more reliable and explicit
--
-- ============================================================================

-- Drop the broken instructor_view policy
DROP POLICY IF EXISTS "lecture_sessions_instructor_view" ON lecture_sessions;

-- Create the corrected policy using subquery approach
CREATE POLICY "lecture_sessions_instructor_view"
  ON lecture_sessions FOR SELECT
  to public
  USING (
    -- Get the instructor ID for the current user and check if it's in the array
    instructor_ids @> ARRAY[
      (
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    ]
  );

-- Also fix the insert policy
DROP POLICY IF EXISTS "lecture_sessions_instructor_insert" ON lecture_sessions;

CREATE POLICY "lecture_sessions_instructor_insert"
  ON lecture_sessions FOR INSERT
  to public
  WITH CHECK (
    instructor_ids @> ARRAY[
      (
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    ]
  );

-- Also fix the update policy
DROP POLICY IF EXISTS "lecture_sessions_instructor_update" ON lecture_sessions;

CREATE POLICY "lecture_sessions_instructor_update"
  ON lecture_sessions FOR UPDATE
  to public
  USING (
    instructor_ids @> ARRAY[
      (
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    ]
  )
  WITH CHECK (
    instructor_ids @> ARRAY[
      (
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    ]
  );

-- Also fix the delete policy
DROP POLICY IF EXISTS "lecture_sessions_instructor_delete" ON lecture_sessions;

CREATE POLICY "lecture_sessions_instructor_delete"
  ON lecture_sessions FOR DELETE
  to public
  USING (
    instructor_ids @> ARRAY[
      (
        SELECT id FROM instructors 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    ]
  );

-- ============================================================================
-- Verify policies were created
-- ============================================================================

SELECT 
  policyname,
  qual as condition
FROM pg_policies
WHERE tablename = 'lecture_sessions'
  AND policyname LIKE 'lecture_sessions_instructor%'
ORDER BY policyname;

-- ============================================================================
-- Expected output should show all 4 policies with subquery logic
-- ============================================================================

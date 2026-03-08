-- ============================================================================
-- RLS POLICY DIAGNOSTIC FOR LECTURE_SESSIONS
-- ============================================================================

-- Context:
-- Teacher ID: 532bc75b-c907-4b8b-b675-661cba483195
-- Instructor ID: 1bd061a5-6104-4fb1-b8b1-e5c65f60811a
-- University ID: 755283d3-80d9-4a86-b657-9974694f9f43
-- Issue: Supabase query returns 0 sessions, but SQL returns 305

-- ============================================================================
-- 1. Check all RLS policies on lecture_sessions table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;

-- ============================================================================
-- 2. Check if RLS is enabled on lecture_sessions
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'lecture_sessions';

-- ============================================================================
-- 3. Check if table has any policies that block teachers
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'lecture_sessions'
  AND roles::text LIKE '%teacher%' OR roles::text LIKE '%authenticated%';

-- ============================================================================
-- 4. Get the actual policy definitions for inspection
-- ============================================================================
SELECT 
  policyname,
  qual as select_condition,
  with_check as write_condition,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'lecture_sessions'
ORDER BY policyname;

-- ============================================================================
-- 5. Check if current_user_id() or auth.uid() is blocking access
-- ============================================================================
-- This helps understand if the RLS is checking user_id field
SELECT 
  EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lecture_sessions' 
      AND qual::text ILIKE '%auth.uid%'
  ) as has_auth_uid_policy,
  EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lecture_sessions' 
      AND qual::text ILIKE '%current_user_id%'
  ) as has_current_user_id_policy;

-- ============================================================================
-- 6. Try to fetch via Supabase simulation (what the app does)
-- ============================================================================
-- This simulates what Supabase client does
SELECT 
  COUNT(*) as result_count
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28';

-- ============================================================================
-- 7. Test direct array filter (what the client-side code does)
-- ============================================================================
SELECT 
  COUNT(*) as sessions_with_instructor,
  COUNT(*) FILTER (WHERE '1bd061a5-6104-4fb1-b8b1-e5c65f60811a' = ANY(instructor_ids)) as sessions_for_this_instructor
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28';

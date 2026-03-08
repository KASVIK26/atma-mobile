-- ============================================================================
-- TEACHER SCHEDULE DIAGNOSTIC QUERIES
-- Use these to identify why instructor schedule is empty
-- ============================================================================

-- Context from logs:
-- Instructor ID: 1bd061a5-6104-4fb1-b8b1-e5c65f60811a
-- University ID: 755283d3-80d9-4a86-b657-9974694f9f43
-- Date range: 2026-01-28 to 2026-05-28

-- ============================================================================
-- 1. Check if any lecture_sessions exist for this university
-- ============================================================================
SELECT 
  COUNT(*) as total_sessions,
  MIN(session_date) as earliest_date,
  MAX(session_date) as latest_date,
  COUNT(DISTINCT course_id) as unique_courses,
  COUNT(DISTINCT section_id) as unique_sections
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false;

-- ============================================================================
-- 2. Check if lecture_sessions exist in the specific date range
-- ============================================================================
SELECT 
  COUNT(*) as sessions_in_range,
  MIN(session_date) as min_date,
  MAX(session_date) as max_date
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28'
  AND is_active = true
  AND is_cancelled = false;

-- ============================================================================
-- 3. Sample lecture_sessions with instructor_ids (first 5)
-- ============================================================================
SELECT 
  id,
  course_id,
  session_date,
  start_time,
  end_time,
  instructor_ids,
  array_length(instructor_ids, 1) as instructor_count,
  is_active,
  is_cancelled
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND is_active = true
  AND is_cancelled = false
ORDER BY session_date DESC
LIMIT 5;

-- ============================================================================
-- 4. Check if instructor_ids array contains this specific instructor
-- ============================================================================
SELECT 
  id,
  course_id,
  session_date,
  start_time,
  instructor_ids,
  '1bd061a5-6104-4fb1-b8b1-e5c65f60811a' = ANY(instructor_ids) as contains_instructor
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28'
  AND is_active = true
  AND is_cancelled = false
LIMIT 10;

-- ============================================================================
-- 5. Count sessions with this specific instructor
-- ============================================================================
SELECT 
  COUNT(*) as sessions_for_instructor
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
  AND '1bd061a5-6104-4fb1-b8b1-e5c65f60811a' = ANY(instructor_ids)
  AND session_date >= '2026-01-28'
  AND session_date <= '2026-05-28'
  AND is_active = true
  AND is_cancelled = false;

-- ============================================================================
-- 6. List all instructors for this university
-- ============================================================================
SELECT 
  id,
  code,
  name,
  email,
  is_active
FROM instructors
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
ORDER BY name;

-- ============================================================================
-- 7. Verify instructor record exists
-- ============================================================================
SELECT 
  id,
  code,
  name,
  email,
  user_id,
  is_active
FROM instructors
WHERE id = '1bd061a5-6104-4fb1-b8b1-e5c65f60811a';

-- ============================================================================
-- 8. Check if instructor_ids is being stored as text instead of UUID array
-- ============================================================================
SELECT 
  id,
  instructor_ids,
  pg_typeof(instructor_ids) as type,
  array_length(instructor_ids, 1) as length
FROM lecture_sessions
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
LIMIT 5;

-- ============================================================================
-- 9. List all courses for this university (to seed test data)
-- ============================================================================
SELECT 
  id,
  code,
  name,
  is_active
FROM courses
WHERE university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
LIMIT 10;

-- ============================================================================
-- 10. List all sections for this university (to seed test data)
-- ============================================================================
SELECT 
  s.id,
  s.section_number,
  c.code as course_code,
  c.name as course_name
FROM sections s
JOIN courses c ON s.course_id = c.id
WHERE c.university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
LIMIT 10;

-- ============================================================================
-- 11. List all rooms for this university (to seed test data)
-- ============================================================================
SELECT 
  r.id,
  r.room_number,
  r.room_name,
  b.name as building_name,
  r.is_active
FROM rooms r
LEFT JOIN buildings b ON r.building_id = b.id
WHERE r.university_id = '755283d3-80d9-4a86-b657-9974694f9f43'
LIMIT 10;

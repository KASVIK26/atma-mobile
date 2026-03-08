-- ============================================================================
-- SQL COMMANDS TO FIND AND INSPECT TRIGGERS
-- ============================================================================
-- Run these queries in Supabase SQL Editor to find the actual trigger definitions

-- ============================================================================
-- 1. List ALL triggers in the public schema
-- ============================================================================
SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  ACTION_TIMING,
  EVENT_MANIPULATION
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ============================================================================
-- 2. List triggers specifically for totp_sessions table
-- ============================================================================
SELECT 
  trigger_name,
  event_object_table,
  ACTION_TIMING,
  EVENT_MANIPULATION,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'totp_sessions'
AND event_object_schema = 'public';


-- ============================================================================
-- 3. List triggers specifically for lecture_sessions table
-- ============================================================================
SELECT 
  trigger_name,
  event_object_table,
  ACTION_TIMING,
  EVENT_MANIPULATION,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lecture_sessions'
AND event_object_schema = 'public'
ORDER BY trigger_name;


-- ============================================================================
-- 4. List all trigger function definitions
-- ============================================================================
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND (
  routine_name LIKE '%totp%'
  OR routine_name LIKE '%trigger%'
  OR routine_name LIKE '%populate%'
  OR routine_name LIKE '%notify%'
)
ORDER BY routine_name;


-- ============================================================================
-- 5. Get detailed trigger information including function body
-- ============================================================================
SELECT 
  t.trigger_name,
  t.event_object_table,
  t.action_statement,
  p.proname as function_name,
  p.prosrc as function_definition
FROM information_schema.triggers t
LEFT JOIN pg_proc p ON p.proname = SUBSTRING(t.action_statement FROM 'FUNCTION ([^ (]+)')
WHERE t.event_object_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;


-- ============================================================================
-- 6. Get ALL function definitions in public schema
-- ============================================================================
SELECT 
  p.proname as function_name,
  p.prosrc as function_definition,
  t.typname as return_type
FROM pg_proc p
LEFT JOIN pg_type t ON t.oid = p.prorettype
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY p.proname;


-- ============================================================================
-- 7. Check if there are any disabled triggers
-- ============================================================================
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND is_insert_trigger = 'YES'
OR is_update_trigger = 'YES'
OR is_delete_trigger = 'YES'
ORDER BY event_object_table;


-- ============================================================================
-- 8. Search for trigger that mentions totp or lecture
-- ============================================================================
SELECT 
  t.trigger_name,
  t.event_object_table,
  t.action_statement,
  t.action_timing,
  t.event_manipulation
FROM information_schema.triggers t
WHERE t.event_object_schema = 'public'
AND (
  LOWER(t.action_statement) LIKE '%totp%'
  OR LOWER(t.action_statement) LIKE '%lecture%'
  OR LOWER(t.trigger_name) LIKE '%totp%'
  OR LOWER(t.trigger_name) LIKE '%lecture%'
  OR LOWER(t.trigger_name) LIKE '%populate%'
)
ORDER BY t.event_object_table;


-- ============================================================================
-- 9. Get the actual SQL definition of trigger functions
-- ============================================================================
SELECT 
  p.proname,
  p.prosrc,
  p.prorettype::regtype AS return_type,
  (string_agg(p_args.argname::text, ', '))::text AS argument_names
FROM pg_proc p
LEFT JOIN pg_proc p_args ON p_args.oid = p.oid
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND (
  p.proname LIKE '%totp%'
  OR p.proname LIKE '%trigger%'
  OR p.proname LIKE '%populate%'
)
GROUP BY p.oid, p.proname, p.prosrc, p.prorettype
ORDER BY p.proname;


-- ============================================================================
-- 10. Check current totp_sessions records
-- ============================================================================
SELECT 
  COUNT(*) as total_totp_records,
  COUNT(DISTINCT lecture_session_id) as sessions_with_totp,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM public.totp_sessions;


-- ============================================================================
-- 11. Check how many lecture_sessions exist vs totp_sessions
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM public.lecture_sessions WHERE is_active = TRUE) as total_active_lectures,
  (SELECT COUNT(*) FROM public.lecture_sessions WHERE session_date::DATE = CURRENT_DATE AND is_active = TRUE) as today_lectures,
  (SELECT COUNT(*) FROM public.totp_sessions) as total_totp_sessions,
  (SELECT COUNT(*) FROM public.totp_sessions WHERE lecture_session_id IN (SELECT id FROM public.lecture_sessions WHERE session_date::DATE = CURRENT_DATE)) as today_totp_sessions;


-- ============================================================================
-- 12. Show which lecture_sessions don't have TOTP codes yet (for today)
-- ============================================================================
SELECT 
  ls.id as lecture_session_id,
  ls.session_date,
  ls.start_time,
  c.code as course_code,
  c.name as course_name,
  CASE WHEN ts.id IS NULL THEN 'NO TOTP CODE' ELSE ts.code END as totp_status
FROM public.lecture_sessions ls
LEFT JOIN public.courses c ON ls.course_id = c.id
LEFT JOIN public.totp_sessions ts ON ts.lecture_session_id = ls.id
WHERE ls.session_date::DATE = CURRENT_DATE
AND ls.is_active = TRUE
ORDER BY ls.start_time;

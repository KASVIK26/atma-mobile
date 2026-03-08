-- ============================================================================
-- RLS POLICIES DIAGNOSTIC SCRIPT
-- Purpose: Identify and analyze all RLS policies causing infinite recursion
-- ============================================================================

-- 1. Check all RLS policies on attendance_records table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'attendance_records'
ORDER BY policyname;

-- 2. Check if RLS is enabled on attendance_records
SELECT
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables
WHERE tablename = 'attendance_records';

-- 3. Check all RLS policies across all attendance-related tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('attendance_records', 'lecture_sessions', 'rooms', 'totp_sessions', 'students', 'teachers')
ORDER BY tablename, policyname;

-- 4. Check function definitions that might be used in RLS policies
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('is_student_in_class', 'auth_user_id', 'is_session_ongoing', 'check_attendance_auth')
ORDER BY n.nspname, p.proname;

-- 5. Check if there are any recursive function calls in triggers
SELECT
    t.tablename,
    t.triggername,
    t.eventmanipulation,
    pg_get_triggerdef(tr.oid) as trigger_definition
FROM pg_trigger tr
JOIN pg_tables t ON tr.tgrelid = (t.schemaname||'.'||t.tablename)::regclass
WHERE t.tablename = 'attendance_records'
ORDER BY t.tablename, t.triggername;

-- 6. Show current table structure
\d attendance_records

-- 7. Check role permissions
SELECT 
    grantee,
    privilege_type,
    table_name,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name IN ('attendance_records', 'lecture_sessions', 'rooms', 'totp_sessions')
ORDER BY table_name, grantee;

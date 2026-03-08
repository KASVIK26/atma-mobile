-- ============================================================================
-- Grant authenticated users access to v_attendance_summary view
-- Views bypass RLS of underlying tables when accessed through the view,
-- but the view itself still needs GRANT SELECT.
-- Run this in Supabase → SQL Editor
-- ============================================================================

-- Grant SELECT on the view to all authenticated users.
-- Row-level filtering is handled inside the view's WHERE clause.
GRANT SELECT ON public.v_attendance_summary TO authenticated;

-- Also grant to anon if needed for public dashboards (optional)
-- GRANT SELECT ON public.v_attendance_summary TO anon;

-- Verify grant was applied:
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'v_attendance_summary'
  AND table_schema = 'public';

# Fourth Schema Correction: profiles Table Doesn't Exist

## ❌ Error Found

```
ERROR: 42P01: relation "profiles" does not exist
```

This error occurred because I referenced a `profiles` table that doesn't exist in your database.

---

## The Issue

### What I Wrote (WRONG):
```sql
-- WRONG - profiles table doesn't exist!
EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND p.role = 'admin'
)
```

### Your Actual Schema:
```sql
-- The users table has the role column directly
CREATE TABLE users (
  id uuid PRIMARY KEY,
  ...
  role user_role NOT NULL,    -- ✅ Role is HERE
  first_name varchar(100),
  last_name varchar(100),
  is_active boolean DEFAULT true,
  ...
);
```

---

## The Fix

### Changed From:
```sql
EXISTS (
  SELECT 1 FROM profiles p        -- ❌ Table doesn't exist
  WHERE p.id = auth.uid()
  AND p.role = 'admin'            -- ❌ Wrong table reference
)
```

### Changed To:
```sql
EXISTS (
  SELECT 1 FROM users u           -- ✅ Correct table
  WHERE u.id = auth.uid()
  AND u.role = 'admin'            -- ✅ Correct reference
)
```

---

## Where This Fix Was Applied

This was fixed in 5 places in the RLS policies:

### 1. attendance_records_student_view policy
```sql
-- Allow admins to see attendance
EXISTS (
  SELECT 1 FROM users u          -- ✅ FIXED
  WHERE u.id = auth.uid()
  AND u.role = 'admin'
)
```

### 2. lecture_sessions_student_view policy
```sql
-- Allow admins to see sessions
EXISTS (
  SELECT 1 FROM users u          -- ✅ FIXED
  WHERE u.id = auth.uid()
  AND u.role = 'admin'
)
```

### 3. totp_sessions_view policy
```sql
-- Allow admins to see TOTP sessions
EXISTS (
  SELECT 1 FROM users u          -- ✅ FIXED
  WHERE u.id = auth.uid()
  AND u.role = 'admin'
)
```

### 4. rooms_admin_modify policy
```sql
-- Only admins can modify room info
EXISTS (
  SELECT 1 FROM users u          -- ✅ FIXED
  WHERE u.id = auth.uid()
  AND u.role = 'admin'
)
```

---

## User Role Values

Based on the schema, valid user roles are:

```
- 'admin'      → Full system access
- 'teacher'    → Can create/manage classes and mark attendance
- 'student'    → Can view their own attendance and mark attendance
```

Defined in the `user_role` enum (from TABLES_SCHEMA.sql):
```sql
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
```

---

## Updated File

The corrected file **RLS_POLICIES_FIX_CORRECTED.sql** now uses:

```sql
-- Correct: Query the users table directly for role
EXISTS (
  SELECT 1 FROM users u
  WHERE u.id = auth.uid()
  AND u.role = 'admin'
)
```

---

## Test Query to Verify

Run this in Supabase to verify your users table structure:

```sql
-- Check users table structure
\d users

-- You should see:
--   id (uuid, primary key)
--   role (user_role enum)
--   first_name, last_name
--   university_id
--   email
--   is_active, created_at, updated_at
--   ... other columns

-- Check available roles
SELECT * FROM users LIMIT 5;
-- Look at the role column values
```

---

## Summary: Four Total Schema Corrections

| Issue | Was Using | Actual Schema | Fixed |
|-------|-----------|---------------|-------|
| 1. Teacher Reference | `l.teacher_id` | `l.instructor_ids uuid[]` | ✅ |
| 2. Table Name | `enrollments` | `student_enrollments` | ✅ |
| 3. Enrollment Column | `e.class_id, e.student_id` | `se.section_id, se.user_id` | ✅ |
| 4. Role Table | `profiles.role` | `users.role` | ✅ |

**All 4 corrections have been applied to RLS_POLICIES_FIX_CORRECTED.sql**

---

## Ready to Apply

The file is now fully corrected. Run it in your Supabase SQL editor:

```bash
# In Supabase SQL Editor:
1. Copy all contents of RLS_POLICIES_FIX_CORRECTED.sql
2. Paste into the editor
3. Click "Run"
4. Should complete without errors
5. Test attendance marking in your app
```


# Enrollment Activation Fix - Deployment Guide

## What Was Fixed

### The Problem ❌
- Students could sign up but enrollment `is_active` stayed `false`
- Manual enrollment update in StudentSignUpScreen was failing
- Root cause: Trigger was trying to match by `student_id` column which is **NULL in all rows**

### The Solution ✅
1. **Rewritten database trigger** - Now matches by `university_id + enrollment_id` (actual data)
2. **Removed clunky client-side update code** - Trigger handles it automatically
3. **Added public SELECT access** - App can query reference tables without RLS permission errors

---

## Step 1: Deploy Trigger to Supabase 🚀

### 1.1 Open Supabase SQL Editor
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your database
- Click **SQL Editor** in the left sidebar

### 1.2 Copy & Paste Trigger
1. Open the file: `CREATE_ENROLLMENT_TRIGGER.sql`
2. Select **all content** (Ctrl+A / Cmd+A)
3. Copy entire file
4. In Supabase SQL Editor, paste it completely
5. Click **Execute** button (or Ctrl+Enter)

**Expected Result:**
```
successfully executed
```

### 1.3 Verify Trigger Created
Run this query in Supabase SQL Editor:

```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'activate_student_enrollment%';
```

**Should return:**
```
trigger_name                            | event_object_table
activate_student_enrollment_on_user_create | users
```

---

## Step 2: Test the Trigger 🧪

### 2.1 Get Sample Enrollment Data
```sql
-- Find an unused enrollment  
SELECT id, enrollment_id, university_id, student_id, is_active
FROM student_enrollments
WHERE is_active = false
LIMIT 5;
```

**Note:** You'll see `student_id` is **NULL** - that's why old approach failed!

### 2.2 Create Test User (Simulates Signup)
Replace `test-university-id` and `test-enrollment-id` with real values:

```sql
-- Delete test user if it exists
DELETE FROM users WHERE email = 'trigger-test@example.com';

-- Create test user (this should trigger enrollment activation)
INSERT INTO users (
  email, 
  role, 
  university_id, 
  enrollment_id, 
  first_name,
  is_active
) VALUES (
  'trigger-test@example.com',
  'student',
  'actual-university-id',  -- <- Use real ID from student_enrollments
  'actual-enrollment-id',  -- <- Use real enrollment ID 
  'Test',
  true
);
```

### 2.3 Check Enrollment Activation
```sql
-- Check the enrollment - is_active should now be TRUE
SELECT id, enrollment_id, is_active, updated_at
FROM student_enrollments
WHERE enrollment_id = 'actual-enrollment-id';  -- Use the one you tested
```

**Success if:**
- `is_active = true`
- `updated_at` shows recent timestamp

---

## Step 3: Full Signup Flow Test 📱

### 3.1 Fresh Start
1. **Clear test data** (for clean test):
   ```sql
   DELETE FROM users WHERE email = 'test-student@example.com';
   DELETE FROM mobile_sessions WHERE user_id IN (
     SELECT id FROM users WHERE email = 'test-student@example.com'
   );
   ```

2. **In the app**, complete student signup:
   - Step 1: Select your university
   - Step 2: Enter matching enrollment email
   - Step 3: Enter OTP (check email)
   - Step 4: Enter profile details
   - ✅ Should show "Account created! You can now log in."

### 3.2 Verify Results in Database

**Check user was created:**
```sql
SELECT id, email, role, enrollment_id, is_active
FROM users
WHERE email = 'test-student@example.com';
```

**Check enrollment activation:**
```sql
SELECT id, enrollment_id, is_active, updated_at
FROM student_enrollments
WHERE enrollment_id IN (
  SELECT enrollment_id FROM users WHERE email = 'test-student@example.com'
);
```

**Check device session recorded:**
```sql
SELECT user_id, device_name, is_active
FROM mobile_sessions
WHERE user_id = (SELECT id FROM users WHERE email = 'test-student@example.com')
LIMIT 1;
```

**All should show:**
- ✅ User in `users` table with `role='student'` and `is_active=true`
- ✅ Enrollment in `student_enrollments` with `is_active=true`
- ✅ Session in `mobile_sessions` with `is_active=true`

---

## Step 4: Login & Dashboard Test 🏠

### 4.1 Test Login
1. Go back to app welcome screen
2. Tap "Login here"
3. Enter email + password
4. **Should show StudentDashboard** (not TeacherDashboard)

### 4.2 Check Logs
In browser console (React Native debugger), look for:
```
[Auth State Change] Initial auth state loaded
[fetchUserProfile] Fetching profile...
[fetchUserProfile] Found user: role=student
[AuthContext] Setting userRole = student
```

### 4.3 Session Persistence
1. Kill and restart app
2. **Should stay logged in** (no redirect to login)
3. Should show StudentDashboard immediately

### 4.4 Logout Test
1. Go to Profile → Logout
2. **Should redirect to Welcome screen**
3. Tap "Login" again - should work

---

## What Changed in Code

### StudentSignUpScreen.tsx
**REMOVED:**
- Manual `student_enrollments.update()` call (it was failing anyway)
- Verification query checking `student_id` (it's NULL)
- All the try-catch around enrollment update

**NOW:**
- Simple comment: "Enrollment activation is handled by database trigger"
- Creates user → Trigger auto-activates enrollment
- Much cleaner! ✨

### CREATE_ENROLLMENT_TRIGGER.sql
**NEW APPROACH:**
```sql
-- Match by university_id + enrollment_id (both populated)
WHERE university_id = NEW.university_id
  AND enrollment_id = NEW.enrollment_id  -- ✅ NOT student_id
  AND is_active = false;
```

**OLD APPROACH (broken):**
```sql
WHERE university_id = NEW.university_id
  AND student_id = NEW.id  -- ❌ Always NULL in student_enrollments
```

### Public Access Grants
```sql
GRANT SELECT ON student_enrollments TO anon, authenticated;
GRANT SELECT ON universities TO anon, authenticated;
GRANT SELECT ON programs, branches, semesters, sections TO anon, authenticated;
```

This allows the app to:
- Query enrollments by email during signup (Step 2)
- Display program/branch/semester names (not "Unknown")
- Load university data
- No RLS permission errors

---

## Debugging if Issues Occur

### Scenario 1: "Enrollment not activating"
```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'activate_student_enrollment_on_user_create';

-- Check function
SELECT prosrc FROM pg_proc WHERE proname = 'activate_student_enrollment';

-- Check if enrollment_id is being passed to users table
SELECT enrollment_id FROM users WHERE email = 'test@example.com';

-- Check if enrollment exists
SELECT * FROM student_enrollments 
WHERE enrollment_id = (SELECT enrollment_id FROM users WHERE email = 'test@example.com');
```

### Scenario 2: "Program/branch names show as Unknown"
```sql
-- Check if sections has program_id reference
SELECT id, program_id FROM sections LIMIT 5;

-- Grant was added to programs table
SELECT grantee, privilege_type 
FROM table_privileges 
WHERE table_name = 'programs';
```

### Scenario 3: "Still getting RLS permission errors"
```sql
-- Check if GRANT commands executed
SELECT grantee, privilege_type 
FROM table_privileges 
WHERE table_name IN ('student_enrollments', 'universities', 'programs', 'branches', 'semesters', 'sections')
AND privilege_type = 'SELECT';
```

### View Database Logs
In Supabase → Logs → Function calls/Edge functions - should see trigger execution notices.

---

## Success Checklist ✅

After deployment:

- [ ] Trigger created in Supabase (verified in SQL Editor)
- [ ] Student signup completes (all 4 steps work)
- [ ] User created in `users` table with `role='student'`
- [ ] Enrollment `is_active` changed to `true` (trigger fired)
- [ ] Device session recorded in `mobile_sessions`
- [ ] Login shows StudentDashboard
- [ ] Session persists after app restart
- [ ] Logout redirects to Welcome screen
- [ ] Can login again successfully
- [ ] No "Unknown" program/branch names (public SELECT working)

---

## Questions?

If anything doesn't work:

1. **Check logs** - Browser console and Supabase function logs
2. **Verify trigger** - Run the verification query above
3. **Check enrollment data** - Make sure the enrollment exists and is inactive
4. **Verify GRANTs** - Make sure public SELECT was added

The trigger approach is solid - it handles activation automatically at database level, no client-side code needed! 🎉

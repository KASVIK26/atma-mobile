# Enrollment Activation & User Profile Troubleshooting Guide

## Current Issues

### 1. **Enrollment `is_active` Flag Stays False**
- User completes signup successfully
- System logs show "✅ Enrollment marked as active"
- But database still shows `is_active = false`

### 2. **User Role Remains Null After Signup**
- User is authenticated after OTP
- User profile is created in `users` table
- But `userRole` stays `null` on redirect to home
- Prevents proper dashboard routing

### 3. **Schema vs Implementation Mismatch**
- Current schema has `student_enrollments` with: `id`, `university_id`, `student_id`, `section_id`, `course_id`, `batch`, `enrollment_date`, `is_active`
- Code queries `student_enrollments` for: `email`, `enrollment_no`, `first_name`, `last_name`
- These fields are missing from schema but query works in practice

## Root Causes & Solutions

### Issue 1: RLS Policy Blocking Enrollment Updates

The enrollment update might be silently failing due to Row Level Security (RLS) policies.

#### Check Current RLS Policies:
```sql
-- In Supabase Dashboard → SQL Editor, run:
SELECT tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'student_enrollments'
ORDER BY policyname;
```

#### Current Logging Shows:
- ✅ Enrollment update was attempted
- ✅ No error thrown in code (check line 913-935 in StudentSignUpScreen)
- ❓ But database shows `is_active = false`

This indicates **silent RLS policy rejection** - the update succeeded in the API response but was blocked at the database level.

#### Fix RLS Policy:

**Option 1: Allow Authenticated Users to Update (Recommended)**
```sql
-- Enable authenticated users to update enrollments
CREATE POLICY "update_own_enrollment"
ON "public"."student_enrollments"
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = student_id)
WITH CHECK ((SELECT auth.uid()) = student_id);

-- Allow reading own enrollments
CREATE POLICY "read_own_enrollment"
ON "public"."student_enrollments"
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = student_id);
```

**Option 2: Allow Anonymous/Service Role (Simpler but less secure)**
```sql
-- Quick fix: Allow anon role to update
DROP POLICY IF EXISTS "update_own_enrollment" ON "public"."student_enrollments";

CREATE POLICY "enforce_student_enrollments_update"
ON "public"."student_enrollments"
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
```

### Issue 2: User Role Not Being Fetched After Signup

After signup redirects to home, the router sees `userRole: null` instead of `'student'`.

#### Why This Happens:
1. User OTP verified → session created
2. Redirect to details screen (still no user profile yet)
3. Submit details → create user in `users` table with `role='student'`
4. Redirect to home
5. At this point, fetchUserProfile should fetch the newly created user
6. But logs show profile not found

#### Enhanced Logging Tells Us:
- `[fetchUserProfile]` logs will now show exact query results
- `[Auth State Change]` logs track when profile fetch is triggered
- Check if events are firing in correct order

#### Fix Strategy:
1. **Verify User Was Actually Created**
   ```sql
   SELECT id, email, first_name, last_name, role, is_active 
   FROM users 
   WHERE email = '0801CS221155@sgsits.ac.in'
   LIMIT 1;
   ```

2. **Check if fetchUserProfile Was Called**
   - Look for console logs: `[fetchUserProfile] Starting profile fetch...`
   - If not present, the auth state change listener didn't trigger

3. **If Profile Found but Role Not Set**
   - Check: `role` column has value 'student'
   - Verify profile picture and session data

### Issue 3: Schema Clarification

#### Current Structure Understanding:

**Pre-Enrollment Data Table (Mystery Table):**
- Must exist somewhere with: `id`, `email`, `enrollment_no`, `first_name`, `last_name`, `is_active`
- Code queries this in `verifyEmailEnrollment()` function
- Might be named: `student_enrollments`, `pending_enrollments`, or something custom

**Check What Table You're Actually Querying:**
```sql
-- Find which table has these columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('email', 'enrollment_no', 'is_active') 
  AND table_schema = 'public'
ORDER BY table_name;
```

#### Recommended Schema Structure:

**Option A: Separate Pending Table (Best Practice)**
```sql
-- Pre-enrollment data from student information system
CREATE TABLE pending_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id uuid NOT NULL REFERENCES universities(id),
  email varchar(255) NOT NULL,
  enrollment_no varchar(50) NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  section_id uuid REFERENCES sections(id),
  is_active boolean DEFAULT false,
  claimed_by_user_id uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(university_id, enrollment_no)
);
```

On signup completion, link the new user via foreign key.

**Option B: Extend Current Structure**
If you want to keep `student_enrollments` as the single source:
- Add `email`, `enrollment_no` columns
- Add `created_by_registration` flag to distinguish pre-signup records
- Ensure proper RLS policies

## Debugging Checklist

- [ ] Check RLS policies on `student_enrollments`
- [ ] Verify enrollment record exists BEFORE signup
- [ ] Verify enrollment record is a real row (not stale query)
- [ ] Check if `is_active` update returns any errors (enable verbose logging)
- [ ] Verify user profile with correct role in `users` table
- [ ] Check console logs for `[fetchUserProfile] ✅ User profile found`
- [ ] Verify auth state change events occur in correct order
- [ ] Test direct database update outside app to rule out code issues

## Testing

### Test 1: Manual Enrollment Activation
```sql
-- Find the enrollment that should have been activated
SELECT id, is_active, student_id, created_at
FROM student_enrollments
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8'
LIMIT 1;

-- Try updating it directly
UPDATE student_enrollments
SET is_active = true
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8';

-- Verify update worked
SELECT id, is_active
FROM student_enrollments
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8';
```

### Test 2: Profile Fetch
```sql
-- Verify user exists with role
SELECT id, email, role, is_active, first_name
FROM users
WHERE email = '0801CS221155@sgsits.ac.in';
```

### Test 3: App Logs After Fix
After applying RLS fixes, you should see:
```
[SignUp] ✅ User profile created successfully
[Complete Signup] ✅ Enrollment marked as active (with verified result)
[fetchUserProfile] ✅ User profile found with role: student
[Auth State Change] Event: SIGNED_IN for user: 60f99d30***
[Navigation] Redirecting to main/home (authenticated, has role: student)
```

## Next Steps

1. **Identify the actual enrollment pre-data table structure**
2. **Review and fix RLS policies** (most likely cause of silent failures)
3. **Verify enrollment update actually persists** (use manual SQL test)
4. **Check user profile is fetched with role** (look for profile fetch logs)
5. **Test complete signup flow end-to-end**

## Files Modified in This Session

- `context/AuthContext.tsx` - Enhanced logging in fetchUserProfile, auth state listener
- `screens/StudentSignUpScreen.tsx` - Better enrollment verification and error handling

## Related Files

- `TABLES_SCHEMA.sql` - Current schema definition
- `RLS_POLICY_FIX.md` - RLS policy guidance for other tables

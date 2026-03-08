# Student Enrollment Activation & Login Flow Implementation Guide

## Overview
This guide covers:
1. **Database Trigger** for automatic enrollment activation (recommended approach)
2. **Signup/Login Flow** for students
3. **Troubleshooting** enrollment issues

---

## Part 1: Database Trigger Setup (RECOMMENDED)

### Why Triggers are Better Than Service Key

| Aspect | Trigger | Service Key |
|--------|---------|------------|
| **RLS Bypass** | ✅ Automatic (DB owner) | ⚠️ Manual bypass |
| **Automation** | ✅ Automatic on user creation | ❌ Manual code needed |
| **Security** | ✅ Enforced at DB level | ⚠️ Depends on code |
| **Reliability** | ✅ Always executes | ❌ Can be skipped |
| **Auditable** | ✅ Database logs | ⚠️ Less transparent |

### Step 1: Apply the Trigger

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a **New Query**
3. Copy the entire contents of `CREATE_ENROLLMENT_TRIGGER.sql`
4. Run the query

Expected output:
```
CREATE FUNCTION
CREATE TRIGGER
```

### Step 2: Verify Trigger Creation

Run in SQL Editor:
```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'activate_student_enrollment_on_user_create';

-- Check trigger function
SELECT fn.proname, pg_get_functiondef(fn.oid)
FROM pg_proc fn
WHERE fn.proname = 'activate_student_enrollment';
```

Expected output:
```
trigger_name: activate_student_enrollment_on_user_create
event_object_table: users
```

### Step 3: Test the Trigger

```sql
-- Before signup, check enrollment exists with is_active = false
SELECT id, student_id, is_active, updated_at
FROM student_enrollments
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8'
LIMIT 1;

-- After signup completes, check again
SELECT id, student_id, is_active, updated_at
FROM student_enrollments
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8'
LIMIT 1;

-- Should show: is_active = true
```

---

## Part 2: Updated Signup/Login Flow

### Architecture

```
Welcome Screen
    ↓
Role Selection (Student/Teacher)
    ↓
StudentSignUpScreen
    ├─ Step 1: Select University
    ├─ Step 2: Verify Email from enrollment list
    ├─ Step 3: Enter 8-digit OTP
    ├─ Step 4: Enter first name, last name, phone
    │   └─ Contains: "Already have an account? Login here" link
    └─ Submit → Complete Signup
         ├─ Create user record in users table
         ├─ Trigger auto-activates enrollment (is_active = true)
         └─ Redirect to Home (if signup successful)

LoginScreen
    ├─ Email/Password Login
    ├─ OR divider
    └─ "Don't have an account? Create Account" link
         └─ Goes to RoleSelectionScreen
```

### New UI Components Added

#### 1. StudentSignUpScreen - Step 4 (Details Form)

Added new button:
```tsx
<Pressable onPress={() => router.replace('/(auth)/login')}>
  <Text>Already have an account? <Text style={loginAlternativeLink}>Login here</Text></Text>
</Pressable>
```

**Location**: At the bottom of the details form, below "Back to Verification" button

**Styling**: 
- Gray text with blue link
- Subtle button styling
- Links directly to LoginScreen

**User Flow**:
```
User on step 4 → Realizes they already have account → 
Click "Login here" → Redirected to LoginScreen → 
Can login with existing email/password
```

### How It Works

#### Signup (New User)
1. **University Selection** → Select their institution
2. **Email Verification** → Enter email that matches enrollment record
   - System finds their enrollment record
   - Finds: enrollment_no, program, branch, semester
3. **OTP Verification** → Receive 8-digit code sent to email
   - Code verified on Supabase
   - Auth session created
4. **Details Form** → Enter personal information
   - First name, Last name, Phone
   - Optional: Profile picture
   - Option: Switch to login if already has account
5. **Completion** → Submit details
   - User record created in `users` table
   - **TRIGGER FIRES** → Automatically sets enrollment.is_active = true
   - Session maintained
   - Redirected to home dashboard

#### Login (Existing User)
1. **Email/Password** → Traditional login
2. **Successful login** → Redirected to home dashboard
3. Profile fetched from database
4. Role determined (student/teacher)
5. Dashboard loads

### Comparison

| Scenario | Old Flow | New Flow |
|----------|----------|----------|
| **Signup New User** | Manual enrollment flag | ✅ Automatic trigger |
| **Already Has Account** | Must complete signup anyway | ✅ Can click "Login here" |
| **RLS Block** | Manual error handling | ✅ Trigger bypasses RLS |
| **Code Complexity** | Complex update logic | ✅ Simple: trigger handles it |

---

## Part 3: Code Changes Summary

### Files Modified

#### 1. `CREATE_ENROLLMENT_TRIGGER.sql` (NEW)
- Database trigger function
- Automatically activates enrollment on user creation
- Runs with database owner privileges

#### 2. `StudentSignUpScreen.tsx`
**Added**:
- Login alternative button at bottom of details form
- Routes to LoginScreen if user already has account
- New styles: `loginAlternativeButton`, `loginAlternativeText`, `loginAlternativeLink`

**Enhanced**:
- Better enrollment verification logging
- Shows enrollment activation status
- Continues even if manual update fails (trigger will handle it)

#### 3. `AuthContext.tsx`
**Enhanced**:
- Better profile fetch logging
- Shows when user role is determined
- Tracks auth state changes

---

## Part 4: Troubleshooting

### Symptom: Enrollment Still Shows `is_active = false`

#### Check 1: Verify Trigger Exists
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'activate_student_enrollment_on_user_create';
```

**If empty**: Run `CREATE_ENROLLMENT_TRIGGER.sql` again

#### Check 2: Verify User Was Created
```sql
SELECT id, email, role, is_active, enrollment_id
FROM users
WHERE email = 'student@email.com'
LIMIT 1;
```

**If empty**: User wasn't created (check signup errors)

#### Check 3: Check Enrollment Record
```sql
SELECT id, student_id, is_active, created_at, updated_at
FROM student_enrollments
WHERE id = 'ENROLLMENT_ID'
LIMIT 1;
```

**If is_active = false**:
- Check `updated_at` (should be recent if trigger fired)
- Check if there are multiple enrollment records
- Check `student_id` field matches user id

#### Check 4: View Trigger Logs
```sql
-- PostgreSQL logs (if available in Supabase)
-- Look for NOTICE messages from trigger
SELECT * FROM pg_logs 
WHERE message LIKE '%activate_student%'
ORDER BY timestamp DESC
LIMIT 10;
```

#### Check 5: Test Trigger Manually
```sql
-- Create a test user
INSERT INTO users (
  id, 
  university_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  enrollment_id, 
  is_active
) VALUES (
  'test-user-id-12345',
  '755283d3-80d9-4a86-b657-9974694f9f43',
  'testuser@test.com',
  'Test',
  'User',
  'student',
  '0801CS221155',
  true
)
ON CONFLICT DO NOTHING;

-- Verify trigger fired (check enrollment updated)
SELECT is_active, updated_at FROM student_enrollments 
WHERE enrollment_no = '0801CS221155' OR id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8';
```

### Symptom: User Role Still Null After Signup

#### Console Logs to Check
```
✅ [fetchUserProfile] ✅ User profile found: {"role": "student"}
✅ [Auth State Change] Event: SIGNED_IN 
✅ [AuthContext Routing] {"userRole": "student"}
✅ [Navigation] Redirecting to main/home (authenticated, has role: student)
```

**If role is null**: Check user record in database for missing `role` field

---

## Part 5: Alternative Approaches

### If Trigger Doesn't Work

#### Option A: Service Key (Not Recommended)
```typescript
// Use Supabase client with service key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
);

// In StudentSignUpScreen.tsx completeSignup function
const { error } = await supabaseAdmin
  .from('student_enrollments')
  .update({ is_active: true })
  .eq('id', enrollmentData.id);
```

**Pros**: Simple, direct
**Cons**: Bypasses RLS security, requires service key in client code (UNSAFE)

#### Option B: Edge Function (Recommended Alternative)
Create a Supabase Edge Function that:
- Verifies user identity
- Updates enrollment
- Logs action

```typescript
// app/functions/activate-enrollment.ts
export async function activateEnrollment(enrollmentId: string, userId: string) {
  // Edge function runs with service privileges
  // No RLS issues
  // More secure than service key in client
}
```

#### Option C: Backend API
- Create your own backend endpoint
- Receive user ID and enrollment ID
- Verify authentication
- Update enrollment

---

## Implementation Checklist

- [ ] Read through `CREATE_ENROLLMENT_TRIGGER.sql`
- [ ] Apply trigger in Supabase SQL Editor
- [ ] Verify trigger was created (run verification query)
- [ ] Test trigger with manual INSERT (optional)
- [ ] Review StudentSignUpScreen changes (login alternative link)
- [ ] Review AuthContext changes (enhanced logging)
- [ ] Run full signup flow test
- [ ] Verify enrollment activated in database
- [ ] Check console logs for success messages
- [ ] Test login flow on second attempt
- [ ] Document any custom table structures if found

---

## Key Takeaways

1. **Triggers are the best approach** for automatic enrollment activation
2. **No RLS issues** because triggers run with database owner privileges
3. **Students can switch to login** if they realize they already have an account
4. **Full audit trail** with timestamps showing when enrollment was activated
5. **Scales well** - works for any number of signups

---

## Questions?

Check:
1. **Trigger not firing?** → Run CREATE_ENROLLMENT_TRIGGER.sql again
2. **Enrollment still false?** → Run verification queries in SQL Editor
3. **User role null?** → Check user record has `role` column populated
4. **Login fails?** → Verify email/password match in users table

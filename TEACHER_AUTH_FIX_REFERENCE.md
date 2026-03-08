## TEACHER AUTHENTICATION - COMPLETE FIX GUIDE

### Issues Found & Fixed

#### 1. ❌ ISSUE: instructor_code Property Name Mismatch
**Problem:** Database stores `code` in instructors table, but code was looking for `instructor_code`
**Fixed in:** `screens/TeacherSignUpScreen.tsx` (lines 524-533)
```typescript
// OLD (WRONG):
if (instructorData?.instructor_code) {
  userPayload.instructor_code = instructorData.instructor_code;
}

// NEW (CORRECT):
if (instructorData?.code) {
  userPayload.instructor_code = instructorData.code;
}
```

#### 2. ❌ ISSUE: Database Trigger Not Activating Instructors
**Problem:** Trigger wasn't updating `is_active = true` in instructors table when user created

**Solution Provided:** New SQL trigger in `CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql`
- Automatically activates instructor when matching teacher user is created
- Matches by: `email` + `university_id`
- Sets: `is_active = true`, `user_id = new_user.id`, `updated_at = NOW()`

**How to apply:**
```sql
-- Copy and run all SQL from: /CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql
-- in your Supabase SQL Editor
```

---

### Data Flow Verification

#### Step 1: Instructor Lookup ✅
```
Database: instructors table
├─ name: "Shri Surendra Gupta"
├─ code: "SG"  ← This is what we're now reading
├─ email: "chatgpt1234569@gmail.com"
├─ department: "Computer Science"
└─ is_active: false
```

#### Step 2: TeacherSignUpScreen Captures Data ✅
```
instructorData (from lookup) → Stored in component state
├─ instructorData.code = "SG"  ← Fixed: was looking for instructor_code
├─ instructorData.department = "Computer Science"
├─ instructorData.name = "Shri Surendra Gupta"
└─ instructorData.email = "chatgpt1234569@gmail.com"
```

#### Step 3: User Created in users table ✅
```
INSERT into users:
├─ id: {user_id}
├─ email: "chatgpt1234569@gmail.com"
├─ first_name: "Shri"
├─ last_name: "Surendra Gupta"
├─ role: "teacher"
├─ university_id: {univeristy_id}
├─ instructor_code: "SG"  ← Now correctly populated!
├─ department: "Computer Science"
├─ is_active: true
└─ ... other fields
```

#### Step 4: Trigger Activates Instructor Record ✅ (REQUIRES NEW TRIGGER)
```
UPDATE instructors:
WHERE email = "chatgpt1234569@gmail.com" 
  AND university_id = {university_id}
  AND is_active = false

SET:
├─ is_active = true          ← FIXED by trigger
├─ user_id = {user_id}       ← FIXED by trigger
└─ updated_at = NOW()
```

#### Step 5: AuthContext Fetches Profile ✅
```
onAuthStateChange listener:
├─ Detects session change from OTP verification
├─ Calls fetchUserProfile(user_id)
│  └─ Loads from users table with updated data:
│     ├─ first_name: "Shri"
│     ├─ last_name: "Surendra Gupta"  
│     ├─ instructor_code: "SG"
│     ├─ department: "Computer Science"
│     └─ role: "teacher"
├─ Sets userProfile in AuthContext
└─ AuthContext subscribers (screens) update
```

#### Step 6: Teacher Dashboard Displays Name ✅
```
TeacherDashboard Component:
├─ Reads: userProfile?.first_name = "Shri"
├─ Reads: Current hour for greeting
└─ Renders: "Good afternoon, Shri"  ← Dynamic & Personalized!
```

#### Step 7: Profile Screen Shows Teacher Data ✅
```
ProfileCard Component receives:
├─ name: "Shri Surendra Gupta"
├─ email: "chatgpt1234569@gmail.com"
├─ university: "University Name"
├─ role: "Teacher"
├─ instructorCode: "SG"  ← New!
├─ department: "Computer Science"  ← New!
└─ BottomTabBar: NOT shown (role = 'teacher')
```

---

### STEP-BY-STEP: What You Need to Do Now

#### Step 1: Apply the Database Trigger ⚠️ CRITICAL
1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Copy ALL SQL from: `CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify success: Should see "CREATE TRIGGER" in output

**Verification Query (run after trigger creation):**
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE table_name = 'users';
```
Expected: Should see trigger named `on_teacher_user_created`

#### Step 2: Test Complete Teacher Signup Flow
1. First, **create** an instructor record with test data in Supabase:
```sql
INSERT INTO "public"."instructors" 
("id", "university_id", "name", "code", "email", "department", "is_active", "created_at", "updated_at")
VALUES
(gen_random_uuid(), 
 '755283d3-80d9-4a86-b657-9974694f9f43',  -- Replace with your university ID
 'Test Teacher',
 'TT',
 'testteacher123@example.com',
 'Computer Science',
 false,
 NOW(),
 NOW());
```

2. In the app:
   - Go to Teacher Sign Up
   - Select university → Enter name: "Test Teacher" → Enter email: "testeteacher123@example.com"
   - Click "Send Code"
   - Check your email for 8-digit verification code
   - Enter code
   - You should see alert: "Good afternoon, Test! 👋" (or morning/evening based on time)
   - Dashboard should show dynamic greeting with your name

#### Step 3: Verify Data in Database
After signup completes, run these queries in Supabase SQL Editor:

**Check users table:**
```sql
SELECT id, email, first_name, last_name, instructor_code, department, role, is_active
FROM "public"."users"
WHERE email = 'testteacher123@example.com';
```
Expected: instructor_code = "TT", department = "Computer Science"

**Check instructors table:**
```sql
SELECT id, email, code, is_active, user_id, department
FROM "public"."instructors"
WHERE email = 'testteacher123@example.com';
```
Expected: is_active = true, user_id = NOT NULL (linked to user)

#### Step 4: Verify UI Display
In app after signup:
- [ ] Dashboard shows personalized greeting: "Good [time-of-day], [FirstName]"
- [ ] Profile screen shows: name, email, instructor code, department
- [ ] No BottomTabBar visible (tabs only for students)
- [ ] Profile section shows teacher-specific data

---

### Potential Issues & Solutions

#### Issue: instructor_code Still NULL After Signup
**Cause:** TeacherSignUpScreen looking for wrong property name
**Status:** ✅ FIXED in code
**Action:** No additional action needed - just use updated code

#### Issue: is_active Still FALSE in instructors Table
**Cause:** Trigger not applied or trigger has syntax error
**Status:** ✅ Fixed trigger provided
**Action:** Apply trigger from `CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql`

#### Issue: Teacher Name Not Showing in Dashboard
**Cause:** Could be multiple:
   - Profile not fetched from database
   - AuthContext not updated
   - userProfile is null
**Status:**  Code is correct, if issue persists check:
```typescript
// In TeacherDashboard, lines 230-240:
const firstName = userProfile?.first_name || 'Teacher';
// If showing 'Teacher', means userProfile is null

// Check logs for:
// [fetchUserProfile] ✅ User profile found:
// [Auth State Change] Event: SIGNED_IN
```

#### Issue: BottomTabBar Still Visible for Teachers
**Cause:** MainLayout not checking userRole correctly
**Status:** ✅ FIXED - Lines 7 and 20 in `app/(main)/_layout.tsx`
**Action:** Just use updated code

---

### Code Changes Summary

| File | Change | Line(s) | Status |
|------|--------|---------|--------|
| `screens/TeacherSignUpScreen.tsx` | Changed `instructor_code` to `code` property | 524-533 | ✅ Done |
| `app/(main)/_layout.tsx` | Added userRole check to hide tabs | 7, 20 | ✅ Done |
| `CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql` | New trigger file | New | ✅ Provided |
| `components/ProfileCard.tsx` | Added instructor code/dept display | See previous context | ✅ Done |
| `screens/ProfileScreen.tsx` | Pass teacher fields to ProfileCard | See previous context | ✅ Done |

---

### Next: Teacher Sign-In Implementation

Once signup is working, next step is:
```
Teacher Sign-In Screen (TO DO):
├─ Select University
├─ Enter Email
├─ Receive OTP
├─ Verify OTP
└─ Signed in → Teacher Dashboard
```

Current signup flow can serve as template for signin.

---

### Debug: Enable Console Logging

To troubleshoot, watch for these log messages:

```
[Instructor Lookup] ✅ Instructor found:
[Create User Profile] Payload: { instructor_code: 'SG', department: '...' }
[Create User Profile] ✅ Profile created!
[Activate Instructor] ✅ Instructor record activated!
[Auth State Change] Event: SIGNED_IN
[fetchUserProfile] ✅ User profile found: { first_name: '...', ... }
[fetchUserProfile] Fetching instructor data...
```

If any are missing, check:
1. Trigger SQL errors (check Supabase > Database > Functions)
2. RLS policies on instructors/users tables
3. Network errors in app console
4. AuthContext initialization

---

### Summary Checklist

- [ ] Applied SQL trigger from `CREATE_TRIGGER_INSTRUCTOR_ACTIVATION.sql`
- [ ] Verified trigger exists in Supabase
- [ ] Updated code uses fixed TeacherSignUpScreen.tsx
- [ ] Created test instructor record in database
- [ ] Tested complete signup flow
- [ ] Verified users table has instructor_code populated
- [ ] Verified instructors table has is_active=true after signup
- [ ] Dashboard shows personalized greeting with teacher's first name
- [ ] Profile shows instructor code and department
- [ ] No BottomTabBar visible for teachers
- [ ] Ready for teacher sign-in implementation

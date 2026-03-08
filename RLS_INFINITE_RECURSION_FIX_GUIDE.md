# RLS Policy Infinite Recursion - Complete Fix Guide

## Problem Summary

When attempting to INSERT into `attendance_records`, you're getting:
```
ERROR: infinite recursion detected in policy for relation "attendance_records"
PostgreSQL Error Code: 42P17
```

This happens when an RLS (Row Level Security) policy tries to query the same table it's protecting, creating an infinite loop.

---

## Root Cause

### Example of Problematic Policy:
```sql
CREATE POLICY attendance_records_insert ON attendance_records
  FOR INSERT
  WITH CHECK (
    -- This query reads from attendance_records to validate
    -- But the policy itself is protecting attendance_records
    -- Result: Infinite recursion!
    EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.student_id = auth.uid()::text
    )
  );
```

### Why This Happens:
1. PostgreSQL evaluates the `WITH CHECK` clause before allowing INSERT
2. The clause queries `attendance_records` table
3. To read from `attendance_records`, PostgreSQL checks RLS policies
4. The RLS policy itself tries to query `attendance_records`
5. This creates a circular dependency → infinite recursion

---

## Three Solutions (Choose One)

### Solution 1: FIX RLS POLICIES (Recommended for Production)
**File**: `RLS_POLICIES_FIX.sql`

**Steps**:
1. Open `RLS_POLICIES_FIX.sql` in your Supabase SQL editor
2. Run all the SQL commands
3. This will:
   - Disable RLS temporarily (to break recursion)
   - Drop problematic policies
   - Re-enable RLS with corrected, non-recursive policies

**Advantages**:
- ✅ Proper security model
- ✅ Policies work correctly
- ✅ No changes needed to app code
- ✅ Production-ready

**Disadvantages**:
- ⏱️ Takes ~15 minutes to understand and apply
- 📋 Requires understanding RLS concepts

**When to Use**: 
- Production environments
- When you want the most secure solution

---

### Solution 2: SECURITY DEFINER FUNCTION (Recommended for Quick Fix)
**File**: `RLS_POLICIES_SECURITY_DEFINER.sql`

**Steps**:
1. Run the SQL to create the `mark_attendance()` function
2. Update app code in `lib/attendance-service.ts`:

```typescript
// OLD CODE:
const { data, error } = await supabase
  .from('attendance_records')
  .insert([...])

// NEW CODE:
const { data, error } = await supabase.rpc('mark_attendance', {
  p_lecture_session_id: lectureSessionId,
  p_student_id: studentId,
  p_university_id: universityId,
  p_attendance_status: attendanceStatus,
  p_gps_latitude: gpsLatitude,
  p_gps_longitude: gpsLongitude,
  p_pressure_value: pressureValue,
  p_validation_score: validationScore,
  p_geofence_valid: geofenceValid,
  p_barometer_valid: barometerValid,
  p_totp_valid: totpValid,
  p_is_proxy_suspected: isProxySuspected,
  p_confidence_level: confidenceLevel
});
```

**Advantages**:
- ✅ Quick to apply
- ✅ Works immediately
- ✅ Keeps RLS policies active
- ✅ Server-side validation

**Disadvantages**:
- ⚠️ Requires app code changes
- ⚠️ RLS policies still exist (might have other issues)

**When to Use**:
- When you need a quick fix
- Production environments with good testing
- When you have limited database access

---

### Solution 3: DISABLE RLS (Quick Testing Only)
**❌ NOT RECOMMENDED FOR PRODUCTION**

```sql
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
```

**Advantages**:
- ✅ Works immediately
- ✅ No code changes
- ✅ Good for testing

**Disadvantages**:
- ❌ No security protection
- ❌ Anyone can read/write attendance data
- ❌ Major security risk

**When to Use**:
- Development environment only
- Debugging/testing purposes
- Temporary troubleshooting ONLY

---

## Diagnostic Script

Before applying fixes, run `RLS_POLICIES_DIAGNOSTIC.sql` to:
1. See what RLS policies currently exist
2. Understand the current policy definitions
3. Identify which policies are causing recursion

**Run this in Supabase SQL Editor**:
```sql
-- Check all RLS policies on attendance_records
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
```

---

## Implementation Guide

### Step 1: Run Diagnostic (5 minutes)
```bash
# In Supabase SQL Editor, run:
# Copy contents of RLS_POLICIES_DIAGNOSTIC.sql
# Run all queries to see current state
```

### Step 2: Choose Your Solution

**For Production** → Use Solution 1 (Fix RLS Policies)
**For Quick Fix** → Use Solution 2 (Security Definer Function)
**For Testing** → Use Solution 3 (Disable RLS)

### Step 3: Apply the Fix

**Option A - Fix RLS Policies (RECOMMENDED)**:
```bash
# In Supabase SQL Editor:
# 1. Open RLS_POLICIES_FIX.sql
# 2. Run each section in order
# 3. Verify with diagnostic script
```

**Option B - Security Definer Function**:
```bash
# In Supabase SQL Editor:
# 1. Open RLS_POLICIES_SECURITY_DEFINER.sql
# 2. Create the mark_attendance() function
# 3. Update app code (see Solution 2 above)
# 4. Test with app
```

**Option C - Disable RLS (Testing Only)**:
```sql
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
```

### Step 4: Test the Fix
1. Run attendance marking in your app
2. Verify INSERT succeeds
3. Check if attendance record was created in database

---

## Why This Happened

Your RLS policies were likely written with queries like:

```sql
-- BAD: Queries attendance_records while protecting it
CREATE POLICY ... ON attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendance_records  -- ❌ RECURSION!
      WHERE student_id = auth.uid()::text
    )
  );
```

The issue is that PostgreSQL can't allow a policy to read from the same table it's protecting. This is a circular dependency.

**Fixed version using direct comparisons**:
```sql
-- GOOD: Compares values directly without querying the table
CREATE POLICY ... ON attendance_records
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = student_id  -- ✅ Direct comparison, no recursion
  );
```

---

## Key Differences in Rewritten Policies

### Original (Bad):
```sql
WITH CHECK (
  EXISTS (
    SELECT 1 FROM attendance_records ar  -- ❌ Recursion
    WHERE ar.student_id = auth.uid()::text
  )
)
```

### Fixed (Good):
```sql
WITH CHECK (
  auth.uid()::text = student_id  -- ✅ Direct check
)
```

---

## Security Impact

### Solution 1 (Fix RLS) - Most Secure
- ✅ Proper authorization at database level
- ✅ Only students can INSERT their own records
- ✅ Only teachers can view their class records
- ✅ Admins can see everything
- ✅ No infinite recursion

### Solution 2 (Security Definer) - Moderately Secure
- ✅ Authorization via function
- ✅ Server-side validation
- ⚠️ Function must validate enrollment before INSERT
- ✅ Better than disabling RLS

### Solution 3 (Disable RLS) - No Security
- ❌ Anyone can INSERT/UPDATE/DELETE
- ❌ No access control
- ❌ Development only

---

## Verification Checklist

After applying the fix:

- [ ] Diagnostic script shows RLS policies without infinite recursion
- [ ] App can INSERT attendance record successfully
- [ ] Record appears in database with correct values
- [ ] Student cannot view other students' attendance
- [ ] Teacher can view their class's attendance
- [ ] Attendance validation score: 100/100
- [ ] No RLS recursion errors in logs

---

## Files Provided

1. **RLS_POLICIES_DIAGNOSTIC.sql**
   - Check current state of RLS policies
   - Identify which policies are problematic
   - View policy definitions

2. **RLS_POLICIES_FIX.sql** (RECOMMENDED)
   - Disable RLS temporarily
   - Drop problematic policies
   - Re-enable RLS with fixed policies
   - Non-recursive policy definitions

3. **RLS_POLICIES_SECURITY_DEFINER.sql**
   - Create `mark_attendance()` function
   - Function bypasses RLS for secure operations
   - Includes validation inside function
   - Requires app code changes

4. **This guide**
   - Explains the problem
   - Shows three solutions
   - Provides implementation steps

---

## Next Steps

1. Run `RLS_POLICIES_DIAGNOSTIC.sql` to see current policies
2. Choose a solution based on your needs:
   - Production/Secure → Solution 1 (Fix RLS)
   - Quick/Testing → Solution 2 (Security Definer)
   - Debugging only → Solution 3 (Disable RLS)
3. Apply the chosen solution
4. Test with your app
5. Verify attendance records are being created

---

## Questions?

If the fix doesn't work:
1. Run diagnostic script again
2. Check error messages in Supabase logs
3. Verify function definitions with:
   ```sql
   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'mark_attendance';
   ```
4. Check table structure:
   ```sql
   \d attendance_records
   ```

---

## Related Documentation
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policy Syntax](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)

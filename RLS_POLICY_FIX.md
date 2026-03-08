# RLS Policy Fix for Universities Table

## Problem
The `universities` table has a restrictive RLS (Row Level Security) policy `universities_select_own` that prevents unauthenticated users from reading university data:

```sql
ALTER POLICY "universities_select_own"
ON "public"."universities"
TO public
USING (  (id = get_user_university()));
```

This policy only allows users to see universities where their user_id's university matches. Since signup users are not authenticated yet, they cannot see any universities.

## Error Logs
When this happens, you'll see in the app console:
```
[Fetch Universities] ⚠️ RLS POLICY ISSUE DETECTED
[Fetch Universities] The universities table has an RLS policy that is blocking unauthenticated access
```

## Solution: Update RLS Policy

You need to create TWO policies on the `universities` table:

### Option 1: Allow Public Read + Authenticated Write (Recommended)

Go to Supabase Dashboard → Authentication → Policies → universities table

**Policy 1 - Allow Public Read (Enable SELECT for anon role):**
```sql
CREATE POLICY "universities_allow_public_read"
ON "public"."universities"
FOR SELECT
TO public
USING (is_active = true);
```

**Policy 2 - Keep Existing Write Restriction (authenticated only):**
```sql
CREATE POLICY "universities_authenticated_write"
ON "public"."universities"
FOR UPDATE, DELETE, INSERT
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
```

**Then DISABLE or REPLACE the old restrictive policy:**
```sql
DROP POLICY IF EXISTS "universities_select_own" ON "public"."universities";
```

### Option 2: Simple Fix - Make Policy Public for Select

Just modify the existing policy to check if it's read-only:

```sql
DROP POLICY IF EXISTS "universities_select_own" ON "public"."universities";

CREATE POLICY "universities_select_own"
ON "public"."universities"
FOR SELECT
TO public
USING (true);
```

## Steps in Supabase Dashboard

1. Go to **SQL Editor** → New Query
2. Copy one of the SQL solutions above
3. Run the query
4. Test the app - universities should now load

## Verify the Fix

After applying the fix, you should see in console:
```
[Fetch Universities] Success! Fetched universities:
{
  "count": 2,
  "universities": [
    { "id": "064ced38...", "name": "Indian Institute of Technology Bombay" },
    { "id": "755283d3...", "name": "SHRI GOVINDRAM SEKSARIA INSTITUTE OF TECHNOLOGY AND SCIENCE" }
  ]
}
```

## Related Files

- `screens/StudentSignUpScreen.tsx` - Now has enhanced logging to detect RLS issues
- `screens/RoleSelectionScreen.tsx` - Now uses proper ThemeContext
- Console logs will show `[Fetch Universities]` prefix with full error details

## Testing

Once fixed, the signup flow should work:
1. ✅ RoleSelectionScreen shows themed correctly
2. ✅ StudentSignupScreen loads universities list
3. ✅ User can select university and proceed with signup

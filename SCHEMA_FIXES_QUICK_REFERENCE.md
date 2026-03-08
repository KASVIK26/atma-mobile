# Quick Schema Reference - What Changed

## Three Critical Schema Corrections Made

### 1️⃣ instructor_ids is an ARRAY, not a single column

| What I Used | Actual Schema | Impact |
|----------|-----------|--------|
| `l.teacher_id` | `l.instructor_ids uuid[]` | ❌ Column doesn't exist |
| `l.teacher_id = auth.uid()` | `l.instructor_ids::text[] @> ARRAY[auth.uid()::text]` | ❌ Wrong syntax |

**Error you would get:**
```
ERROR: column "lecture_sessions.teacher_id" does not exist
```

**Corrected:**
```sql
-- Check if auth.uid() is IN the instructor_ids array
l.instructor_ids::text[]::contains(ARRAY[auth.uid()::text])

-- OR (preferred PostgreSQL syntax):
l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
```

---

### 2️⃣ Table name is `student_enrollments` not `enrollments`

| What I Used | Actual Schema | Impact |
|----------|-----------|--------|
| `FROM enrollments e` | `FROM student_enrollments se` | ❌ Table not found |
| `e.class_id` | `se.section_id` | ❌ Column doesn't exist |

**Error you would get:**
```
ERROR: relation "enrollments" does not exist
ERROR: column "enrollments.class_id" does not exist
```

**Corrected:**
```sql
-- Use correct table name and column
FROM student_enrollments se
WHERE se.user_id = auth.uid()
AND se.section_id = l.section_id
```

---

### 3️⃣ Column is `user_id` not `student_id` in enrollments

| What I Used | Actual Schema | Impact |
|----------|-----------|--------|
| `e.student_id` | `se.user_id` | ❌ References wrong column |

**Error you would get:**
```
ERROR: column "student_enrollments.student_id" does not exist
```

**Corrected:**
```sql
WHERE se.user_id = auth.uid()  -- Uses user_id, not student_id
```

---

## Summary: Use This File!

**✅ NEW & CORRECTED:**
```
RLS_POLICIES_FIX_CORRECTED.sql
```

All three issues are fixed in this script:
- ✅ Uses `instructor_ids::text[] @> ARRAY[auth.uid()::text]`
- ✅ Uses `student_enrollments` table
- ✅ Uses `se.user_id` column

---

## Where These Corrections Appear

### In RLS policies for attendance_records:
```sql
-- CHECK ACCESS FOR INSTRUCTORS
EXISTS (
  SELECT 1 FROM lecture_sessions l
  WHERE l.id = lecture_session_id
  AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]  -- ✅ FIXED
)
```

### In RLS policies for lecture_sessions:
```sql
-- CHECK IF STUDENT IS ENROLLED
EXISTS (
  SELECT 1 FROM student_enrollments se  -- ✅ FIXED TABLE NAME
  WHERE se.section_id = section_id
  AND se.user_id = auth.uid()  -- ✅ FIXED COLUMN NAME
  AND se.is_active = TRUE
)
```

---

## Testing the Fix

After running the corrected SQL script:

```bash
# Test 1: Can student mark attendance?
SELECT * FROM attendance_records 
WHERE student_id = 'current-student-uuid'
AND lecture_session_id = 'session-uuid';
-- Should succeed (or show empty if no attendance yet)

# Test 2: Can instructor see student attendance?
SELECT ar.* FROM attendance_records ar
JOIN lecture_sessions l ON l.id = ar.lecture_session_id
WHERE l.instructor_ids::text[] @> ARRAY['current-teacher-uuid']
AND l.id = 'session-uuid';
-- Should succeed and show records

# Test 3: Check instructor_ids array syntax
SELECT instructor_ids FROM lecture_sessions WHERE id = 'session-uuid';
-- Should show array like: {"uuid1","uuid2"}
```

---

## Files You Should Now Have

✅ **RLS_POLICIES_FIX_CORRECTED.sql** - Use this one! Has all 3 fixes
❌ RLS_POLICIES_FIX.sql - Old version, don't use
✅ **DB_SCHEMA_VALIDATION_REPORT.md** - Detailed explanation
✅ **RLS_INFINITE_RECURSION_FIX_GUIDE.md** - General guide
✅ RLS_POLICIES_DIAGNOSTIC.sql - Check what's in your DB
✅ RLS_POLICIES_SECURITY_DEFINER.sql - Alternative approach

---

## Next Steps

1. **Backup your database** (always do this first!)
2. **Run the corrected script** in Supabase SQL editor:
   ```bash
   # Copy all contents of RLS_POLICIES_FIX_CORRECTED.sql
   # Paste into Supabase SQL editor
   # Click "Run"
   ```
3. **Test attendance marking** in your app
4. **Verify** in database that record was created

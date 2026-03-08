# Enrollment Schema Diagnostic & Fix Guide

## Critical Issue Found

You have **TWO different data structures**:

### What Your Code Expects (Pre-Enrollment Table)
```
email, enrollment_no, first_name, last_name, is_active, section_id (with foreign key joins)
```

### What Schema Shows (student_enrollments)
```
student_id, section_id, course_id, is_active
```

**Result**: Trigger fails because it can't find `student_id` field in pre-enrollment table!

---

## URGENT Step 1: Identify Your Actual Table Structure

Run these queries in Supabase SQL Editor:

### Query A: Find the table with email + enrollment_no
```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name IN ('email', 'enrollment_no')
  AND table_schema = 'public'
GROUP BY table_name;
```

**Expected Result**: One or more tables (likely `student_enrollments` or `pending_enrollments`)

### Query B: Get column names of that table
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_enrollments'  -- Replace with actual table from Query A
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Record the output** - this is critical for the fix!

### Query C: Count records
```sql
SELECT COUNT(*) as total_records, 
       COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records
FROM student_enrollments;  -- Replace with actual table name
```

---

## Root Cause Analysis

### Log Evidence Showing the Problem

```
LOG  [Email Verification] Query results: {"count": 1, "foundEmails": [{"email": "0801CS2211...", "isActive": false}]}
```
✅ Query returns email + is_active - so table HAS these fields

```
LOG  [Complete Signup] Enrollment verification: {"id": "d41cf380***", "is_active": false, "student_id": "undefined***"}
```
❌ But student_id is UNDEFINED! This means:
1. The table DOESN'T have a student_id field
2. OR the field isn't populated
3. OR the query returned wrong data

### Why Trigger Didn't Fire

Looking at your trigger:
```sql
UPDATE student_enrollments
SET is_active = true
WHERE university_id = NEW.university_id
  AND student_id = NEW.id
  AND is_active = false;
```

This looks for a record with `student_id = NEW.id`, but:
- If the table doesn't have `student_id` field yet → FAILS
- If `student_id` is NULL → Can't match → FAILS
- If it's stored in a different column → FAILS

---

## Solution Strategy

### Option 1: Pre-Enrollment Table Approach (RECOMMENDED)

You have:
1. **pending_enrollments** - Bulk imported data from student info system (email, enrollment_no, etc.)
2. **student_enrollments** - Actual course enrollments (student_id, section_id, course_id)

**Flow**:
1. Bulk import enrollment system data → `pending_enrollments`
2. Student signs up → Matches `pending_enrollments` by email
3. User created → Trigger activates `pending_enrollment` record AND creates `student_enrollments` record
4. App displays enrollment info from `pending_enrollments` view (with joined names)

**SQL Fix**:
```sql
-- Update trigger to match pending_enrollments structure
UPDATE pending_enrollments
SET user_id = NEW.id, is_active = true
WHERE university_id = NEW.university_id
  AND enrollment_no = NEW.enrollment_id;  -- Note: uses enrollment_id field!

-- Create view for display
CREATE VIEW enrollment_info AS
SELECT pe.*, 
  s.name as section_name,
  p.name as program_name,
  b.name as branch_name
FROM pending_enrollments pe
LEFT JOIN sections s ON pe.section_id = s.id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN branches b ON s.branch_id = b.id;
```

---

## Immediate Action Items

### 1. Run Diagnostic Queries Above
Copy each query and run in Supabase SQL Editor. Take a screenshot of results.

### 2. Share Your Table Structure
Post the output showing:
- Actual table name
- Actual column names
- Data types
- Sample row

### 3. Check student_enrollments Records
```sql
-- Do any records exist?
SELECT * FROM student_enrollments LIMIT 5;

-- Check current record state
SELECT id, student_id, section_id, is_active
FROM student_enrollments
WHERE id = 'd41cf380-07ba-4555-a42b-a2bcfd0836c8';
```

### 4. Check Pre-Enrollment Table
```sql
-- Does it exist?
SELECT * FROM pending_enrollments LIMIT 1;
  -- or
SELECT * FROM student_enrollments WHERE email IS NOT NULL LIMIT 1;
  -- or other table name
```

---

## Meanwhile: Fix StudentSignUpScreen

Once you identify the table, update the query:

**Current (WRONG)**:
```typescript
const { data: enrollments, error: queryError } = await supabase
  .from('student_enrollments')  // ← May be wrong table!
  .select(`
    id,
    email,
    enrollment_no,
    first_name,
    last_name,
    is_active,
    sections!student_enrollments_section_id_fkey(...)  // ← Wrong foreign key!
  `)
```

**Will Need (CORRECT - once you identify table)**:
```typescript
const { data: enrollments, error: queryError } = await supabase
  .from('ACTUAL_TABLE_NAME')  // ← Put real table name here
  .select(`
    id,
    email,
    enrollment_no,
    first_name,
    last_name,
    is_active,
    section_id
  `)
  .eq('university_id', selectedUniversity?.id)
  .eq('is_active', false)
  .ilike('email', email);

// Then fetch foreign key names separately (no RLS issues)
const sectionData = await supabase
  .from('sections')
  .select('id, name, program_id, branch_id, semester_id')
  .eq('id', matchingEnrollment.section_id);
```

---

## Foreign Key Display Solution (Smart RLS)

Instead of making every table public, use a view:

```sql
-- Create ONE secure view for display
CREATE VIEW student_available_enrollments AS
SELECT 
  pe.id,
  pe.email,
  pe.enrollment_no,
  pe.is_active,
  (SELECT name FROM sections WHERE id = pe.section_id) as section_name,
  (SELECT name FROM programs WHERE id = (SELECT program_id FROM sections WHERE id = pe.section_id)) as program_name,
  (SELECT name FROM branches WHERE id = (SELECT branch_id FROM sections WHERE id = pe.section_id)) as branch_name,
  (SELECT name FROM semesters WHERE id = (SELECT semester_id FROM sections WHERE id = pe.section_id)) as semester_name
FROM pending_enrollments pe
WHERE is_active = false;

-- Only allow public read (for signup verification)
ALTER TABLE student_available_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_public_read"
  ON student_available_enrollments
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

Query becomes:
```typescript
.from('student_available_enrollments')
.select('*')  // Now includes program_name, branch_name, semester_name!
```

No RLS on individual tables needed!

---

## Quick Reference: What to Do

| If You Have | Do This |
|-------------|---------|
| Two separate tables | Use Option 1 (pre-enrollment approach) |
| Single combined table | Modify schema to match expectations |
| RLS blocking joins | Use view with subqueries |
| Foreign key names showing as null | Update StudentSignUpScreen to fetch names |

---

## Files Provided

1. **ENROLLMENT_SCHEMA_RECOVERY.sql** - Complete SQL fixes
2. **This guide** - Diagnostic and understanding

**Next Step**: Run diagnostic queries and share results!

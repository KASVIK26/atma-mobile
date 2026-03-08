# Database Schema Validation Report

## Corrections Made to RLS Policies

### Issue 1: Wrong Column Reference - `teacher_id` ❌

**What I wrote (WRONG):**
```sql
-- WRONG - lecture_sessions doesn't have teacher_id
CREATE POLICY ... ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.teacher_id = auth.uid()::text  -- ❌ THIS COLUMN DOESN'T EXIST!
    )
  );
```

**Actual database schema:**
```sql
-- lecture_sessions table structure (from TABLES_SCHEMA.sql)
create table public.lecture_sessions (
  id uuid not null,
  university_id uuid not null,
  ...
  instructor_ids uuid[] null default array[]::uuid[],  -- ✅ ARRAY OF IDs, NOT SINGLE ID
  ...
);
```

**What it should be (CORRECT):**
```sql
-- CORRECT - Use instructor_ids array with @> operator
CREATE POLICY ... ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lecture_sessions l
      WHERE l.id = lecture_session_id
      AND l.instructor_ids::text[] @> ARRAY[auth.uid()::text]  -- ✅ CORRECT!
    )
  );
```

**Why this matters:**
- `lecture_sessions` can have MULTIPLE instructors teaching the same session
- The `instructor_ids` column is a PostgreSQL array type (`uuid[]`)
- To check if a UUID is IN the array, use the `@>` operator (array containment)
- Converting both sides to text[] ensures proper comparison

---

### Issue 2: Wrong Table Name - `enrollments` ❌

**What I wrote (WRONG):**
```sql
-- WRONG - Table doesn't exist with this name
JOIN enrollments e ON e.class_id = enrollments.class_id  -- ❌ TABLE NOT FOUND
```

**Actual database schema:**
```sql
-- Actual table name (from TABLES_SCHEMA.sql)
create table public.student_enrollments (
  id uuid not null,
  university_id uuid not null,
  user_id uuid null,           -- ✅ NOT student_id, it's user_id
  section_id uuid not null,    -- ✅ Links to sections, not classes
  batch integer not null,
  is_active boolean null,
  ...
);
```

**What it should be (CORRECT):**
```sql
-- CORRECT - Use student_enrollments with proper column mapping
JOIN student_enrollments se ON se.section_id = l.section_id
WHERE se.user_id = auth.uid()  -- ✅ CORRECT!
```

**Why this matters:**
- The actual table is `student_enrollments` (not `enrollments`)
- It has `user_id` column (not `student_id`)
- It has `section_id` column (links to course sections, not "classes")
- Device field: `batch` is for lab section batch assignment

---

### Issue 3: Unnecessary Type Casting - `student_id::text` ❌

**What I wrote (WRONG):**
```sql
-- WRONG - Unnecessary casting and wrong conversion
WHERE ... AND l.teacher_id = auth.uid()::text  -- ❌ CONVERTING UUID TO TEXT UNNECESSARILY
```

**Actual database schema:**
```sql
-- attendance_records table (from ATTENDANCE_SCHEMA_MIGRATION.sql)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID NOT NULL,
  student_id UUID NOT NULL,           -- ✅ NATIVE UUID TYPE
  lecture_session_id UUID NOT NULL,   -- ✅ NATIVE UUID TYPE
  ...
  CONSTRAINT attendance_records_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.users (id)
);
```

**What it should be (CORRECT):**
```sql
-- CORRECT - Direct UUID comparison
WHERE student_id = auth.uid()           -- ✅ Both are UUID type, no conversion needed
   OR student_id = auth.uid()::uuid     -- ✅ Also works with explicit cast
```

**Why this matters:**
- `auth.uid()` returns a UUID type
- `student_id` is a UUID type in database
- Direct UUID comparison is most efficient
- No need to convert to text and back

---

## Schema Summary - Actual Column Names

### attendance_records table
```sql
CREATE TABLE attendance_records (
  id                  UUID PRIMARY KEY
  student_id          UUID → references users(id)        ✅
  lecture_session_id  UUID → references lecture_sessions ✅
  university_id       UUID
  attendance_status   VARCHAR (present, absent, late)
  gps_latitude        NUMERIC
  gps_longitude       NUMERIC
  pressure_value      NUMERIC
  validation_score    NUMERIC (0-100)
  geofence_valid      BOOLEAN
  barometer_valid     BOOLEAN
  totp_valid          BOOLEAN
  ble_valid           BOOLEAN
  is_proxy_suspected  BOOLEAN
  confidence_level    NUMERIC (0-1)
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
)
```

### lecture_sessions table
```sql
CREATE TABLE lecture_sessions (
  id                  UUID PRIMARY KEY
  university_id       UUID
  instructor_ids      UUID[] ← ARRAY TYPE, use @> operator ✅
  section_id          UUID
  room_id             UUID
  session_date        DATE
  start_time          TIME
  end_time            TIME
  totp_required       BOOLEAN
  is_active           BOOLEAN
  is_cancelled        BOOLEAN
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
)
```

### student_enrollments table (NOT "enrollments")
```sql
CREATE TABLE student_enrollments (
  id                  UUID PRIMARY KEY
  user_id             UUID ← student's user ID ✅
  section_id          UUID
  batch               INTEGER (for lab batch)
  is_active           BOOLEAN
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
)
```

---

## How to Check Your Own Schema

Run these SQL queries in Supabase to verify column names:

### Check lecture_sessions columns
```sql
\d lecture_sessions
-- Look for: instructor_ids (should be uuid[])
-- Missing: teacher_id (should NOT exist)
```

### Check student_enrollments columns
```sql
\d student_enrollments
-- Look for: user_id, section_id
-- Missing: class_id, student_id (it's user_id, not student_id)
```

### Check attendance_records columns
```sql
\d attendance_records
-- Look for: student_id (UUID), lecture_session_id (UUID)
-- Verify: all columns are UUID type, not TEXT
```

### Check all table names
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
-- Look for: student_enrollments (not enrollments)
```

---

## File Updates

- ✅ **RLS_POLICIES_FIX_CORRECTED.sql** - NEW, corrected version with proper schema references
- ⚠️ **RLS_POLICIES_FIX.sql** - OLD, has incorrect schema references (do NOT use)

---

## Corrected Syntax Examples

### Checking if instructor owns a session
```sql
-- OLD (WRONG):
WHERE l.teacher_id = auth.uid()::text

-- NEW (CORRECT):
WHERE l.instructor_ids::text[] @> ARRAY[auth.uid()::text]
```

### Checking if user is enrolled
```sql
-- OLD (WRONG):
WHERE e.class_id = enrollments.class_id
AND e.user_id = auth.uid()

-- NEW (CORRECT):
WHERE se.section_id = l.section_id
AND se.user_id = auth.uid()
AND se.is_active = TRUE
```

### Direct student ID comparison
```sql
-- OLD (UNNECESSARY):
WHERE student_id::text = auth.uid()::text

-- NEW (EFFICIENT):
WHERE student_id = auth.uid()
```

---

## Use This SQL Script

**Use the corrected version:**
➜ **RLS_POLICIES_FIX_CORRECTED.sql** ✅

**Do NOT use the original version:**
❌ **RLS_POLICIES_FIX.sql** (has wrong schema references)

The corrected script includes:
- ✅ Proper `instructor_ids::text[] @> ARRAY[auth.uid()::text]` syntax
- ✅ Correct table name `student_enrollments`
- ✅ Correct column name `user_id` (not `student_id`)
- ✅ Efficient UUID comparisons without unnecessary casting
- ✅ All references match actual database schema


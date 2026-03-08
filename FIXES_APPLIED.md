# Schedule Service - Fixes Applied

## Issue Identified
**Error**: `column student_enrollments.course_id does not exist`

The code was attempting to select `course_id` from the `student_enrollments` table, but this column doesn't exist in that table.

---

## Root Cause Analysis

### Data Model Issue
The `student_enrollments` table structure:
```sql
student_enrollments {
  id
  university_id
  student_id
  section_id  ← Only section reference, not course
  batch
  is_active
  email
  enrollment_no
  first_name
  last_name
  ...
}
```

The `course_id` is NOT stored in `student_enrollments`. Instead, it's accessed through:
- `sections` table which has `course_id`
- `lecture_sessions` table which also has `course_id`

### How Course Info is Accessed
**Correct Data Flow:**
```
student_enrollments (section_id)
    ↓
lecture_sessions (course_id, session_date, time, room_id, instructor_ids)
    ↓ JOIN
courses (course_id → name, code)
rooms (room_id → name, building)
instructors (instructor_ids array → names)
```

---

## Fixes Applied

### 1. ✅ lib/schedule-service.ts (Line 97)

**BEFORE (WRONG):**
```typescript
const { data: enrollments, error: enrollmentError } = await supabase
  .from('student_enrollments')
  .select('section_id, course_id, batch')  // ❌ course_id doesn't exist
```

**AFTER (CORRECT):**
```typescript
const { data: enrollments, error: enrollmentError } = await supabase
  .from('student_enrollments')
  .select('section_id, batch')  // ✅ Only fields that exist
```

**Why This Works:**
- Gets the list of sections the student is enrolled in
- Extracts `section_id` values: `[id1, id2, id3]`
- Uses these to query `lecture_sessions`

### 2. ✅ TABLES_SCHEMA.sql - student_enrollments Table (Line 285)

**Updated with correct DDL:**
```sql
create table public.student_enrollments (
  id uuid not null,
  university_id uuid not null,
  student_id uuid null,
  section_id uuid not null,
  batch integer not null default 1,
  is_active boolean null default true,
  created_at timestamp without time zone null,
  updated_at timestamp without time zone null,
  first_name text null,
  last_name text null,
  email text not null,
  enrollment_no text not null,
  -- NO course_id field
  constraint check_batch_positive check ((batch > 0))
)
```

**Key Changes:**
- ✅ Removed incorrect `course_id` foreign key reference
- ✅ Added `first_name`, `last_name`, `email`, `enrollment_no` fields
- ✅ Added proper global uniqueness constraints for `email` and `enrollment_no`
- ✅ Added comprehensive indexes (13 new indexes)

### 3. ✅ TABLES_SCHEMA.sql - instructors Table (Line 113)

**Updated with correct DDL:**
- ✅ Fixed `code` field to be `character varying(50)` not `varchar(50)`
- ✅ Added `UNIQUE` constraint on `code` field
- ✅ Updated to use pg_default TABLESPACE
- ✅ Proper index definitions with TABLESPACE

### 4. ✅ TABLES_SCHEMA.sql - lecture_sessions Table (Line 461)

**Updated with correct DDL:**
- ✅ Corrected all data types and constraints
- ✅ Added proper `check` constraints for times and late minutes
- ✅ Index on `session_date, section_id` (composite for efficient filtering)
- ✅ Added triggers for audit and notifications

### 5. ✅ TABLES_SCHEMA.sql - totp_sessions Table (Line 665)

**Updated with correct DDL:**
```sql
create table public.totp_sessions (
  id uuid not null,
  university_id uuid not null,
  lecture_session_id uuid not null,
  code character varying(6) null,
  totp_mode character varying(50) not null,
  generated_at timestamp with time zone null,
  expires_at timestamp with time zone null,
  last_refresh_at timestamp with time zone null,
  ...
)
```

**Key Changes:**
- ✅ Corrected constraint check for `totp_mode` with proper text array cast
- ✅ Added `UNIQUE` index on `lecture_session_id`
- ✅ Added trigger for code generation

### 6. ✅ Added Missing Triggers

**For student_enrollments (after indexes, line ~330):**
```sql
create trigger trg_update_is_active_on_student_id
create trigger trg_update_student_enrollments_updated_at
create trigger trigger_audit_enrollments
```

**For lecture_sessions (after indexes, line ~507):**
```sql
create trigger trigger_audit_lecture_sessions
create trigger trigger_notify_session_created
create trigger trigger_notify_session_updated
```

**For totp_sessions (inline with table):**
```sql
create trigger trigger_totp_session_code_generation
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Student Opens Schedule Screen (ViewScheduleScreen.tsx)          │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ getStudentSchedule()        │
                    │ - studentId                 │
                    │ - universityId              │
                    │ - startDate, endDate        │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────────┐
                    │ Step 1: Query student_enrollments               │
                    │ SELECT section_id, batch                        │
                    │ WHERE student_id = X AND university_id = Y      │
                    │ Result: [sectionId1, sectionId2, sectionId3]    │
                    └──────────────┬──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────────┐
                    │ Step 2: Query lecture_sessions                  │
                    │ SELECT * WITH courses, rooms, buildings         │
                    │ WHERE section_id IN (sectionId1, 2, 3)          │
                    │ AND university_id = Y                           │
                    │ AND is_active = true AND is_cancelled = false   │
                    │ AND session_date BETWEEN startDate AND endDate  │
                    │ Result: 12 lecture sessions                     │
                    └──────────────┬──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────────┐
                    │ Step 3: For each session with instructor_ids    │
                    │ Fetch instructor names from instructors table   │
                    │ Result: Session with instructor details         │
                    └──────────────┬──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────────┐
                    │ Display in UI                                   │
                    │ - Daily View: grouped by date                   │
                    │ - Weekly View: grouped by day of week           │
                    │ - SessionBlock components with animations       │
                    └──────────────────────────────────────────────────┘
```

---

## Console Output (Expected)

```
[Schedule Service] Fetching student schedule for: 8a3b5c2f...
[Schedule Service] University: 755283d3...
[Schedule Service] Date range: 2026-01-26 to 2026-05-25
[Schedule Service] Found 3 active enrollments
[Schedule Service] Sample enrollments (first 2): [
  {
    "section_id": "0c7465ee-aaee-43a9-b29e-d886a37802aa",
    "batch": 2
  },
  {
    "section_id": "25b89aba-c39f-48ab-ad01-e19e27f39c92",
    "batch": 1
  }
]
[Schedule Service] Fetching sessions for 3 section(s)
[Schedule Service] Retrieved 12 lecture sessions
[Schedule Service] Sample sessions (first 2): [
  {
    "course": "Introduction to Psychology",
    "date": "2026-02-25",
    "time": "09:00:00",
    "status": "scheduled"
  },
  {
    "course": "Calculus II",
    "date": "2026-02-25",
    "time": "11:00:00",
    "status": "scheduled"
  }
]
[Schedule Service] ✓ Successfully retrieved 12 sessions
[ViewScheduleScreen] Loaded 12 sessions successfully
```

---

## Files Modified

1. **lib/schedule-service.ts**
   - Line 97: Removed `course_id` from select statement

2. **TABLES_SCHEMA.sql**
   - Line 113: Updated `instructors` table definition
   - Line 285: Updated `student_enrollments` table definition
   - Lines 313-330: Added 3 triggers for `student_enrollments`
   - Line 461: Updated `lecture_sessions` table definition
   - Lines 507-524: Added 3 triggers for `lecture_sessions`
   - Line 665: Updated `totp_sessions` table definition

---

## Multi-Tenant Safety

✅ All queries filter by `university_id`:
- Student enrollments filtered by `university_id`
- Lecture sessions filtered by `university_id`
- Data isolation for different universities

✅ Row-Level Security (RLS) ready:
- Filtering at application level matches database structure
- Can add RLS policies on top for additional security

---

## Performance Optimization

✅ Efficient indexes added:
- `idx_enrollments_student_id` + `idx_enrollments_student_active`: Fast student lookups
- `idx_sessions_date_section`: Fast date range + section queries
- `idx_enrollments_email`, `idx_enrollments_enrollment_no`: Student lookup by email/enrollment

✅ Query optimization:
- Single query per step (no N+1 queries)
- Batch fetch instructor names in parallel
- Composite indexes for common filter combinations

---

## Status

✅ **ALL FIXES APPLIED AND READY FOR TESTING**
- Code changes: ✅ Applied
- Schema updates: ✅ Applied
- Triggers: ✅ Added
- Console logging: ✅ Smart sampling (first 2-3 items only)
- Error handling: ✅ Proper error messages
- Multi-tenant safety: ✅ Enforced at query level

Ready to test schedule loading for both students and teachers!

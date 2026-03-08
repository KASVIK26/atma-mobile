# TOTP Daily Population Guide

## Current Status
You successfully created lecture_sessions (558 total, 8 today), but **totp_sessions table is empty** because the daily population is handled by a **Cron Job** through Supabase.

## How It Works

### Architecture
1. **Automatic**: PostgreSQL cron job runs `run_daily_totp_population()` at 00:00 UTC daily
2. **Manual**: You can trigger population anytime with SQL commands
3. **Trigger**: When a new totp_session is inserted, `handle_totp_session_code_generation()` automatically generates the 6-digit code

### The Flow
```
Timetable Created
    ↓
trigger_auto_generate_sessions fires
    ↓
auto_generate_lecture_sessions() creates lecture_sessions for entire semester
    ↓
[Daily] Cron Job runs run_daily_totp_population()
    ↓
populate_totp_sessions_for_day() loops through each university
    ↓
Creates totp_sessions records for today's lecture_sessions
    ↓
trigger_totp_session_code_generation fires on INSERT
    ↓
handle_totp_session_code_generation() generates 6-digit code + expiration
    ↓
Students can now see TOTP codes on their app
```

## Manual Population Commands

### Option 1: Populate Today's Sessions (Quick Fix)
```sql
-- For a specific university
SELECT * FROM populate_totp_for_today();

-- Result shows: Created: X, Skipped: Y, Total: Z
```

### Option 2: Populate a Specific Date
```sql
-- For a specific date
SELECT * FROM populate_totp_for_date('2026-02-26'::DATE);
```

### Option 3: Full Daily Population (All Universities)
```sql
-- Simulates what the cron job does
SELECT * FROM run_daily_totp_population();

-- Returns:
-- university_id | university_name | inserted_count | deleted_count | status
```

### Option 4: Populate for Specific University + Date
```sql
-- Most precise control
SELECT * FROM populate_totp_sessions_for_day('UNIVERSITY_UUID_HERE'::UUID);
```

## Quick Actions

### 🔴 URGENT: Populate TOTP Codes Right Now
If students need to mark attendance today:

```sql
-- Step 1: Check what needs to be created
SELECT 
  COUNT(*) as missing_codes,
  DATE(session_date) as date
FROM public.lecture_sessions ls
WHERE ls.session_date::DATE = CURRENT_DATE
AND ls.is_active = TRUE
AND NOT EXISTS (
  SELECT 1 FROM public.totp_sessions ts
  WHERE ts.lecture_session_id = ls.id
);

-- Step 2: Create today's TOTP codes
SELECT * FROM populate_totp_for_today();

-- Step 3: Verify they were created
SELECT 
  ts.code,
  c.code as course_code,
  ls.start_time,
  ts.expires_at
FROM public.totp_sessions ts
JOIN public.lecture_sessions ls ON ts.lecture_session_id = ls.id
JOIN public.courses c ON ls.course_id = c.id
WHERE ls.session_date::DATE = CURRENT_DATE
ORDER BY ls.start_time;
```

### 📅 Populate Multiple Days
```sql
-- Populate for next 7 days
WITH dates AS (
  SELECT CURRENT_DATE + n as target_date
  FROM generate_series(0, 6) n
)
SELECT target_date, (populate_totp_for_date(target_date)).* 
FROM dates;
```

## Setting Up Cron Job

### In Supabase SQL Editor

**Option A: Use Built-in Cron Extension**
```sql
-- Enable cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create scheduled job (runs daily at 00:00 UTC)
SELECT cron.schedule('populate_totp_daily', '0 0 * * *', 
  'SELECT run_daily_totp_population();'
);

-- List all cron jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('populate_totp_daily');
```

**Option B: Use Supabase Edge Functions (Recommended)**
Create an Edge Function that runs on a schedule:

```typescript
// supabase/functions/populate-totp-daily/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

async function populateTOTPDaily() {
  const { data, error } = await supabase
    .rpc('run_daily_totp_population');
  
  if (error) {
    console.error('Error:', error);
    throw error;
  }
  
  console.log('✅ TOTP population completed:', data);
}

// Call the function
await populateTOTPDaily();

Deno.serve(async () => {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Then set up a schedule in Supabase dashboard → Functions → Scheduled Functions

## Database Function Reference

### `populate_totp_for_today()` → TABLE
Creates TOTP sessions for all today's lectures (all universities).

**Returns:**
- `created_count` - Number of new TOTP sessions added
- `skipped_count` - Already existing TOTP sessions
- `total_count` - Total lecture sessions today
- `message` - Summary message

**Example:**
```sql
SELECT * FROM populate_totp_for_today();
-- Result: created_count=8, skipped_count=0, total_count=8
```

---

### `populate_totp_for_date(p_date DATE)` → TABLE
Creates TOTP sessions for a specific date.

**Parameters:**
- `p_date` - Target date (e.g., '2026-02-26')

**Example:**
```sql
SELECT * FROM populate_totp_for_date('2026-02-26'::DATE);
```

---

### `populate_totp_sessions_for_day(p_university_id UUID)` → TABLE
Creates TOTP sessions for a specific university (today's date only).

**Parameters:**
- `p_university_id` - UUID of the university

**Returns:**
- `inserted_count` - New sessions created
- `deleted_count` - Old sessions cleaned up
- `error_message` - NULL if successful

**Example:**
```sql
SELECT * FROM populate_totp_sessions_for_day('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::UUID);
```

---

### `run_daily_totp_population()` → TABLE
**Master function** - Loops through all universities and populates today's TOTP codes.

**Returns for each university:**
- `university_id`
- `university_name`
- `inserted_count`
- `deleted_count`
- `status` - 'Success' or 'ERROR: ...'

**Example:**
```sql
SELECT * FROM run_daily_totp_population();
-- Shows: University A (inserted: 15), University B (inserted: 20), etc.
```

---

### `refresh_dynamic_totp_codes()` → TABLE
Refreshes 30-second dynamic codes (called every 30 seconds by cron).

**Returns:**
- `updated_count` - Number of sessions refreshed
- `timestamp` - When refresh occurred
- `status` - 'Success' or error message

---

## Troubleshooting

### No TOTP codes appearing?
1. Check if lecture_sessions exist: `SELECT COUNT(*) FROM lecture_sessions WHERE session_date::DATE = CURRENT_DATE;`
2. Manually run: `SELECT * FROM populate_totp_for_today();`
3. Check results: `SELECT * FROM totp_sessions WHERE lecture_session_id IN (...);`

### Getting duplicate errors?
This is expected if function already ran. Can safely run again - it checks for duplicates.

### TOTP codes expiring too fast?
- Dynamic codes expire in 30 seconds
- Check `totp_mode` in `totp_sessions`:
  - `'autogenerated_dynamic'` → Expires in 30s (refreshed every 30s by cron)
  - `'autogenerated_static'` → Never expires
  - `'manual'` → Instructor sets code manually

### Cron job not running?
1. Enable extension: `CREATE EXTENSION IF NOT EXISTS pg_cron;`
2. Check if scheduled: `SELECT * FROM cron.job WHERE jobname = 'populate_totp_daily';`
3. Check logs: `SELECT * FROM cron.job_run_details ORDER BY end_time DESC LIMIT 10;`

## Code Modes Explained

### `autogenerated_dynamic` (Default)
- ✅ 6-digit code generated automatically
- ✅ Expires in 30 seconds
- ✅ Refreshed every 30 seconds by cron job
- ✅ More secure, keeps changing
- ⚠️ Students must enter code quickly

### `autogenerated_static`
- ✅ 6-digit code generated once
- ✅ Never expires
- ✅ Works all day
- ⚠️ Less secure if code leaked
- ✅ Good for long sessions

### `manual`
- ✅ Instructor manually enters code
- ✅ Complete control
- ⚠️ Instructor must set before class
- ✅ Works with any code length

## Next Steps

### Immediate (Do This Now)
```bash
# Run in Supabase SQL Editor:
SELECT * FROM populate_totp_for_today();
```

### Today
1. Verify students can see codes in their app
2. Test attendance marking works

### This Week
1. Set up cron job for automatic daily population
2. Configure which universities use which mode
3. Test with actual students

### Optional Enhancements
1. Create instructor "Share Code" button
2. Add timezone support (some universities are in different time zones)
3. Set up monitoring dashboard for TOTP sessions
4. Create admin console to manage TOTP modes per course

## SQL Script to Run Everything

```sql
-- Execute this in Supabase SQL Editor

-- 1. Enable cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Populate today's TOTP codes
SELECT * FROM populate_totp_for_today() as today_result(created, skipped, total, msg);

-- 3. Schedule daily population at 00:00 UTC
SELECT cron.schedule('populate_totp_daily', '0 0 * * *', 
  'SELECT run_daily_totp_population();'
);

-- 4. Refresh dynamic codes every 30 seconds
SELECT cron.schedule('refresh_totp_dynamic', '*/30 * * * * *',
  'SELECT refresh_dynamic_totp_codes();'
);

-- 5. Verify
SELECT 
  COUNT(*) as total_totp_codes,
  COUNT(DISTINCT lecture_session_id) as sessions_with_codes,
  MIN(expires_at) as earliest_expiration,
  MAX(expires_at) as latest_expiration
FROM public.totp_sessions;

-- 6. Check today's codes
SELECT 
  ts.code,
  c.code,
  c.name,
  ls.start_time,
  ts.expires_at
FROM public.totp_sessions ts
JOIN public.lecture_sessions ls ON ts.lecture_session_id = ls.id
JOIN public.courses c ON ls.course_id = c.id
WHERE ls.session_date::DATE = CURRENT_DATE
ORDER BY ls.start_time;
```

---

**Summary**: The trigger mechanism is working correctly. You just need to populate the initial `totp_sessions` records. After that, the cron job keeps it updated daily. Now students can see codes and mark attendance! 🎉

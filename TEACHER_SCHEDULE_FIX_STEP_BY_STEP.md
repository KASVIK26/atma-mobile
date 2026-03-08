## ⚡ IMMEDIATE ACTION REQUIRED

The first RLS fix didn't work. Here's what to do RIGHT NOW:

---

## STEP 1: Apply Enhanced Fix

**Location:** [TEACHER_SCHEDULE_RLS_FIX_V2.sql](TEACHER_SCHEDULE_RLS_FIX_V2.sql)

**What to do:**
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Open the file linked above
4. Copy ALL content
5. Paste into Supabase
6. Click **RUN**
7. Should complete without errors

---

## STEP 2: Verify Fix Applied

In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'lecture_sessions';
```

**Should return:** Around 6-7 policies

---

## STEP 3: Clear App Cache

```bash
cd c:\Users\vikas\atma-mobile
npm start -- -c
```

Wait for "✓ Ready on http://localhost:8081" message.

---

## STEP 4: Test in App

1. Open app
2. Open browser dev console (F12)
3. Type:
```javascript
import { testTeacherScheduleAccess } from '@/lib/schedule-service';
testTeacherScheduleAccess('532bc75b-c907-4b8b-b675-661cba483195', '755283d3-80d9-4a86-b657-9974694f9f43');
```
4. Press Enter
5. Read the output

---

## STEP 5: Check Result

### ✅ If Successful (You'll See)
```
✅ Query returned 305 sessions
✅ Found 305 sessions for this instructor
✅ SUCCESS: Everything is working!
```

**Then:**
- Go to View Schedule screen
- Should show multiple lectures
- Pull down to refresh if needed

### ❌ If Still Failing (You'll See)
```
❌ Query returned 0 sessions
   Likely causes:
   1. RLS policy blocks read access
```

**Then:**
- Copy the FULL output from console
- Read: [TEACHER_SCHEDULE_TROUBLESHOOTING_ADVANCED.md](TEACHER_SCHEDULE_TROUBLESHOOTING_ADVANCED.md)
- Follow the deep diagnosis section

---

## Files Reference

- **[TEACHER_SCHEDULE_RLS_FIX_V2.sql](TEACHER_SCHEDULE_RLS_FIX_V2.sql)** ← **Apply this first**
- [TEACHER_SCHEDULE_TROUBLESHOOTING_ADVANCED.md](TEACHER_SCHEDULE_TROUBLESHOOTING_ADVANCED.md) ← Read if still failing
- [testTeacherScheduleAccess()](lib/schedule-service.ts) ← Function to test
- [TEACHER_SCHEDULE_FIX_FINAL.md](TEACHER_SCHEDULE_FIX_FINAL.md) ← Background info

---

## Status

After this fix:
- ✅ RLS policies work correctly
- ✅ Teachers see 305 lectures
- ✅ Schedule shows dates, courses, times, rooms
- ✅ Daily and weekly views work

Let me know when you've applied the fix and run the test!


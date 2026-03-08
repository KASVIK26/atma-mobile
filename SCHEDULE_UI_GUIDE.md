# Schedule UI Display Guide

## 📱 Daily View Layout

```
┌──────────────────────────────────────────┐
│  ← [LOGO]  My Schedule  [PROFILE]       │ Header
├──────────────────────────────────────────┤
│ [Daily]  [Weekly]                        │ View Tabs (Daily/Weekly)
├──────────────────────────────────────────┤
│ < MON  TUE  WED  THU  FRI  SAT  SUN   > │ Date Picker (7 day window)
│       [25]                               │ Today shown in green
├──────────────────────────────────────────┤
│ Selected: Wed, Feb 25                    │ Display area
│                                          │
│ ┌──────────────────────────────┐         │
│ │ Introduction to Psychology   │ [UP]    │ Session Card 1
│ │ PSY-101                      │         │
│ ├──────────────────────────────┤         │
│ │ ⏰ 09:00 AM - 10:30 AM (90m)│         │
│ │ 📍 Room 301, Building A     │         │
│ │ 👤 Prof. Ada Lovelace      │         │
│ └──────────────────────────────┘         │
│                                          │
│ ┌──────────────────────────────┐         │
│ │ Calculus II                  │ [UP]    │ Session Card 2
│ │ MAT-202                      │         │
│ ├──────────────────────────────┤         │
│ │ ⏰ 11:00 AM - 12:30 PM (90m)│         │
│ │ 📍 Room 105, Building C     │         │
│ │ 👤 Prof. Alan Turing       │         │
│ └──────────────────────────────┘         │
│                                          │
│                 [more cards below]       │
│                                          │
└──────────────────────────────────────────┘
Pull down to refresh ↓
```

## 📅 Weekly View Layout

```
┌──────────────────────────────────────────┐
│  ← [LOGO]  My Schedule  [PROFILE]       │ Header
├──────────────────────────────────────────┤
│ [Daily]  [Weekly]                        │ View Tabs
├──────────────────────────────────────────┤
│ This Week                                │
│                                          │
│ ┌──────────────────────────────┐         │
│ │ SUN     22                   │         │ Sunday Card (No classes)
│ │ No classes                   │         │
│ └──────────────────────────────┘         │
│                                          │
│ ┌──────────────────────────────┐         │
│ │ MON     23 (Today)           │ [Green] │ Monday Card (Today highlighted)
│ │ 09:00 Introduction to Psy[U] │         │ Compact format
│ │ 11:00 Calculus II            │ [U]     │
│ │ 02:00 Advanced Programming   │ [U]     │
│ └──────────────────────────────┘         │
│                                          │
│ ┌──────────────────────────────┐         │
│ │ TUE     24                   │         │ Tuesday Card
│ │ 10:00 Data Structures        │ [U]     │
│ │ 01:00 Linear Algebra         │ [U]     │
│ └──────────────────────────────┘         │
│                                          │
│ ┌──────────────────────────────┐         │
│ │ WED     25                   │         │ Wednesday Card
│ │ 09:00 Intro to Psychology    │ [U]     │
│ │ 02:00 Physics Lab            │ [ONG]   │ Status abbreviations
│ │ 04:00 Linear Algebra         │ [U]     │ U = Upcoming
│ └──────────────────────────────┘         │ ONG = Ongoing
│                                          │ C = Completed
│ [← more days below →]                    │
│                                          │
└──────────────────────────────────────────┘
Pull down to refresh ↓
```

## 🔄 Data Flow with Real Database

```
┌─────────────────┐
│  Student Login  │
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │ Check User Profile  │
    │ - ID: 8a3b5c2f...  │
    │ - Role: student     │
    │ - University: 755...│
    └────┬───────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Query student_enrollments         │
    │ WHERE student_id = '8a3b...'      │
    │ AND is_active = true              │
    │ Results: 3 sections              │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Query lecture_sessions            │
    │ WHERE section_id IN [1,2,3]       │
    │ AND university_id = '755...'      │
    │ AND is_active = true              │
    │ AND is_cancelled = false          │
    │ AND date BETWEEN start AND end    │
    │ Results: 12 sessions              │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Enrich with course/room/instructor│
    │ - Fetch course names              │
    │ - Fetch room names                │
    │ - Fetch instructor names          │
    │ Results: Full session details     │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Convert & Cache Data              │
    │ Store in component state          │
    │ Cache key: userId-startDate-endDate
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Display in UI                     │
    │ Daily View: Group by date         │
    │ Weekly View: Group by day of week │
    └──────────────────────────────────┘
```

## 📊 Session Card Variations

### Upcoming Class
```
┌─────────────────────────────┐
│ Intro to Psychology [UPCOM] │ Blue badge
├─────────────────────────────┤
│ PSY-101                     │
├─────────────────────────────┤
│ ⏰ 09:00 AM - 10:30 AM     │
│ 📍 Room 301, Building A    │
│ 👤 Prof. Ada Lovelace      │
│ ⏳ Max late: 5 mins        │
└─────────────────────────────┘
```

### Ongoing Class (with TOTP)
```
┌─────────────────────────────┐
│ Calculus II    [ONGOING]    │ Green badge
│ ⚠️ TOTP ACTIVE ⚠️          │ Red indicator
├─────────────────────────────┤
│ MAT-202                     │
├─────────────────────────────┤
│ ⏰ 11:00 AM - 12:30 PM     │
│ 📍 Room 105, Building C    │
│ 👤 Prof. Alan Turing       │
└─────────────────────────────┘
```

### Special Class
```
┌─────────────────────────────┐
│ Guest Lecture       [UPCOM] │
├─────────────────────────────┤
│ SPC-001                     │
├─────────────────────────────┤
│ ⏰ 02:00 PM - 03:00 PM     │
│ 📍 Auditorium A            │
│ 👤 Dr. Special Guest       │
│ ⭐ Special Class           │ Star indicator
└─────────────────────────────┘
```

### Completed Class
```
┌─────────────────────────────┐
│ Advanced Topics  [COMPLETED]│ Grey badge
├─────────────────────────────┤
│ ADV-401                     │
├─────────────────────────────┤
│ ⏰ 03:00 PM - 04:00 PM     │
│ 📍 Room 201, Building D    │
│ 👤 Prof. Expert Instructor │
└─────────────────────────────┘
```

## 🔄 Pull-to-Refresh Animation

```
Initial State:
┌─────────────────────────────┐
│ Sessions List              │
│ [Session 1]               │
│ [Session 2]               │
│ [Session 3]               │
└─────────────────────────────┘

User pulls down:
┌─────────────────────────────┐
│ ↓ Pull to Refresh           │ Text appears
│ [Session 1]               │
│ [Session 2]               │
│ [Session 3]               │
└─────────────────────────────┘

Dragging further:
┌─────────────────────────────┐
│ ⟳ (spinning)               │ Spinner appears
│ Refreshing...              │ "Refreshing" text
│ [Session 1]               │
│ [Session 2]               │
│ [Session 3]               │
└─────────────────────────────┘

After Refresh:
┌─────────────────────────────┐
│ Sessions List              │
│ [Updated Session 1]       │
│ [Updated Session 2]       │
│ [Updated Session 3]       │
│ [New Session 4]           │
└─────────────────────────────┘
```

## 📋 Console Output Example

```
[ViewScheduleScreen] Fetching student schedule...
[Schedule Service] Fetching student schedule for: 8a3b5c2f...
[Schedule Service] University: 755283d3...
[Schedule Service] Date range: 2026-01-26 to 2026-05-25
[Schedule Service] Found 3 active enrollments
[Schedule Service] Sample enrollments (first 2): [
  {
    "section_id": "0c7465ee-aaee-43a9-b29e-d886a37802aa",
    "course_id": "07a049dd-5261-41c5-87a1-78421a9e9ede",
    "batch": 2
  },
  {
    "section_id": "25b89aba-c39f-48ab-ad01-e19e27f39c92",
    "course_id": "15f1a2cd-7d42-45fe-9e1c-a8f2b5c8d1e2",
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

## 🎯 State Indicators

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| **Upcoming** | Blue | ◯ | Class scheduled in future |
| **Ongoing** | Green | ● | Class is happening now |
| **Completed** | Grey | ✓ | Class has finished |
| **Cancelled** | Red | ✗ | Class cancelled |
| **Rescheduled** | Orange | ⟳ | Class rescheduled |

## 📐 Responsive Layout

```
Small Phone (320px):
Single column, full width cards

Medium Phone (375px+):
Single column, padded cards

Large Phone (414px+):
Single column, wider cards with more padding

Tablet (768px+):
Could be 2-column, but not implemented yet
```

## 🔐 Data Privacy

- Only shows student's own schedule
- Filters by university_id (multi-tenant safe)
- Enrollments only visible to that student
- Teacher can only see their own sessions

## ⚡ Performance Metrics

- **First Load**: 1-2 seconds (includes network)
- **Refresh**: 200-500ms (background)
- **Cache Duration**: Until user refreshes
- **Data Size**: ~12-30 sessions per month

---

**Last Updated**: 2026-02-25
**Status**: ✅ Ready for testing

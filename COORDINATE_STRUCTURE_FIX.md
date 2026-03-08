# Coordinate Structure Fix

## Issue
```
ERROR: TypeError: ROOM_GEOMETRY.coordinates[0][1].toFixed is not a function (it is undefined)
```

## Root Cause
The polygon coordinates were nested one level too deep. 

**Before (Wrong):**
```typescript
coordinates: [
  [  // Extra nested array
    [75.784611, 23.167191],
    [75.784614, 23.167137],
    ...
  ]
]
```

When accessing `coordinates[0][1]`:
- `coordinates[0]` was `[[75.784611, 23.167191], ...]`
- `coordinates[0][1]` was `[75.784614, 23.167137]` (another array!)
- Calling `.toFixed()` on an array ❌ causes error

**After (Fixed):**
```typescript
coordinates: [
  [75.784611, 23.167191],
  [75.784614, 23.167137],
  [75.784665, 23.167132],
  [75.784665, 23.167181],
  [75.784611, 23.167191],
] as number[][]
```

When accessing `coordinates[0][1]`:
- `coordinates[0]` is `[75.784611, 23.167191]` ✓
- `coordinates[0][1]` is `23.167191` (a number) ✓
- `.toFixed(6)` returns `"23.167191"` ✓

## Changes Made

### File: screens/GeolocationTestScreen.tsx
Line 36-46: Removed extra array nesting in ROOM_GEOMETRY.coordinates

The structure now matches the RoomGeometry interface which expects:
- For Polygon: `coordinates: number[][]` (array of [lon, lat] pairs)
- For Point: `coordinates: [number, number]` (single [lon, lat] pair)

## Testing
```
Your Polygon Structure Now:
[
  [75.784611, 23.167191],  ← Line 1 (index 0)
  [75.784614, 23.167137],  ← Line 2 (index 1)
  [75.784665, 23.167132],  ← Line 3 (index 2)
  [75.784665, 23.167181],  ← Line 4 (index 3)
  [75.784611, 23.167191],  ← Line 5 (closes polygon)
]

Accessing coordinates:
coordinates[0]     = [75.784611, 23.167191]     ✓
coordinates[0][0]  = 75.784611 (longitude)      ✓
coordinates[0][1]  = 23.167191 (latitude)       ✓
coordinates[0][1].toFixed(6) = "23.167191"      ✓
```

## Status
✅ Fixed - The error should now be resolved. The polygon coordinates are now properly structured as a 2D array of number pairs.


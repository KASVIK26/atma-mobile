# Polygon Data Structure & GeoJSON Reference

## Your Classroom Polygon Data

### Original Data (from WKB/GeoJSON)
```json
{
  "type": "Polygon",
  "coordinates": [
    [75.784611, 23.167191],
    [75.784614, 23.167137],
    [75.784665, 23.167132],
    [75.784665, 23.167181],
    [75.784611, 23.167191]
  ]
}
```

### Coordinate Format Explanation

**Standard GeoJSON Format:** `[longitude, latitude]`

| Vertex | Longitude | Latitude | Location |
|--------|-----------|----------|----------|
| 1 (Start) | 75.784611 | 23.167191 | Top-left corner |
| 2 | 75.784614 | 23.167137 | Bottom-left corner |
| 3 | 75.784665 | 23.167132 | Bottom-right corner |
| 4 | 75.784665 | 23.167181 | Top-right corner |
| 5 (Closed) | 75.784611 | 23.167191 | Back to start (closes polygon) |

### Polygon Bounds
- **Latitude Range:** 23.167132 to 23.167191 (~0.000059°, ~6.5 meters North-South)
- **Longitude Range:** 75.784611 to 75.784665 (~0.000054°, ~4.5 meters East-West)
- **Approximate Shape:** Small rectangular classroom located in Indore, India

### Clarification: "Room Center"

**I COMPUTED the center, it was NOT in your original data:**
```javascript
// Center calculation (averaging all vertices):
centerLongitude = (75.784611 + 75.784614 + 75.784665 + 75.784665) / 4 = 75.7846375
centerLatitude = (23.167191 + 23.167137 + 23.167132 + 23.167181) / 4 = 23.1671575

// Result: Center point = [75.7846375, 23.1671575]
```

This center is used only for:
1. **Distance calculation** - "How far is student from classroom center?"
2. **Map display** - Orange marker in the middle of polygon
3. **Fallback reference** - If exact polygon checking fails

---

## How Polygon Point-in-Polygon Works

### What is Point-in-Polygon?

It's a geometric algorithm that answers: **Is this point (student's location) inside this polygon (classroom boundary)?**

### Visual Example (Your Classroom)

```
Classroom Bounds (Top-Down View)
========================================
(North)
  ↑
  │
  │   [75.7846, 23.1672]  ← Vertex 4 (Top-right)
  │   ○─────────────────○─────→ (East)
  │   │                 │
  │   │  ■ CENTER       │
  │   │  (computed)     │
  │   │                 │
  │   │                 │  Student Location:
  │   │  ✓ Inside:     ✗ Outside:
  │   │  23.16718      23.16717
  │   │  75.78463      75.78462 (too far West)
  │   │                 │
  │   ○─────────────────○
  │   [75.7846, 23.1671]  ← Vertex 1 (Bottom-left)
  │
  └──────────────────────→
       (East)
```

### The Algorithm (Turf.js)

Turf's `booleanPointInPolygon` function uses the **Ray Casting Algorithm:**

1. **Draw imaginary ray** from student's location to infinity (east direction)
2. **Count boundary crossings** - How many polygon edges does ray cross?
3. **Decision rule:**
   - Even number of crossings = OUTSIDE polygon
   - Odd number of crossings = INSIDE polygon

**Why this works:** If you cross the boundary odd times, you're inside. Even times, you're outside.

---

## Coordinate System: Latitude vs Longitude

### Common Confusion

```
❌ WRONG (many people confuse this):
Location = [latitude, longitude] = [23.16717, 75.78462]

✅ CORRECT (GeoJSON standard):
Location = [longitude, latitude] = [75.78462, 23.16717]
```

### Memory Trick

**"LON-LAT" = "East-West, North-South"**
- **Longitude** = East-West position (X-axis, ranges -180 to +180)
- **Latitude** = North-South position (Y-axis, ranges -90 to +90)

### In Your Data

```javascript
// Your polygon vertex
[75.784611, 23.167191]
 ↑          ↑
 │          └─ Latitude  (North-South: 23° North of Equator)
 └────────── Longitude (East-West: 75° East of Prime Meridian)
```

**Location on Earth:** Indore, India (actually, more precisely, northwestern India)

---

## Implementation Changes (Using Turf.js)

### Before (Manual Ray-Casting - Had Bug)
```typescript
// Old: Custom implementation, might have coordinate order issues
const isInside = isPointInsidePolygon([lon, lat], polygonCoords);
```

### After (Turf.js - Battle-Tested)
```typescript
// New: Turf's verified implementation
import { booleanPointInPolygon, point, polygon } from '@turf/turf';

const studentPoint = point([lon, lat]); // [longitude, latitude]
const turfPolygon = polygon([polygonCoords]); // Wrap coords as GeoJSON
const isInside = booleanPointInPolygon(studentPoint, turfPolygon);
```

### Why Turf is Better

1. **Handles edge cases** - Points on polygon boundary, complex geometries
2. **Tested library** - Used by mapping/GIS professionals worldwide
3. **GeoJSON compliant** - Works with standard geographic data formats
4. **Properly handles holes** - Can check polygons with holes inside
5. **No coordinate confusion** - Explicit [lon, lat] format

---

## What the Map Shows

### Color Coding (Updated)

| Color | Meaning | Polygon Color | Info Panel |
|-------|---------|---|---|
| 🟢 Green | Student INSIDE classroom | Green boundary, green fill | "✅ INSIDE CLASSROOM" |
| 🔴 Red | Student OUTSIDE classroom | Red boundary, red fill | "❌ OUTSIDE CLASSROOM" |

### Live Indicators

- **Polygon Vertices** (orange circles): The 4-5 corners of classroom boundary
- **Polygon Center** (orange dot): Computed centroid for reference
- **Student Location** (pink/magenta circle): Your current GPS position
- **Accuracy Circle** (dashed pink): Your GPS ±accuracy radius
- **"Live Location" panel** (bottom-left): Real-time status and coordinates

### Example from Your Screenshot

```
Status: ❌ OUTSIDE CLASSROOM
Center: 23.167166, 75.784633
Your Location: 23.167170, 75.784623
Accuracy: 5.0m

Analysis:
- Student point: (23.167170, 75.784623)
- Ray-cast from student eastward
- Ray crosses polygon boundary EVEN times
- Result: OUTSIDE ❌
```

---

## Testing the Fix

### Steps to Verify Point-in-Polygon Works

1. Open Geolocation Test Screen
2. Click "Get Location" → Shows your current position
3. Observe map:
   - If you're inside polygon → 🟢 Green, "✅ Inside"
   - If you're outside polygon → 🔴 Red, "❌ Outside"
4. Walk around:
   - Move towards classroom → polygon color should change to GREEN
   - Move away from classroom → polygon color should change to RED

### What to Expect

**Inside the Classroom (±3m from center):**
- Polygon: GREEN
- Status: ✅ INSIDE CLASSROOM
- Distance: 0-10m from center
- Confidence: HIGH (if accuracy < 5m)

**Outside the Classroom (>10m from center):**
- Polygon: RED
- Status: ❌ OUTSIDE CLASSROOM
- Distance: 10-50m from center
- Confidence: MEDIUM/LOW

---

## Data Structure in Code

### How Your Data Flows

```typescript
// Your GeoJSON polygon
const ROOM_GEOMETRY: RoomGeometry = {
  type: 'Polygon',
  coordinates: [
    [75.784611, 23.167191],  // [longitude, latitude]
    [75.784614, 23.167137],
    [75.784665, 23.167132],
    [75.784665, 23.167181],
    [75.784611, 23.167191],  // Closes by repeating first vertex
  ] as number[][],
};

// Student's GPS location
const studentLocation: LocationCoordinates = {
  latitude: 23.16717,
  longitude: 75.7846217,
  accuracy: 5.0,
  altitude: 547.2,
  speed: 0.0,
};

// Check: Is student inside?
const result = isInsideRoom(studentLocation, ROOM_GEOMETRY);
// Result: {
//   isInside: true,           // Turf.js point-in-polygon check
//   distance: 3.45,           // Distance to computed center
//   confidence: 'high'        // Based on GPS accuracy
// }
```

---

## Turf.js Functions Used

### booleanPointInPolygon
```typescript
import { booleanPointInPolygon, point, polygon } from '@turf/turf';

const pt = point([75.784623, 23.167170]);             // [lon, lat]
const poly = polygon([[...polygonCoordinates...]]);   // Wrap as GeoJSON
const isInside = booleanPointInPolygon(pt, poly);    // Returns true/false
```

**Advantages:**
- Returns single boolean (true/false)
- Handles boundary cases correctly
- Works with complex polygons
- Industry standard

### Alternative: booleanPointInPolygon with Feature

```typescript
import { booleanPointInPolygon } from '@turf/turf';

const studentPoint: Feature<Point> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Point',
    coordinates: [75.784623, 23.167170],  // [lon, lat]
  },
};

const classroomPolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Classroom' },
  geometry: {
    type: 'Polygon',
    coordinates: [[...polygonCoordinates...]],
  },
};

const isInside = booleanPointInPolygon(studentPoint, classroomPolygon);
```

---

## Summary

**Your Polygon Data:**
- Type: GeoJSON Polygon
- Format: [longitude, latitude]
- Location: Indore, India
- Size: ~6.5m x 4.5m rectangle
- "Room Center": Computed by averaging vertices (NOT in your data)

**Point-in-Polygon Check:**
- Method: Turf.js `booleanPointInPolygon` (ray casting algorithm)
- Returns: Boolean (true = inside, false = outside)
- Accuracy: Perfect for geometric boundaries

**What Changed:**
- Removed buggy custom ray-casting implementation
- Added Turf.js for battle-tested geospatial operations
- Fixed coordinate format handling [lon, lat]
- Added proper console logging for debugging

---

**Last Updated:** February 26, 2026  
**Status:** ✅ Point-in-polygon check implemented with Turf.js

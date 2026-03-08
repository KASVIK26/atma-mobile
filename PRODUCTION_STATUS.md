# PRODUCTION_STATUS

Production hardening applied across two sessions. Every item below is fully implemented and merged into the codebase.

---

## 1. Persistent Authentication — 100 %

**Problem:** Users were silently logged out after first use because Supabase's JWT session (often >2 KB) silently failed to write to Expo SecureStore, which has a 2 048-byte per-key limit.

**Fix (`lib/supabase.ts`):**
- `secureSet` splits values into 1 800-byte chunks under keys `<key>__chunk_0`, `<key>__chunk_1`, …, with a manifest under `<key>__chunks`.
- `secureGet` and `secureRemove` reconstruct / clean up all chunks transparently.
- Supabase client uses this chunked adapter as its `storage` option.

---

## 2. Navigation Stability — 100 %

**Problem:** The Android back-button exit dialog appeared on every screen (not just the dashboard) because the `BackHandler` registration in `app/(main)/home.tsx` used a plain `useEffect` that never unregistered when navigating away.

**Fix (`app/(main)/home.tsx`):**
- Replaced `useEffect` with `useFocusEffect` + `useCallback` from `expo-router`.
- `BackHandler` is now registered only while `home.tsx` is the focused screen and removed automatically when the user navigates elsewhere.

---

## 3. OTP → Profile Race Condition — 100 %

**Problem:** After OTP verification, users were thrown back to the welcome screen because a second SIGNED_IN event fired while `fetchUserProfile` was already running; the guard detected an in-flight fetch and skipped it, leaving `userProfile` null.

**Fix (`context/AuthContext.tsx`):**
- `isFetchingProfileRef` now triggers a **wait-and-retry** loop (up to 3 × 200 ms) instead of silently returning.
- Added `isProfileLoading` Zustand state that blocks the routing guard until the profile is fully loaded.

---

## 4. Zustand State Management — 100 %

**Problem:** All auth state lived in `useState` inside `AuthContext`, causing every consumer to re-render on any state change (session hydration, profile load, signing out).

**Implementation (`store/authStore.ts`):**
- Single `useAuthStore` Zustand store holds `session`, `user`, `userProfile`, `enrollments`, `instructor`, `isLoading`, `isProfileLoading`, `isSigningOut`.
- Granular per-field setters and an atomic `clearAll()` action.
- Exported selectors: `selectUserRole`, `selectIsAuthenticated`, `selectIsStudent`, `selectIsTeacher`, `selectIsAdmin`.
- `AuthContext` is now a slim method-only provider; `useAuth()` merges store state + context methods for full backward compatibility.

---

## 5. TanStack Query Server State — 100 %

**Problem:** Every screen did its own `useState + useEffect + useCallback` data fetching with no caching, so switching tabs always triggered a network request.

**Implementation:**
- `lib/query-client.ts` — shared `QueryClient` (`staleTime: 2 min`, `gcTime: 5 min`, exponential retry capped at 5 s).
- `hooks/queries/useDashboardQuery.ts` — `useStudentDashboardQuery` and `useTeacherDashboardQuery`.
- `hooks/queries/useAttendanceHistoryQuery.ts` — `useStudentAttendanceHistoryQuery` (keyed by `userId + filterMode`) and `useTeacherAttendanceHistoryQuery` (keyed by all filter fields).
- `app/_layout.tsx` wraps the full tree with `<QueryClientProvider>`.
- Migrated screens: `StudentDashboard`, `TeacherDashboard`, `StudentAttendanceHistoryScreen`, `TeacherAttendanceHistoryScreen`.

---

## 6. MMKV Fast Storage — 100 %

**Implementation (`lib/storage.ts`):**
- `new MMKV({ id: 'atma-storage' })` with a `Map`-based in-memory fallback for Expo Go (where the native module is not available without prebuild).
- Exports `storage` + `storageSetJSON` / `storageGetJSON` helpers for typed JSON round-trips.
- **Note:** run `npx expo prebuild` once to compile the native MMKV module for a development build.

---

## 7. Exponential-Backoff Retry Helper — 100 %

**Implementation (`lib/retry.ts`):**
- `withRetry<T>(fn, options)` — base 300 ms, 2× exponential, max 5 s, ±20 % jitter.
- `withSupabaseRetry` — skips retries for RLS / FK / type errors (HTTP 4xx that are not 429).

---

## 8. SplashScreen Guard — 100 %

**Implementation (`app/_layout.tsx`):**
- `SplashScreen.preventAutoHideAsync()` called synchronously at module load.
- `SplashController` component reads `isLoading` from the Zustand store via `useAuthStore`; once auth hydration completes it calls `SplashScreen.hideAsync()` with a 150 ms delay so the first painted frame is visible before the splash fades.

---

## 9. Centralised Toast System — 100 %

**Implementation:**
- `lib/toast.ts` — `showToast.success(text1, text2?)`, `showToast.error(...)`, `showToast.info(...)` wrappers over `react-native-toast-message`.
- `<Toast />` rendered inside `AuthProvider` in `_layout.tsx` so it floats above all screens.

---

## 10. React.memo on Card Components — 100 %

Re-render cost of list/grid children eliminated. Each component is now declared as a private `_ComponentName` and re-exported as `React.memo(_ComponentName)`.

| Component | File |
|---|---|
| `StatsCard` | `components/StatsCard.tsx` |
| `UpcomingClassCard` | `components/UpcomingClassCard.tsx` |
| `QuickActionButton` | `components/QuickActionButton.tsx` |
| `ClassCard` | `components/ClassCard.tsx` |

---

## 11. Sentry Error Monitoring — 100 %

**Implementation:**
- `@sentry/react-native` installed.
- `Sentry.init(...)` called in `app/_layout.tsx` when `EXPO_PUBLIC_SENTRY_DSN` is set (no-op otherwise — safe for local dev without config).
- Traces sample rate: `20 %` in production, `100 %` in development.
- `ErrorBoundary.componentDidCatch` forwards all uncaught render errors to Sentry via `Sentry.captureException`.
- `EXPO_PUBLIC_SENTRY_DSN` placeholder added to `.env.example`.

---

## Quick-start checklist for a fresh environment

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in values
cp .env.example .env

# 3. Build native modules (required for MMKV)
npx expo prebuild --clean

# 4. Run on device / simulator
npx expo run:android   # or run:ios
```

---

*Last updated: Session 2 production hardening — all 11 areas complete.*

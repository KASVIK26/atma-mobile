/**
 * Zustand Auth Store
 *
 * Single source of truth for all authentication and user-profile state.
 * Components subscribe to ONLY the slices they need, which means a profile
 * re-fetch does NOT re-render a header that only reads `userRole`.
 *
 * The store exposes both granular selectors (recommended for components) and
 * the legacy-compatible `getAuthState()` snapshot used by AuthContext's routing
 * effect and Supabase event handlers.
 */

import {
    InstructorData,
    StudentEnrollment,
    UserProfile,
    UserRole,
} from '@/context/AuthContext';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { create } from 'zustand';

// ── State shape ──────────────────────────────────────────────────────────────

export interface AuthStoreState {
  // Session
  session: Session | null;
  user: SupabaseUser | null;

  // Profile
  userProfile: UserProfile | null;
  enrollments: StudentEnrollment[] | null;
  instructor: InstructorData | null;

  // Loading flags — kept granular so components only re-render for their flag
  isLoading: boolean;        // initial auth hydration
  isProfileLoading: boolean; // profile fetch in-flight
  isSigningOut: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────
  setSession: (session: Session | null) => void;
  setUser: (user: SupabaseUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setEnrollments: (enrollments: StudentEnrollment[] | null) => void;
  setInstructor: (instructor: InstructorData | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsProfileLoading: (loading: boolean) => void;
  setIsSigningOut: (v: boolean) => void;

  /**
   * Atomic clear — resets all session & profile state in ONE Zustand commit
   * instead of 5 separate setState calls. This eliminates intermediate renders
   * where session is null but profile still appears to be set.
   */
  clearAll: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStoreState>((set) => ({
  // Initial state
  session: null,
  user: null,
  userProfile: null,
  enrollments: null,
  instructor: null,
  isLoading: true,
  isProfileLoading: false,
  isSigningOut: false,

  // Actions
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setEnrollments: (enrollments) => set({ enrollments }),
  setInstructor: (instructor) => set({ instructor }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
  setIsSigningOut: (isSigningOut) => set({ isSigningOut }),

  clearAll: () =>
    set({
      session: null,
      user: null,
      userProfile: null,
      enrollments: null,
      instructor: null,
      isSigningOut: false,
    }),
}));

// ── Granular selectors (stable references — prevent unnecessary re-renders) ──

/** Call only when you need the full snapshot (e.g. routing effect) */
export const selectAuthSnapshot = (s: AuthStoreState) => ({
  session: s.session,
  user: s.user,
  userProfile: s.userProfile,
  enrollments: s.enrollments,
  instructor: s.instructor,
  isLoading: s.isLoading,
  isProfileLoading: s.isProfileLoading,
  isSigningOut: s.isSigningOut,
});

export const selectUserRole = (s: AuthStoreState): UserRole | null =>
  s.userProfile?.role ?? null;

export const selectIsAuthenticated = (s: AuthStoreState) => s.session !== null;
export const selectIsStudent = (s: AuthStoreState) =>
  s.userProfile?.role === 'student';
export const selectIsTeacher = (s: AuthStoreState) =>
  s.userProfile?.role === 'teacher';
export const selectIsAdmin = (s: AuthStoreState) =>
  s.userProfile?.role === 'admin';

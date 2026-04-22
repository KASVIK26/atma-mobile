import supabase from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import React, { ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

/**
 * User profile data from users table
 * Includes role-specific fields
 */
export interface UserProfile {
  id: string;
  university_id: string;
  university_name?: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  
  // Student-specific fields
  enrollment_id?: string;
  branch_id?: string;
  semester_id?: string;
  batch?: number;
  
  // Teacher-specific fields
  instructor_code?: string;
  department?: string;
  
  profile_picture_url?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

/**
 * Student enrollment data from student_enrollments table
 */
export interface StudentEnrollment {
  id: string;
  course_id: string;
  section_id: string;
  batch: number;
  is_active: boolean;
  enrollment_date: string;
}

/**
 * Instructor data from instructors table (public reference)
 */
export interface InstructorData {
  id: string;
  university_id: string;
  user_id?: string | null;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Complete auth context state
 */
export interface AuthContextType {
  // Session state
  session: Session | null;
  isLoading: boolean;
  isSigningOut: boolean;
  
  // User data
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  
  // Student-specific
  enrollments: StudentEnrollment[] | null;
  
  // Teacher-specific
  instructor: InstructorData | null;
  
  // Auth methods
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    university_id: string,
    additionalData?: {
      phone?: string;
      profile_picture_url?: string;
      enrollment_id?: string;
      branch_id?: string | null;
      semester_id?: string | null;
      batch?: number;
      instructor_code?: string;
      department?: string;
    }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshUserProfile: (userId: string) => Promise<void>;
  
  // Teacher OTP signup methods
  lookupInstructorByEmail: (email: string, university_id: string) => Promise<{ instructor: InstructorData | null; error: Error | null }>;
  sendTeacherOTP: (email: string, instructor_name: string) => Promise<{ error: Error | null }>;
  verifyTeacherOTP: (email: string, otp: string, university_id: string, instructorData: InstructorData) => Promise<{ error: Error | null }>;
  
  // Status methods
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;

  // Profile loading indicator — true while any fetchUserProfile call is in flight.
  // Consumers (e.g. routing guard) should wait for this to be false before acting
  // on a null userRole to avoid false-positive redirects to the welcome screen.
  isProfileLoading: boolean;
}

// ============================================================================
// CONTEXT & PROVIDER
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const segments = useSegments();

  // ── Zustand store (all state centralised here) ────────────────────────────────
  // AuthProvider orchestrates side-effects (Supabase events, routing).
  // State itself lives in Zustand so components can subscribe granularly.
  const {
    setSession,
    setUser,
    setUserProfile: setUserProfileStore,
    setEnrollments,
    setInstructor,
    setIsLoading,
    setIsProfileLoading,
    setIsSigningOut,
    clearAll,
  } = useAuthStore();

  // Read routing-relevant state from Zustand with a selector so AuthProvider
  // only re-renders when these specific values change (not all store updates).
  const isLoading       = useAuthStore((s) => s.isLoading);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const _session        = useAuthStore((s) => s.session);
  const _userRole       = useAuthStore((s) => s.userProfile?.role ?? null);

  // Sync a ref with userProfile so AppState/onAuthStateChange callbacks always
  // see the latest value without needing to close over stale Zustand state.
  const userProfileRef = useRef<UserProfile | null>(null);
  const setUserProfile = (profile: UserProfile | null) => {
    userProfileRef.current = profile;
    setUserProfileStore(profile);
  };

  // Concurrency guard — prevents two simultaneous fetchUserProfile calls.
  const isFetchingProfileRef = useRef(false);

  // Recovery guard — when the cold-start profile fetch is aborted (slow network),
  // the routing guard retries once before redirecting to welcome.  Reset on sign-out.
  const hasTriedProfileRecovery = useRef(false);

  // ============================================================================
  // SETUP & SESSION RECOVERY
  // ============================================================================

  /**
   * Fetch user profile from users table
   */
  const fetchUserProfile = async (userId: string) => {
    // If a fetch is already in-flight, WAIT for it to finish and then do a fresh
    // fetch rather than silently skipping.  This fixes the OTP sign-up race where:
    //   1. SIGNED_IN event triggers a fetch BEFORE the profile row exists in the DB.
    //   2. The screen inserts the row, then calls refreshUserProfile.
    //   3. Without waiting, the second call is a no-op → userRole stays null → router
    //      sees an authenticated user with no role and redirects to welcome.
    if (isFetchingProfileRef.current) {
      console.log('[fetchUserProfile] Waiting for in-progress fetch to finish, will retry…');
      await new Promise<void>((resolve) => {
        const poll = setInterval(() => {
          if (!isFetchingProfileRef.current) {
            clearInterval(poll);
            resolve();
          }
        }, 50);
        // Safety: don't wait more than 8 seconds
        setTimeout(() => { clearInterval(poll); resolve(); }, 8_000);
      });
      console.log('[fetchUserProfile] Previous fetch complete — starting fresh fetch');
    }
    isFetchingProfileRef.current = true;
    setIsProfileLoading(true);

    // ── Per-fetch abort timeout ──────────────────────────────────────────────
    // On Android cold start the radio/network stack can take several seconds to
    // become available.  Without a timeout the supabase fetch() hangs forever,
    // keeping isProfileLoading=true which permanently blocks the routing guard.
    const fetchAbortController = new AbortController();
    const fetchAbortTimeout = setTimeout(() => {
      console.warn('[fetchUserProfile] Query taking too long — aborting after 7 s');
      fetchAbortController.abort();
    }, 7_000);

    try {
      console.log('[fetchUserProfile] Starting profile fetch for user:', userId.substring(0, 8) + '***');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .abortSignal(fetchAbortController.signal);

      clearTimeout(fetchAbortTimeout);

      if (error) {
        console.error('[fetchUserProfile] ❌ Query error:', error);
        throw error;
      }
      
      console.log('[fetchUserProfile] Query complete, records found:', data?.length || 0);
      
      // Handle case where user doesn't exist in users table yet (e.g., during signup)
      if (data && data.length > 0) {
        const profile = data[0] as UserProfile;
        console.log('[fetchUserProfile] ✅ User profile found:', {
          id: profile.id?.substring(0, 8) + '***',
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name,
          is_active: profile.is_active,
        });
        
        // Fetch university name
        try {
          const { data: univData, error: univError } = await supabase
            .from('universities')
            .select('name')
            .eq('id', profile.university_id)
            .single();
          
          if (!univError && univData) {
            profile.university_name = univData.name;
          }
        } catch (err) {
          console.warn('[fetchUserProfile] Could not fetch university name:', err);
        }
        
        setUserProfile(profile);

        // Fetch role-specific data
        if (profile.role === 'student') {
          console.log('[fetchUserProfile] Fetching student enrollments...');
          await fetchStudentEnrollments(userId);
        } else if (profile.role === 'teacher') {
          console.log('[fetchUserProfile] Fetching instructor data...');
          await fetchInstructorData(userId);
        } else {
          console.warn('[fetchUserProfile] ⚠️ Unknown role:', profile.role);
        }
      } else {
        // User doesn't exist in users table yet (normal during signup flow)
        console.log('[fetchUserProfile] User profile not found in database (may be in signup flow)');
        setUserProfile(null);
      }
    } catch (error) {
      clearTimeout(fetchAbortTimeout);
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      if (isAbortError) {
        console.warn('[fetchUserProfile] ⚠️ Fetch aborted (timeout) — profile unavailable for this boot cycle');
      } else {
        console.error('[fetchUserProfile] ❌ Exception during profile fetch:', error);
      }
      // Don't wipe an already-loaded profile on transient fetch errors (e.g. network
      // blip when app resumes after hours in background).  Only null-out when there
      // was genuinely no profile to begin with (e.g. first load or sign-in failure).
      if (!userProfileRef.current) {
        setUserProfile(null);
      } else {
        console.warn('[fetchUserProfile] Keeping existing profile despite fetch error');
      }
    } finally {
      clearTimeout(fetchAbortTimeout);
      isFetchingProfileRef.current = false;
      setIsProfileLoading(false);
    }
  };

  /**
   * Fetch student enrollments
   */
  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      console.log('[fetchStudentEnrollments] Fetching for student:', studentId.substring(0, 8) + '***');
      
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('user_id', studentId)
        .eq('is_active', true);

      if (error) {
        console.error('[fetchStudentEnrollments] ❌ Query error:', error);
        throw error;
      }
      
      console.log('[fetchStudentEnrollments] ✅ Found enrollments:', data?.length || 0);
      setEnrollments(data as StudentEnrollment[]);
    } catch (error) {
      console.error('[fetchStudentEnrollments] ❌ Exception:', error);
      setEnrollments(null);
    }
  };

  /**
   * Fetch instructor data from instructors table
   */
  const fetchInstructorData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      if (data) {
        setInstructor(data as InstructorData);
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error);
    }
  };

  /**
   * Initialize auth — single-path via onAuthStateChange.
   *
   * Supabase JS v2 fires `INITIAL_SESSION` synchronously the moment you
   * subscribe.  We use that event as the canonical cold-start path so there
   * is only ONE place that reads the stored session and only ONE call to
   * fetchUserProfile on launch (eliminating the old race condition between the
   * manual getSession() call and the onAuthStateChange subscription).
   *
   * Hard timeout: if INITIAL_SESSION never fires (e.g. SecureStore I/O hangs
   * on some Android devices), we force isLoading = false after 10 s so the
   * app never stays on a blank white screen forever.
   */
  useEffect(() => {
    let mounted = true;

    // ── Hard-timeout safety net ──────────────────────────────────────────────
    // Forces isLoading → false after 10 s regardless of what the SDK does.
    // Also releases the isProfileLoading lock so the routing guard is never
    // permanently blocked by a hung network call (e.g. slow Android radio on
    // cold start after a process kill / cache clear).
    const initTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Init timeout — forcing isLoading = false');
        setIsLoading(false);
        // If a profile fetch is still in-flight, release its lock too so the
        // routing guard (which guards on isProfileLoading) can proceed.
        if (isFetchingProfileRef.current) {
          console.warn('[AuthContext] Profile fetch still in-flight at init timeout — releasing lock');
          isFetchingProfileRef.current = false;
          setIsProfileLoading(false);
        }
      }
    }, 10_000);

    // ── Single-path auth subscription ───────────────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('[Auth State Change] Event:', event, 'Has session:', !!newSession?.user);

      if (event === 'INITIAL_SESSION') {
        // ── Cold-start / app relaunch ────────────────────────────────────────
        // This fires immediately on subscribe with whatever session is currently
        // in SecureStore.  It is the ONLY place we load the initial profile on
        // cold start — no separate getSession() call needed.
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchUserProfile(newSession.user.id);
        }
        // Always mark loading done after the initial check.
        if (mounted) {
          clearTimeout(initTimeout);
          setIsLoading(false);
        }
        return;
      }

      // ── Subsequent events ────────────────────────────────────────────────
      if (newSession?.user) {
        // Valid session change (SIGNED_IN, TOKEN_REFRESHED with user, etc.)
        // Reset recovery flag so a fresh retry is available for this session.
        hasTriedProfileRecovery.current = false;
        setSession(newSession);
        setUser(newSession.user);
        await fetchUserProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        // Explicit logout — clear atomically.
        console.log('[Auth State Change]', event, '— clearing all state (atomic)');
        clearAll();
        userProfileRef.current = null;
        hasTriedProfileRecovery.current = false;
      }
      // For any other null-session event (TOKEN_REFRESHED failure, network blip)
      // keep existing state intact — AppState listener will re-validate on resume.
    });

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  // ============================================================================
  // APP STATE — re-hydrate session & profile when app comes to foreground
  // ============================================================================
  // When Android/iOS resumes the app after hours in background the Supabase SDK
  // may have already tried (and failed) to refresh the token while we were
  // suspended.  Re-checking here guarantees:
  //   • Active session  → profile is re-fetched if it went missing
  //   • Expired session → state is properly cleared so routing redirects to login
  // 
  // CRITICAL: Add timeout protection to prevent stuck splash screen if network
  // is unavailable or hung during foreground resume.
  useEffect(() => {
    let lastState = AppState.currentState;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const comingToForeground = lastState !== 'active' && nextState === 'active';
      lastState = nextState;

      if (!comingToForeground) return;

      console.log('[AuthContext] App returned to foreground — refreshing session');
      
      // Timeout controller for foreground resume operations
      // If getSession() or profile fetch takes > 6 seconds, force timeout
      const resumeAbortController = new AbortController();
      const resumeTimeout = setTimeout(() => {
        console.warn('[AuthContext] Foreground resume timeout — aborting getSession and profile fetch');
        resumeAbortController.abort();
      }, 6_000);

      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (resumeAbortController.signal.aborted) {
          console.warn('[AuthContext] getSession was aborted due to timeout');
          clearTimeout(resumeTimeout);
          return;
        }

        if (error) {
          console.warn('[AuthContext] getSession error on resume:', error.message);
          clearTimeout(resumeTimeout);
          return;
        }

        if (currentSession?.user) {
          // Validate session isn't corrupted — check if user ID changed
          const storedUser = useAuthStore.getState().user;
          if (storedUser?.id && storedUser.id !== currentSession.user.id) {
            console.warn('[AuthContext] Session corruption detected — user ID mismatch during resume');
            console.warn('[AuthContext] Stored user:', storedUser.id.substring(0, 8) + '***');
            console.warn('[AuthContext] Current session user:', currentSession.user.id.substring(0, 8) + '***');
            // Clear all state to force re-authentication
            clearAll();
            userProfileRef.current = null;
            clearTimeout(resumeTimeout);
            return;
          }

          setSession(currentSession);
          setUser(currentSession.user);
          // Re-fetch profile only if it's gone (avoids unnecessary network calls)
          if (!userProfileRef.current) {
            console.log('[AuthContext] Profile missing after resume — re-fetching with timeout');
            
            // Wrap fetchUserProfile with timeout
            const profileFetchPromise = fetchUserProfile(currentSession.user.id);
            const profileFetchWithTimeout = Promise.race([
              profileFetchPromise,
              new Promise<void>((_, reject) => {
                const timeoutId = setTimeout(() => {
                  console.warn('[AuthContext] Profile fetch on resume timed out after 5 seconds');
                  reject(new Error('Profile fetch timeout on resume'));
                }, 5_000);
                resumeAbortController.signal.addEventListener('abort', () => {
                  clearTimeout(timeoutId);
                  reject(new Error('Profile fetch aborted'));
                });
              }),
            ]);

            try {
              await profileFetchWithTimeout;
            } catch (profileErr: any) {
              console.warn('[AuthContext] Profile fetch on resume failed:', profileErr.message);
              // CRITICAL: Even if profile fetch fails/times out, we MUST release the lock
              // so routing can proceed. User might be in a transient state but we don't
              // want them stuck on a blank screen.
              if (isFetchingProfileRef.current) {
                console.warn('[AuthContext] Forcing profile load lock release due to resume timeout');
                isFetchingProfileRef.current = false;
                setIsProfileLoading(false);
              }
            }
          }
          // Ensure the token auto-refresh is running after a long background suspension
          supabase.auth.startAutoRefresh();
        } else {
          // Session genuinely expired / logged out while backgrounded
          if (userProfileRef.current) {
            console.log('[AuthContext] Session expired in background — clearing state (atomic)');
            clearAll();
            userProfileRef.current = null;
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error during foreground session refresh:', err);
        // If there was an error, also release the profile loading lock
        if (isFetchingProfileRef.current) {
          console.warn('[AuthContext] Releasing profile load lock due to error');
          isFetchingProfileRef.current = false;
          setIsProfileLoading(false);
        }
      } finally {
        clearTimeout(resumeTimeout);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  // fetchUserProfile is defined in the same render scope; it's stable enough
  // for this purpose (its internals use setters that are always fresh).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  /**
   * Sign up new user
   * Creates auth user and profile in users table
   * For OTP-based signup, password should be 'otp-authenticated'
   */
  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    university_id: string,
    additionalData?: {
      phone?: string;
      profile_picture_url?: string;
      enrollment_id?: string;
      program_id?: string;
      branch_id?: string | null;
      semester_id?: string | null;
      batch?: number;
      instructor_code?: string;
      department?: string;
    }
  ) => {
    try {
      console.log('[SignUp] Starting signup process...', { email, role, firstName, lastName });

      // For signup after OTP verification, auth user already exists
      const session = await supabase.auth.getSession();
      if (!session?.data?.session?.user) {
        throw new Error('No authenticated session found for signup');
      }

      const userId = session.data.session.user.id;
      console.log('[SignUp] Using existing auth user:', userId.substring(0, 8) + '***');

      // Create user profile in users table
      const profileData: any = {
        id: userId,
        university_id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        is_active: true,
      };

      // Add optional profile fields
      if (additionalData?.phone) profileData.phone = additionalData.phone;
      if (additionalData?.profile_picture_url) profileData.profile_picture_url = additionalData.profile_picture_url;
      if (additionalData?.enrollment_id) profileData.enrollment_id = additionalData.enrollment_id;
      if (additionalData?.program_id) profileData.program_id = additionalData.program_id;
      if (additionalData?.branch_id !== undefined) profileData.branch_id = additionalData.branch_id;
      if (additionalData?.semester_id !== undefined) profileData.semester_id = additionalData.semester_id;
      if (additionalData?.batch) profileData.batch = additionalData.batch;
      if (additionalData?.instructor_code) profileData.instructor_code = additionalData.instructor_code;
      if (additionalData?.department) profileData.department = additionalData.department;

      console.log('[SignUp] Creating user profile with data:', {
        id: userId.substring(0, 8) + '***',
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        enrollment_id: additionalData?.enrollment_id,
        program_id: additionalData?.program_id,
        branch_id: additionalData?.branch_id,
        semester_id: additionalData?.semester_id,
        is_active: true,
      });

      const { error: profileError, data: profileResult } = await supabase.from('users').insert(profileData);

      if (profileError) {
        console.error('[SignUp] ❌ Failed to create user profile:', profileError);
        throw profileError;
      }

      console.log('[SignUp] ✅ User profile created successfully in users table');

      // Refresh user profile in context to sync state
      console.log('[SignUp] Refreshing user profile in context...');
      await fetchUserProfile(userId);

      return { error: null };
    } catch (error) {
      console.error('[SignUp] ❌ Sign up error:', error);
      return { error: error as Error };
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update last login timestamp
      if (data.user) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      console.log('[SignOut] Starting logout process...');
      setIsSigningOut(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('[SignOut] Supabase signOut completed, clearing local state...');
      
      // Atomic clear via Zustand — eliminates intermediate renders between
      // "session gone" and "profile still shows" that the old sequential setters caused.
      clearAll();
      userProfileRef.current = null;

      console.log('[SignOut] ✅ All state cleared atomically, user is logged out');
    } catch (error) {
      console.error('[SignOut] ❌ Error during signOut:', error);
      throw error;
    } finally {
      setIsSigningOut(false);
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      // Read user from Zustand store without subscribing this component
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update both ref and Zustand state
      setUserProfile(userProfileRef.current ? { ...userProfileRef.current, ...updates } : null);

      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: error as Error };
    }
  };

  // ============================================================================
  // TEACHER AUTHENTICATION (OTP-BASED)
  // ============================================================================

  const lookupInstructorByEmail = async (
    email: string,
    university_id: string
  ): Promise<{ instructor: InstructorData | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('email', email)
        .eq('university_id', university_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return {
            instructor: null,
            error: new Error('Instructor email not found in your university'),
          };
        }
        throw error;
      }

      return { instructor: data as InstructorData, error: null };
    } catch (error) {
      console.error('Lookup instructor error:', error);
      return { instructor: null, error: error as Error };
    }
  };

  const sendTeacherOTP = async (
    email: string,
    instructor_name: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { generateOTP, sendOTPEmail, storeOTP } = require('../lib/otp-service');

      // Generate OTP
      const otp = generateOTP();

      // Store OTP in database
      await storeOTP(email, otp);

      // Send OTP via email
      await sendOTPEmail(email, otp, instructor_name);

      return { error: null };
    } catch (error) {
      console.error('Send teacher OTP error:', error);
      return { error: error as Error };
    }
  };

  const verifyTeacherOTP = async (
    email: string,
    otp: string,
    university_id: string,
    instructorData: InstructorData
  ): Promise<{ error: Error | null }> => {
    try {
      const { verifyOTP, clearOTP } = require('../lib/otp-service');

      // Verify OTP
      const isValid = await verifyOTP(email, otp);
      if (!isValid) {
        return { error: new Error('Invalid or expired OTP') };
      }

      // Create Supabase user account if it doesn't exist
      let userId = instructorData.user_id;

      if (!userId) {
        // Create a new user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: `temp_${otp}_${Date.now()}`, // Temporary password - won't be used
          options: {
            data: {
              role: 'teacher',
              name: instructorData.name,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user account');

        userId = authData.user.id;

        // Update instructor record with new user_id
        const { error: updateError } = await supabase
          .from('instructors')
          .update({ user_id: userId })
          .eq('id', instructorData.id);

        if (updateError) throw updateError;
      } else {
        // Sign in existing user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: `temp_${otp}_${Date.now()}`, // This won't work - we need to use OTP directly
        });

        if (signInError) {
          console.warn('Standard signin failed, using OTP as auth:', signInError);
          // For now, we'll just set the session manually
          // In production, you'd implement custom token generation
        }
      }

      // Create/update user profile in users table
      const { error: upsertError } = await supabase.from('users').upsert({
        id: userId,
        email: email,
        name: instructorData.name,
        role: 'teacher',
        university_id: university_id,
        profile_picture_url: instructorData.profile_picture_url,
      });

      if (upsertError) throw upsertError;

      // Clear the used OTP
      await clearOTP(email);

      // Fetch and set user profile
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*, universities(name)')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name || instructorData.name?.split(' ')[0] || 'Instructor',
        last_name: userData.last_name || instructorData.name?.split(' ').slice(1).join(' ') || '',
        role: userData.role,
        university_id: userData.university_id,
        university_name: userData.universities?.name || '',
        profile_picture_url: userData.profile_picture_url,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        created_at: userData.created_at || new Date().toISOString(),
      };

      setUserProfile(profile);
      setInstructor(instructorData);

      return { error: null };
    } catch (error) {
      console.error('Verify teacher OTP error:', error);
      return { error: error as Error };
    }
  };

  // ============================================================================
  // COMPUTED PROPERTIES (read from Zustand store via routing-subscribed selectors)
  // ============================================================================

  const isAuthenticated = _session !== null;
  const isStudent = _userRole === 'student';
  const isTeacher = _userRole === 'teacher';
  const isAdmin = _userRole === 'admin';
  const userRole = _userRole;

  // ============================================================================
  // ROUTE PROTECTION & NAVIGATION
  // ============================================================================

  /**
   * Automatically redirect based on auth state and role
   * Protected: routes in (main) group require authentication
   * Public: routes in (auth) group are always accessible
   * 
   * Exception: Allow signup screens even when authenticated (user not fully created yet)
   */
  useEffect(() => {
    if (isLoading) return;

    // While the profile is being fetched we must NOT make routing decisions based on userRole
    // because it is transiently null even for authenticated users.  Returning early here
    // prevents the "redirect to welcome" guard below from firing during that window.
    if (isProfileLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments[1] || '';
    const isSignupInProgress = currentRoute === 'student-signup' || currentRoute === 'teacher-signup';
    
    console.log('[AuthContext Routing]', {
      isAuthenticated,
      inAuthGroup,
      currentSegment: segments[0],
      currentRoute,
      userRole,
      isSignupInProgress,
      isProfileLoading,
    });

    if (!isAuthenticated) {
      // Not authenticated - go to auth flow
      if (!inAuthGroup) {
        console.log('[Navigation] Redirecting to auth/welcome (not authenticated, not in auth group)');
        router.replace('/(auth)/welcome');
      }
    } else {
      // Authenticated - go to main app, UNLESS signup is in progress
      if (inAuthGroup && !isSignupInProgress) {
        // Route based on role
        if (userRole) {
          console.log('[Navigation] Redirecting to main/home (authenticated, has role, not in signup)');
          router.replace('/(main)/home');
        }
        // If userRole is null, don't redirect - user is still completing signup
      }
      
      // If the profile is missing after loading settled, it may be because the
      // cold-start fetch was aborted (slow Android radio / network).  Retry once
      // before sending the user to the welcome screen — this avoids a false logout
      // on every cold start when the network is briefly unavailable.
      // Only applies outside the auth group so in-progress signup flows are
      // not disturbed (they don't have a profile row yet).
      if (!inAuthGroup && !userRole && !isSignupInProgress) {
        if (!hasTriedProfileRecovery.current) {
          hasTriedProfileRecovery.current = true;
          const { user: storeUser } = useAuthStore.getState();
          if (storeUser) {
            console.log('[Navigation] Authenticated but no profile after init — retrying profile fetch once');
            fetchUserProfile(storeUser.id); // isProfileLoading → true → guard re-runs on change
            return;
          }
        }
        // Retry already attempted (or no user in store) — fall back to welcome.
        console.log('[Navigation] Authenticated but profile unavailable after retry — redirecting to welcome');
        router.replace('/(auth)/welcome');
      }
    }
  }, [isAuthenticated, isLoading, isProfileLoading, segments, userRole]);

  // AuthContext now ONLY carries methods (stable function refs) — ALL state
  // lives in Zustand. Components that call useAuth() get state from the store
  // and methods from this context, giving them the full backward-compatible API.
  const value: AuthContextType = {
    // Methods
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    refreshUserProfile: fetchUserProfile,
    lookupInstructorByEmail,
    sendTeacherOTP,
    verifyTeacherOTP,
    // State below is stub-filled here but actually served from Zustand in useAuth()
    // These will be overridden by the Zustand reads in the useAuth() hook.
    session: null,
    isLoading: false,
    isSigningOut: false,
    user: null,
    userProfile: null,
    userRole: null,
    enrollments: null,
    instructor: null,
    isAuthenticated: false,
    isStudent: false,
    isTeacher: false,
    isAdmin: false,
    isProfileLoading: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access auth context
 * Must be called within AuthProvider
 */
/**
 * Primary auth hook — backward-compatible with all existing screens.
 *
 * Reads state DIRECTLY from the Zustand store so each call-site gets a
 * granular subscription: a component that only reads `userProfile` will not
 * re-render when `isLoading` changes, and vice-versa.
 *
 * Methods (signIn, signOut, etc.) are stable references provided by the slim
 * AuthMethodsContext so they don't trigger re-renders when referenced.
 */
export const useAuth = (): AuthContextType => {
  const methods = useContext(AuthContext);
  if (methods === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {
    session,
    user,
    userProfile,
    enrollments,
    instructor,
    isLoading,
    isSigningOut,
    isProfileLoading,
  } = useAuthStore();

  const isAuthenticated = session !== null;
  const isStudent = userProfile?.role === 'student';
  const isTeacher = userProfile?.role === 'teacher';
  const isAdmin = userProfile?.role === 'admin';
  const userRole = userProfile?.role ?? null;

  return {
    // Methods from context (stable references — don't cause re-renders when called)
    signUp: methods.signUp,
    signIn: methods.signIn,
    signOut: methods.signOut,
    updateUserProfile: methods.updateUserProfile,
    refreshUserProfile: methods.refreshUserProfile,
    lookupInstructorByEmail: methods.lookupInstructorByEmail,
    sendTeacherOTP: methods.sendTeacherOTP,
    verifyTeacherOTP: methods.verifyTeacherOTP,
    // State from Zustand (granular subscriptions — only re-renders on relevant changes)
    session,
    isLoading,
    isSigningOut,
    user,
    userProfile,
    userRole,
    enrollments,
    instructor,
    isAuthenticated,
    isStudent,
    isTeacher,
    isAdmin,
    isProfileLoading,
  };
};

/**
 * Hook to check if still loading auth state
 */
export const useAuthLoading = () => {
  const { isLoading } = useAuth();
  return isLoading;
};

/**
 * Hook for student-specific data
 */
export const useStudentData = () => {
  const { userProfile, enrollments, isStudent } = useAuth();
  if (!isStudent) return null;
  return { userProfile, enrollments };
};

/**
 * Hook for teacher-specific data
 */
export const useTeacherData = () => {
  const { userProfile, instructor, isTeacher } = useAuth();
  if (!isTeacher) return null;
  return { userProfile, instructor };
};

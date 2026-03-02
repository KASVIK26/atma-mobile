import supabase from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
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
}

// ============================================================================
// CONTEXT & PROVIDER
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const segments = useSegments();

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // User profile state
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  // Keep a ref in sync so callbacks (AppState, onAuthStateChange) always see the latest
  // value without needing to re-subscribe / close over stale state.
  const userProfileRef = useRef<UserProfile | null>(null);
  const setUserProfile = (profile: UserProfile | null) => {
    userProfileRef.current = profile;
    setUserProfileState(profile);
  };
  const [enrollments, setEnrollments] = useState<StudentEnrollment[] | null>(null);
  const [instructor, setInstructor] = useState<InstructorData | null>(null);

  // Guard against concurrent fetchUserProfile calls (e.g. INITIAL_SESSION + TOKEN_REFRESHED
  // firing in quick succession on cold start).
  const isFetchingProfileRef = useRef(false);

  // ============================================================================
  // SETUP & SESSION RECOVERY
  // ============================================================================

  /**
   * Fetch user profile from users table
   */
  const fetchUserProfile = async (userId: string) => {
    // Prevent concurrent fetches — skip if one is already in flight.
    if (isFetchingProfileRef.current) {
      console.log('[fetchUserProfile] Skipping — fetch already in progress');
      return;
    }
    isFetchingProfileRef.current = true;
    try {
      console.log('[fetchUserProfile] Starting profile fetch for user:', userId.substring(0, 8) + '***');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);

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
      console.error('[fetchUserProfile] ❌ Exception during profile fetch:', error);
      // Don't wipe an already-loaded profile on transient fetch errors (e.g. network
      // blip when app resumes after hours in background).  Only null-out when there
      // was genuinely no profile to begin with (e.g. first load or sign-in failure).
      if (!userProfileRef.current) {
        setUserProfile(null);
      } else {
        console.warn('[fetchUserProfile] Keeping existing profile despite fetch error');
      }
    } finally {
      isFetchingProfileRef.current = false;
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
    const initTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Init timeout — forcing isLoading = false');
        setIsLoading(false);
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
        setSession(newSession);
        setUser(newSession.user);
        await fetchUserProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Explicit logout or account deletion — clear everything.
        console.log('[Auth State Change]', event, '— clearing all local state');
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setEnrollments(null);
        setInstructor(null);
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
  useEffect(() => {
    let lastState = AppState.currentState;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const comingToForeground = lastState !== 'active' && nextState === 'active';
      lastState = nextState;

      if (!comingToForeground) return;

      console.log('[AuthContext] App returned to foreground — refreshing session');
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('[AuthContext] getSession error on resume:', error.message);
          return;
        }

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Re-fetch profile only if it's gone (avoids unnecessary network calls)
          if (!userProfileRef.current) {
            console.log('[AuthContext] Profile missing after resume — re-fetching');
            await fetchUserProfile(currentSession.user.id);
          }
        } else {
          // Session genuinely expired / logged out while backgrounded
          if (userProfileRef.current) {
            console.log('[AuthContext] Session expired in background — clearing state');
            setSession(null);
            setUser(null);
            setUserProfile(null);
            setEnrollments(null);
            setInstructor(null);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error during foreground session refresh:', err);
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
      
      // Clear state
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setEnrollments(null);
      setInstructor(null);
      
      console.log('[SignOut] ✅ All state cleared, user should be logged out');
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
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
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
        name: userData.name,
        role: userData.role,
        university_id: userData.university_id,
        university_name: userData.universities?.name || '',
        profile_picture_url: userData.profile_picture_url,
      };

      setUserProfile(profile);
      setInstructorData(instructorData);

      return { error: null };
    } catch (error) {
      console.error('Verify teacher OTP error:', error);
      return { error: error as Error };
    }
  };

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  const isAuthenticated = session !== null;
  const isStudent = userProfile?.role === 'student';
  const isTeacher = userProfile?.role === 'teacher';
  const isAdmin = userProfile?.role === 'admin';
  const userRole = userProfile?.role ?? null;

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
      
      // If already in main app but profile didn't load, redirect back to login so
      // the user can re-authenticate rather than seeing blank/default placeholders.
      if (!inAuthGroup && !userRole && !isSignupInProgress) {
        console.log('[Navigation] Authenticated but profile unavailable — redirecting to welcome');
        router.replace('/(auth)/welcome');
      }
    }
  }, [isAuthenticated, isLoading, segments, userRole]);

  const value: AuthContextType = {
    session,
    isLoading,
    isSigningOut,
    user,
    userProfile,
    userRole,
    enrollments,
    instructor,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    refreshUserProfile: fetchUserProfile,
    lookupInstructorByEmail,
    sendTeacherOTP,
    verifyTeacherOTP,
    isAuthenticated,
    isStudent,
    isTeacher,
    isAdmin,
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
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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

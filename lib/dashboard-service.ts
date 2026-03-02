import { LectureSessionExtended } from '@/lib/schedule-service';
import supabase from '@/lib/supabase';

/**
 * Dashboard session data with TOTP info
 */
export interface DashboardSession extends Partial<LectureSessionExtended> {
  id: string;
  instructor_ids?: string[];
  instructor_names?: string[];
  course?: {
    id: string;
    code: string;
    name: string;
  };
  room?: {
    id: string;
    room_number: string;
    room_name: string;
    building?: {
      id: string;
      name?: string;
    };
  };
  start_time: string;
  end_time: string;
  session_date: string;
  totp_code?: string;
  totp_expires_at?: string;
  totp_code_shared?: boolean; // Instructor has enabled code sharing for this session
  attendance_marking_enabled?: boolean; // Students can mark attendance
  teacher_baseline_pressure_hpa?: number | null; // Teacher's live barometer at session start
}

export interface DashboardStats {
  totalClasses: number;
  attendanceStreak: number;
  weeklyAttendancePercentage: number;
  upcomingSessions: DashboardSession[];
}

/**
 * Get today's sessions for a user (student or teacher) with TOTP codes (HIDDEN from students)
 * @param userId - User ID (student or teacher)
 * @param universityId - University ID
 * @param userRole - User role ('student', 'teacher', 'admin')
 * @returns Dashboard stats and upcoming sessions WITHOUT TOTP codes visible to students
 */
export async function getTodaysDashboardData(
  userId: string,
  universityId: string,
  userRole: 'student' | 'teacher' | 'admin' = 'student'
): Promise<DashboardStats | null> {
  try {
    // Get today's date in YYYY-MM-DD format (IST-safe — no UTC split)
    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

    console.log('[Dashboard Service] 📊 Fetching today\'s sessions for:', today, 'Role:', userRole);

    let sectionIds: string[] = [];

    // Step 1: Get sections based on role
    if (userRole === 'teacher') {
      // For teachers, we'll filter by instructor_ids during the query
      console.log('[Dashboard Service] Fetching teacher sessions for instructor:', userId);
    } else {
      // For students, get enrollments
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('section_id')
        .eq('user_id', userId)
        .eq('university_id', universityId)
        .eq('is_active', true);

      if (enrollmentError) throw enrollmentError;

      if (!enrollments || enrollments.length === 0) {
        console.warn('[Dashboard Service] No active enrollments found');
        return {
          totalClasses: 0,
          attendanceStreak: 0,
          weeklyAttendancePercentage: 0,
          upcomingSessions: [],
        };
      }

      sectionIds = enrollments.map((e) => e.section_id);
      console.log('[Dashboard Service] Found sections:', sectionIds.length);
    }

    // Step 2: Get today's lecture sessions
    let sessionsQuery = supabase
      .from('lecture_sessions')
      .select(
        `
        id,
        university_id,
        course_id,
        section_id,
        room_id,
        instructor_ids,
        session_date,
        start_time,
        end_time,
        scheduled_start_time,
        scheduled_end_time,
        session_status,
        is_active,
        is_cancelled,
        courses(id, code, name),
        rooms(id, room_number, room_name, building:buildings(id, name))
      `
      )
      .eq('university_id', universityId)
      .eq('session_date', today)
      .eq('is_active', true)
      .eq('is_cancelled', false);

    // Filter by section for students, or by instructor for teachers
    if (userRole === 'teacher') {
      // Get all sessions for today, we'll filter by instructor_ids in post-processing
      // This is necessary because Supabase doesn't support array contains queries easily
    } else {
      sessionsQuery = sessionsQuery.in('section_id', sectionIds);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery.order('start_time', { ascending: true });

    if (sessionsError) throw sessionsError;

    console.log('[Dashboard Service] Found sessions for today:', sessions?.length || 0);

    // Filter for teachers: only sessions where user is an instructor
    let filteredSessions = sessions || [];
    if (userRole === 'teacher') {
      filteredSessions = sessions?.filter((session: any) => {
        return session.instructor_ids && Array.isArray(session.instructor_ids) && session.instructor_ids.includes(userId);
      }) || [];
      console.log('[Dashboard Service] Teacher\'s sessions after filtering:', filteredSessions.length);
    }

    if (filteredSessions.length === 0) {
      return {
        totalClasses: 0,
        attendanceStreak: 0,
        weeklyAttendancePercentage: 0,
        upcomingSessions: [],
      };
    }

    const sessionIds = filteredSessions.map((s: any) => s.id);

    // Step 3: Get TOTP sessions for today's lectures
    const { data: totpSessions, error: totpError } = await supabase
      .from('totp_sessions')
      .select('id, lecture_session_id, code, expires_at, code_shared, attendance_marking_enabled, teacher_baseline_pressure_hpa')
      .in('lecture_session_id', sessionIds)
      .eq('university_id', universityId);

    if (totpError) throw totpError;

    console.log('[Dashboard Service] Found TOTP sessions:', totpSessions?.length || 0);

    // Create a map of TOTP sessions by lecture_session_id
    const totpMap = new Map();
    totpSessions?.forEach((totp: any) => {
      totpMap.set(totp.lecture_session_id, {
        code: totp.code,
        expires_at: totp.expires_at,
        code_shared: totp.code_shared || false,
        attendance_marking_enabled: totp.attendance_marking_enabled || false,
        teacher_baseline_pressure_hpa: totp.teacher_baseline_pressure_hpa ?? null,
      });
    });

    // Step 4: Get instructor names
    const allInstructorIds = new Set<string>();
    filteredSessions?.forEach((session: any) => {
      if (session.instructor_ids && Array.isArray(session.instructor_ids)) {
        session.instructor_ids.forEach((id: string) => allInstructorIds.add(id));
      }
    });

    const instructorIds = Array.from(allInstructorIds);
    let instructorMap = new Map();

    if (instructorIds.length > 0) {
      const { data: instructors, error: instructorError } = await supabase
        .from('instructors')
        .select('id, name')
        .in('id', instructorIds);

      if (!instructorError && instructors) {
        instructors.forEach((instructor: any) => {
          instructorMap.set(instructor.id, instructor.name);
        });
      }
    }

    // Step 5: Merge sessions with TOTP and instructor data
    // CRITICAL: NEVER show TOTP code to students - determine visibility once
    const shouldShowTotp = userRole === 'teacher' || userRole === 'admin';

    const upcomingSessions: DashboardSession[] = filteredSessions.map((session: any) => {
      const totp = totpMap.get(session.id);
      const instructorNames = (session.instructor_ids || []).map((id: string) => instructorMap.get(id) || 'Unknown');

      return {
        id: session.id,
        course: session.courses,
        room: session.rooms,
        instructor_ids: session.instructor_ids,
        instructor_names: instructorNames,
        start_time: session.start_time,
        end_time: session.end_time,
        session_date: session.session_date,
        totp_code: shouldShowTotp ? totp?.code : undefined, // ✅ HIDDEN from students
        totp_expires_at: totp?.expires_at,
        totp_code_shared: totp?.code_shared || false,
        attendance_marking_enabled: totp?.attendance_marking_enabled || false,
        teacher_baseline_pressure_hpa: totp?.teacher_baseline_pressure_hpa ?? null,
        session_status: session.session_status,
      };
    });

    // Calculate completed sessions count (sessions that have already ended)
    const now = new Date();
    const completedCount = upcomingSessions.filter((session) => {
      const [endHours, endMinutes] = session.end_time.split(':');
      const sessionEndTime = new Date(`${today}T${endHours}:${endMinutes}:00`);
      return sessionEndTime < now;
    }).length;

    // For students: attendance streak = sessions where student is marked 'present' today
    let attendanceStreak = completedCount; // default (teachers/admin: completed sessions)
    if (userRole === 'student' && sessionIds.length > 0) {
      const { data: presentRecords } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', userId)
        .in('lecture_session_id', sessionIds)
        .eq('status', 'present');
      attendanceStreak = presentRecords?.length ?? 0;
      console.log('[Dashboard Service] Student present count today:', attendanceStreak);
    }

    console.log('[Dashboard Service] ✓ Prepared dashboard data with', upcomingSessions.length, 'sessions,', completedCount, 'completed');
    console.log('[Dashboard Service] TOTP visibility:', shouldShowTotp ? 'VISIBLE (teacher/admin)' : 'HIDDEN (student)');

    return {
      totalClasses: filteredSessions.length,
      attendanceStreak,
      weeklyAttendancePercentage: 0, // Set to 0% as per requirement
      upcomingSessions,
    };
  } catch (error) {
    console.error('[Dashboard Service] Error fetching dashboard data:', error);
    return null;
  }
}

/**
 * Format time from HH:mm:ss to HH:mm AM/PM
 */
export function formatTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  } catch {
    return timeString;
  }
}

/**
 * Check if a time has passed (for a given session date)
 */
export function hasTimePassed(sessionDate: string, timeString: string): boolean {
  try {
    const [hours, minutes] = timeString.split(':');
    const sessionDateTime = new Date(`${sessionDate}T${hours}:${minutes}:00`);
    return sessionDateTime < new Date();
  } catch {
    return false;
  }
}

/**
 * Get all today's sessions with time-based status
 */
export interface ClassWithStatus extends DashboardSession {
  status: 'ongoing' | 'upcoming' | 'on-time' | 'completed' | 'cancelled';
}

export async function getTodaysClassesWithStatus(
  studentId: string,
  universityId: string,
  userRole: 'student' | 'teacher' | 'admin' = 'student'
): Promise<ClassWithStatus[]> {
  try {
    const dashboardData = await getTodaysDashboardData(
      studentId,
      universityId,
      userRole
    );
    
    if (!dashboardData || !dashboardData.upcomingSessions) {
      return [];
    }

    const now = new Date();
    const _n = now;
    const today = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, '0')}-${String(_n.getDate()).padStart(2, '0')}`;

    return dashboardData.upcomingSessions.map((session) => {
      const [sessionHours, sessionMinutes] = session.start_time.split(':');
      const [endHours, endMinutes] = session.end_time.split(':');
      const sessionStartTime = new Date(`${today}T${sessionHours}:${sessionMinutes}:00`);
      const sessionEndTime = new Date(`${today}T${endHours}:${endMinutes}:00`);

      let status: 'ongoing' | 'upcoming' | 'on-time' | 'completed' | 'cancelled' = 'upcoming';

      if (now >= sessionStartTime && now < sessionEndTime) {
        // Class is currently ongoing
        status = 'ongoing';
      } else if (now >= sessionEndTime) {
        // Class has finished
        status = 'completed';
      } else if (now < sessionStartTime && now.getTime() > sessionStartTime.getTime() - 15 * 60 * 1000) {
        // 15 minutes before session
        status = 'on-time';
      } else {
        status = 'upcoming';
      }

      return {
        ...session,
        status,
      } as ClassWithStatus;
    });
  } catch (error) {
    console.error('[Dashboard Service] Error fetching classes with status:', error);
    return [];
  }
}

/**
 * SECURITY: Mark attendance for a student in a lecture session
 * 
 * Security considerations:
 * - Students can only mark attendance if attendance_marking_enabled is true (instructor activated it)
 * - Students can only mark attendance for sessions they are enrolled in
 * - Session must be active and within attendance window
 * - Database RLS policies must enforce:
 *   1. Only enrolled students can insert attendance records
 *   2. Student ID matches authenticated user
 *   3. Lecture session exists and is active
 *   4. Attendance window is still open
 * 
 * @param studentId - Student user ID
 * @param lectureSessionId - Lecture session ID
 * @param totpCode - TOTP code provided by student (optional validation)
 * @returns Success or error
 */
/**
 * Mark attendance for a student with multi-layer validation support
 * Calls PostgreSQL function: mark_attendance_via_totp()
 * 
 * @param studentId - Student user ID
 * @param lectureSessionId - Lecture session ID
 * @param universityId - University ID (required for attendance_records)
 * @param totpCode - TOTP code entered by student (optional)
 * @param gpsLatitude - GPS latitude from device (optional)
 * @param gpsLongitude - GPS longitude from device (optional)
 * @param pressureValue - Barometer pressure from device (optional)
 * @returns Success status with message
 */
export async function markAttendance(
  studentId: string,
  lectureSessionId: string,
  universityId: string,
  totpCode?: string,
  gpsLatitude?: number,
  gpsLongitude?: number,
  pressureValue?: number
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Dashboard Service] Attempting to mark attendance for session:', lectureSessionId.substring(0, 8) + '...');
    console.log('[Dashboard Service] Student:', studentId.substring(0, 8) + '... University:', universityId.substring(0, 8) + '...');

    // Call PostgreSQL function: mark_attendance_via_totp()
    // This function enforces all business logic and is RLS-protected
    const { data, error } = await supabase.rpc('mark_attendance_via_totp', {
      p_student_id: studentId,
      p_lecture_session_id: lectureSessionId,
      p_university_id: universityId,
      p_totp_code: totpCode || null,
      p_gps_latitude: gpsLatitude || null,
      p_gps_longitude: gpsLongitude || null,
      p_pressure_value: pressureValue || null,
    });

    if (error) {
      console.error('[Dashboard Service] Error calling mark_attendance_via_totp:', error);
      
      // Specific error handling for known error messages
      if (error.message?.includes('Not enrolled')) {
        return { success: false, message: 'You are not enrolled in this class' };
      }
      if (error.message?.includes('already marked')) {
        return { success: false, message: 'You have already marked attendance for this session' };
      }
      if (error.message?.includes('not enabled')) {
        return { success: false, message: 'Attendance marking is not enabled or window has closed' };
      }
      
      return { success: false, message: error.message || 'Failed to mark attendance. Try again.' };
    }

    if (!data || data.length === 0) {
      console.error('[Dashboard Service] No response from mark_attendance_via_totp');
      return { success: false, message: 'No response from server. Try again.' };
    }

    const result = data[0]; // RPC returns array
    
    if (result.success) {
      console.log('[Dashboard Service] ✓ Attendance marked successfully. Record ID:', result.attendance_id?.substring(0, 8) + '...');
      
      // Log confidence scoring validation
      console.log('[Dashboard Service] Multi-layer validation:');
      if (totpCode) console.log('  ✓ TOTP code validated');
      if (gpsLatitude && gpsLongitude) console.log('  ✓ GPS geofencing data provided');
      if (pressureValue) console.log('  ✓ Barometer pressure data provided');
      
      return { success: true, message: result.message || 'Attendance marked successfully' };
    } else {
      console.warn('[Dashboard Service] Attendance marking failed:', result.message);
      return { success: false, message: result.message || 'Failed to mark attendance' };
    }
  } catch (error) {
    console.error('[Dashboard Service] Exception in markAttendance:', error);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

/**
 * Check if student has already marked attendance for a session
 */
export async function hasMarkedAttendance(
  studentId: string,
  lectureSessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('lecture_session_id', lectureSessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected)
      console.error('[Dashboard Service] Error checking attendance:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[Dashboard Service] Exception in hasMarkedAttendance:', error);
    return false;
  }
}

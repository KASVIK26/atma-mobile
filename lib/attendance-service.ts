/**
 * Attendance Marking Service
 * 
 * Handles the complete attendance verification and marking process:
 * 1. Location verification (GPS + geofence)
 * 2. Pressure/Floor verification (barometric)
 * 3. TOTP code verification
 * 4. Multi-layer validation scoring
 * 5. Submission to attendance_records table
 */

import { calculateFloorHeightFromPressure, estimateFloorNumber } from '@/lib/barometer-service';
import { LocationCoordinates, RoomGeometry, isInsideRoom } from '@/lib/geolocation-service';
import supabase from '@/lib/supabase';

/**
 * Attendance verification result with multi-layer scoring
 */
export interface AttendanceVerificationResult {
  // Location verification (GPS + geofence)
  gps_latitude: number;
  gps_longitude: number;
  distance_to_center: number;
  geofence_valid: boolean;
  geofence_distance_threshold: number; // 12m or polygon boundary
  gps_accuracy: number;
  
  // Barometer verification (pressure-based floor detection)
  pressure_value: number | null;
  barometer_valid: boolean | null;
  estimated_floor: number | null;
  baseline_pressure: number | null;
  
  // TOTP verification
  totp_valid: boolean;
  totp_code: string; // The code student entered
  totp_code_from_db: string; // For verification
  
  // Combined validation score
  validation_score: number; // 0-100
  confidence_level: number; // 0-1 (ML confidence)
  is_proxy_suspected: boolean;
  
  // Metadata
  marking_method: 'student_app';
  timestamp: string;
}

/**
 * Mark attendance with complete verification
 * 
 * Performs:
 * 1. GPS location verification (12m from center)
 * 2. Barometer floor verification (if available)
 * 3. TOTP code verification
 * 4. Calculates multi-layer validation score
 * 5. Submits to attendance_records with all verification data
 */
export async function markAttendance(
  lectureSessionId: string,
  studentId: string,
  universityId: string,
  studentLocation: LocationCoordinates,
  roomGeometry: RoomGeometry | null,
  baselinePressure: number | null,
  currentPressure: number | null,
  studentTotpCode: string
): Promise<{
  success: boolean;
  message: string;
  verificationResult?: AttendanceVerificationResult;
  attendanceId?: string;
  error?: string;
}> {
  try {
    console.log('[AttendanceService] Starting attendance marking for session:', lectureSessionId);

    // ========================================
    // STEP 1: GPS Location Verification
    // ========================================
    let gpsVerified = false;
    let distanceToCenter = 0;

    if (roomGeometry) {
      const result = isInsideRoom(studentLocation, roomGeometry);
      distanceToCenter = result.distance || 0;
      
      // NEW RULE: 12m distance to center (not polygon boundary)
      gpsVerified = distanceToCenter <= 12;
      
      console.log('[AttendanceService] GPS Verification:', {
        location: `${studentLocation.latitude.toFixed(6)}, ${studentLocation.longitude.toFixed(6)}`,
        distanceToCenter: distanceToCenter.toFixed(2),
        verified: gpsVerified,
        accuracy: studentLocation.accuracy,
      });
    }

    // ========================================
    // STEP 2: Barometer Floor Verification
    // ========================================
    let barometerVerified = false;
    let estimatedFloor: number | null = null;

    if (currentPressure && baselinePressure) {
      estimatedFloor = estimateFloorNumber(baselinePressure, currentPressure);
      // Accept if within 0.5 floors (allowing for measurement variance)
      const heightDiff = calculateFloorHeightFromPressure(baselinePressure, currentPressure);
      // ±2.8 m tolerance (≈ ±0.31 hPa at 956 hPa).
      // Accounts for: Open-Meteo model bias (~±0.3 hPa) + inter-device sensor
      // calibration spread (~±0.3 hPa). Floor separation at Indore ≈ 0.39 hPa
      // (3.1 m), so this window is still < half a floor and won't cross-accept
      // adjacent floors when the student is clearly on the wrong floor.
      barometerVerified = Math.abs(heightDiff) <= 2.8;
      
      console.log('[AttendanceService] Barometer Verification:', {
        currentPressure: currentPressure.toFixed(2),
        baselinePressure: baselinePressure.toFixed(2),
        estimatedFloor,
        heightDiff: heightDiff.toFixed(2),
        verified: barometerVerified,
      });
    }

    // ========================================
    // STEP 3: TOTP Code Verification
    // ========================================
    // Filter by lecture_session_id only (unique index guarantees one row).
    // NOTE: RLS may block student reads on totp_sessions. If so, totpVerified = false
    // but we continue — the attendance record still stores the student's entered code
    // and the score will reflect the unverified state.
    // Fix: run the SQL policy in Supabase:
    //   CREATE POLICY "students_read_totp_enrolled" ON totp_sessions FOR SELECT TO authenticated
    //   USING (lecture_session_id IN (SELECT ls.id FROM lecture_sessions ls
    //     JOIN enrollments e ON e.section_id = ls.section_id WHERE e.student_id = auth.uid()));
    let totpVerified = false;
    let totpFromDb = '';
    let totpExpired = false;

    const { data: totpData, error: totpError } = await supabase
      .from('totp_sessions')
      .select('code, updated_at')
      .eq('lecture_session_id', lectureSessionId)
      .maybeSingle();

    if (totpError) {
      console.warn('[AttendanceService] TOTP fetch error (RLS or DB issue) — continuing without server verification:', totpError);
    } else if (!totpData) {
      console.warn('[AttendanceService] TOTP row not visible (RLS blocked or no session) for:', lectureSessionId, '— continuing without server verification');
    } else {
      totpFromDb = totpData.code || '';
      // Expiry = updated_at + 60s (cron cycle). expires_at is unreliable (trigger bug).
      const totpExpiry = totpData.updated_at
        ? new Date(new Date(totpData.updated_at).getTime() + 60_000)
        : null;
      totpExpired = totpExpiry ? totpExpiry < new Date() : false;
      totpVerified = !totpExpired && studentTotpCode === totpFromDb;
    }

    console.log('[AttendanceService] TOTP Verification:', {
      studentCode: studentTotpCode,
      dbCode: totpFromDb || '(not readable)',
      expired: totpExpired,
      verified: totpVerified,
    });

    // ========================================
    // STEP 4: Calculate Multi-Layer Validation Score
    // ========================================
    
    let validationScore = 0;
    let proxyDetected = false;

    // GPS component (40% of score)
    if (gpsVerified) {
      validationScore += 40;
    } else if (distanceToCenter <= 20) {
      validationScore += 20; // Partial credit if close
    }

    // Barometer component (30% of score)
    if (barometerVerified) {
      validationScore += 30;
    } else if (currentPressure) {
      validationScore += 10; // Partial credit if available but not matching
    }

    // TOTP component (30% of score)
    if (totpVerified) {
      validationScore += 30;
    }

    // Proxy detection heuristics
    // Flag if:
    // - GPS verified but TOTP missing
    // - Distance > 50m AND no barometer match
    // - Multiple verification failures
    const failureCount = [!gpsVerified, !(barometerVerified || currentPressure), !totpVerified].filter(Boolean).length;
    proxyDetected = failureCount >= 2 || (distanceToCenter > 50 && !barometerVerified);

    console.log('[AttendanceService] Validation Score:', {
      validationScore,
      gpsScore: gpsVerified ? 40 : 0,
      barometerScore: barometerVerified ? 30 : 0,
      totpScore: totpVerified ? 30 : 0,
      proxyDetected,
    });

    // ========================================
    // STEP 5: Determine Attendance Status
    // ========================================
    let attendanceStatus: 'present' | 'absent' | 'late' = 'absent';
    
    // All three verifications must pass
    if (gpsVerified && totpVerified) {
      attendanceStatus = 'present'; // GPS + TOTP minimum
      // Barometer is bonus validation but not required since Expo doesn't support it well
    }

    console.log('[AttendanceService] Attendance Status:', attendanceStatus);

    // ========================================
    // STEP 6: Submit to attendance_records table
    // ========================================
    const { data: attendanceRecord, error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        university_id: universityId,
        lecture_session_id: lectureSessionId,
        student_id: studentId,
        attendance_status: attendanceStatus,
        marked_at: new Date().toISOString(),
        marking_method: 'student_app',
        
        // Location data
        gps_latitude: studentLocation.latitude,
        gps_longitude: studentLocation.longitude,
        pressure_value: currentPressure,
        
        // Validation scores
        validation_score: validationScore,
        geofence_valid: gpsVerified,
        barometer_valid: barometerVerified,
        totp_valid: totpVerified,
        ble_valid: null, // Not implemented yet
        
        // Proxy detection
        is_proxy_suspected: proxyDetected,
        confidence_level: validationScore / 100, // 0-1 scale
      })
      .select()
      .single();

    if (insertError) {
      console.error('[AttendanceService] Insert error:', insertError);
      return {
        success: false,
        message: 'Failed to save attendance record',
        error: 'INSERT_FAILED',
      };
    }

    console.log('[AttendanceService] ✅ Attendance marked successfully');

    const result: AttendanceVerificationResult = {
      gps_latitude: studentLocation.latitude,
      gps_longitude: studentLocation.longitude,
      distance_to_center: distanceToCenter,
      geofence_valid: gpsVerified,
      geofence_distance_threshold: 12,
      gps_accuracy: studentLocation.accuracy,
      
      pressure_value: currentPressure,
      barometer_valid: barometerVerified,
      estimated_floor: estimatedFloor,
      baseline_pressure: baselinePressure,
      
      totp_valid: totpVerified,
      totp_code: studentTotpCode,
      totp_code_from_db: totpFromDb,
      
      validation_score: validationScore,
      confidence_level: validationScore / 100,
      is_proxy_suspected: proxyDetected,
      
      marking_method: 'student_app',
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      message: `Attendance marked as ${attendanceStatus}`,
      verificationResult: result,
      attendanceId: attendanceRecord?.id,
    };

  } catch (error) {
    console.error('[AttendanceService] Unexpected error:', error);
    return {
      success: false,
      message: 'Unexpected error marking attendance',
      error: String(error),
    };
  }
}

/**
 * Check if attendance can be marked for a lecture session
 * Returns: can mark, session details, TOTP existence (for teacher view only)
 */
export async function canMarkAttendance(
  lectureSessionId: string,
  universityId: string,
  userRole: 'student' | 'teacher' | 'admin'
): Promise<{
  canMark: boolean;
  reason: string;
  sessionDetails?: {
    course_code: string;
    room_name: string;
    start_time: string;
    end_time: string;
  };
  totpExists?: boolean; // Only populated for teachers
  totpCode?: string; // Only populated for teachers
}> {
  try {
    const { data: session, error } = await supabase
      .from('lecture_sessions')
      .select(`
        id,
        session_status,
        attendance_open,
        is_cancelled,
        start_time,
        end_time,
        courses(code),
        rooms(room_name),
        totp_sessions(code, expires_at)
      `)
      .eq('id', lectureSessionId)
      .eq('university_id', universityId)
      .single();

    if (error) {
      return {
        canMark: false,
        reason: 'Session not found',
      };
    }

    if (session.is_cancelled) {
      return {
        canMark: false,
        reason: 'Session is cancelled',
      };
    }

    if (!session.attendance_open) {
      return {
        canMark: false,
        reason: 'Attendance marking is not open for this session',
      };
    }

    const result: any = {
      canMark: true,
      reason: 'Ready to mark attendance',
      sessionDetails: {
        course_code: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.code || '',
        room_name: ((s => Array.isArray(s)?s[0]:s)((session as any).rooms))?.room_name || '',
        start_time: session.start_time,
        end_time: session.end_time,
      },
    };

    // Only show TOTP info to teachers
    if (userRole === 'teacher' || userRole === 'admin') {
      result.totpExists = session.totp_sessions && session.totp_sessions.length > 0;
      if (session.totp_sessions?.[0]) {
        result.totpCode = session.totp_sessions[0].code;
      }
    }

    return result;

  } catch (error) {
    console.error('[AttendanceService] Error checking attendance:', error);
    return {
      canMark: false,
      reason: 'Error checking attendance status',
    };
  }
}

/**
 * Teacher's course attendance data
 */
export interface TeacherCourseAttendance {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name: string;
  building_name?: string;
  enrolled_count: number; // from student_enrollments
  attendance_count: number; // attendance records marked
  status: 'ongoing' | 'upcoming' | 'completed';
  attendance_percentage: number;
  totp_code?: string;        // TOTP code from database
  totp_expires_at?: string;   // TOTP expiry timestamp
  totp_updated_at?: string;   // when current code was last rotated (used to detect new codes)
}

/**
 * Get instructor's active/upcoming session for today
 * Returns ongoing session if exists, else returns next upcoming session
 */
export async function getInstructorActiveSession(
  instructorId: string,
  universityId: string
): Promise<TeacherCourseAttendance | null> {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; // local IST date, not UTC

    console.log('[AttendanceService] Fetching active session for instructor:', instructorId);

    // Get all sessions for today
    const { data: sessions, error } = await supabase
      .from('lecture_sessions')
      .select(`
        id,
        course_id,
        section_id,
        session_date,
        start_time,
        end_time,
        is_active,
        is_cancelled,
        instructor_ids,
        room_id,
        courses(code, name),
        rooms(room_name, room_number, buildings(name)),
        totp_sessions(code, expires_at, updated_at)
      `)
      .eq('university_id', universityId)
      .eq('session_date', today)
      .eq('is_active', true)
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true });

    if (error) throw error;

    console.log('[AttendanceService] Query returned sessions:', sessions?.length);
    if (sessions?.[0]) {
      const s = sessions[0] as any;
      console.log('[AttendanceService] First session courses:', s.courses, 'rooms:', s.rooms);
    }

    if (!sessions || sessions.length === 0) {
      console.log('[AttendanceService] No sessions found for today');
      return null;
    }

    // Filter for sessions where instructor is in instructor_ids
    const instructorSessions = sessions.filter((session: any) => {
      return session.instructor_ids && Array.isArray(session.instructor_ids) && session.instructor_ids.includes(instructorId);
    });

    if (instructorSessions.length === 0) {
      console.log('[AttendanceService] No sessions found for this instructor');
      return null;
    }

    // Find ongoing or next upcoming
    for (const session of instructorSessions) {
      const [startHours, startMinutes] = session.start_time.split(':');
      const [endHours, endMinutes] = session.end_time.split(':');
      const sessionStart = new Date(`${today}T${startHours}:${startMinutes}:00`);
      const sessionEnd = new Date(`${today}T${endHours}:${endMinutes}:00`);

      // Check if ongoing or upcoming
      if (sessionEnd > now) {
        // This session is either ongoing or upcoming
        const status = now >= sessionStart ? 'ongoing' : 'upcoming';

        // Get enrollment count
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('id')
          .eq('section_id', session.section_id)
          .eq('is_active', true);

        const enrolledCount = enrollments?.length || 0;

        // Get attendance records count for this session
        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('lecture_session_id', session.id);

        const attendanceCount = attendanceRecords?.length || 0;

        const attendancePercentage = enrolledCount > 0 ? Math.round((attendanceCount / enrolledCount) * 100) : 0;

        // buildings are embedded via: rooms(room_name, room_number, buildings(name))
        const _gF = (v: any) => Array.isArray(v) ? v?.[0] : v;
        const _room = _gF((session as any).rooms);
        const buildingName: string | undefined = _gF(_room?.buildings)?.name;

        return {
          id: session.id,
          course_id: session.course_id,
          course_code: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.code || 'N/A',
          course_name: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.name || 'Unknown Course',
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          room_name: _room?.room_name || _room?.room_number || 'TBA',
          building_name: buildingName,
          enrolled_count: enrolledCount,
          attendance_count: attendanceCount,
          status: status as 'ongoing' | 'upcoming' | 'completed',
          attendance_percentage: attendancePercentage,
          totp_code: ((s => Array.isArray(s)?s[0]:s)((session as any).totp_sessions))?.code || undefined,
          totp_expires_at: ((s => Array.isArray(s)?s[0]:s)((session as any).totp_sessions))?.expires_at || undefined,
          totp_updated_at: ((s => Array.isArray(s)?s[0]:s)((session as any).totp_sessions))?.updated_at || undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[AttendanceService] Error fetching active session:', error);
    return null;
  }
}

/**
 * Get instructor's course attendance history
 * Fetches all instructor's sections by day with enrollment vs attendance counts
 */
export async function getInstructorAttendanceHistory(
  instructorId: string,
  universityId: string,
  limitDays: number = 30
): Promise<TeacherCourseAttendance[]> {
  try {
    console.log('[AttendanceService] Fetching attendance history for instructor:', instructorId, 'limit:', limitDays, 'days');

    // Get date range (use local IST date, not UTC toISOString which can be a day behind before 05:30)
    const _now = new Date();
    const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const endDate = toLocalDate(_now);
    const startDate = toLocalDate(new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000));

    // Get all sessions in date range
    const { data: sessions, error } = await supabase
      .from('lecture_sessions')
      .select(`
        id,
        course_id,
        section_id,
        session_date,
        start_time,
        end_time,
        is_active,
        is_cancelled,
        instructor_ids,
        room_id,
        courses!course_id(code, name),
        rooms!room_id(room_name, room_number, buildings(name))
      `)
      .eq('university_id', universityId)
      .eq('is_active', true)
      .eq('is_cancelled', false)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      console.log('[AttendanceService] No sessions found in date range');
      return [];
    }

    // Filter for instructor's sessions
    const instructorSessions = sessions.filter((session: any) => {
      return session.instructor_ids && Array.isArray(session.instructor_ids) && session.instructor_ids.includes(instructorId);
    });

    console.log('[AttendanceService] Found', instructorSessions.length, 'instructor sessions');

    // Build attendance data
    const result: TeacherCourseAttendance[] = [];

    for (const session of instructorSessions) {
      // Get enrollment count for this section
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('section_id', session.section_id)
        .eq('is_active', true);

      const enrolledCount = enrollments?.length || 0;

      // Get attendance records for this session
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('lecture_session_id', session.id);

      const attendanceCount = attendanceRecords?.length || 0;

      const attendancePercentage = enrolledCount > 0 ? Math.round((attendanceCount / enrolledCount) * 100) : 0;

      // Determine status
      const now = new Date();
      const [endHours, endMinutes] = session.end_time.split(':');
      const sessionEndTime = new Date(`${session.session_date}T${endHours}:${endMinutes}:00`);
      const status = sessionEndTime < now ? 'completed' : 'upcoming';

      // buildings embedded via: rooms(room_name, room_number, buildings(name))
      const _gF2 = (v: any) => Array.isArray(v) ? v?.[0] : v;
      const _room2 = _gF2((session as any).rooms);
      const buildingName: string | undefined = _gF2(_room2?.buildings)?.name;

      result.push({
        id: session.id,
        course_id: session.course_id,
        course_code: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.code || 'N/A',
        course_name: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.name || 'Unknown Course',
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        room_name: _room2?.room_name || _room2?.room_number || 'TBA',
        building_name: buildingName,
        enrolled_count: enrolledCount,
        attendance_count: attendanceCount,
        status: status as 'ongoing' | 'upcoming' | 'completed',
        attendance_percentage: attendancePercentage,
      });
    }

    return result;
  } catch (error) {
    console.error('[AttendanceService] Error fetching attendance history:', error);
    return [];
  }
}

/**
 * Get the most recent TOTP session for a given lecture session.
 *
 * Returns timing data that is fully anchored to server time:
 *  - server_remaining_ms           : milliseconds left from the server's perspective at the moment
 *                                    the response was received (device-clock-drift-free)
 *  - fetch_time_ms                 : device Date.now() captured when the response arrived
 *                                    → elapsed = Date.now() - fetch_time_ms, so
 *                                      current_remaining = server_remaining_ms - elapsed
 *  - attendance_marking_enabled    : true only after teacher pressed "Start Attendance"
 *  - teacher_baseline_pressure_hpa : barometer reading captured from teacher device at
 *                                    session start — use as floor-verification baseline
 */
export async function getTotpSessionForSession(
  lectureSessionId: string
): Promise<{
  code: string;
  expires_at: string;
  updated_at: string;
  server_remaining_ms: number;
  fetch_time_ms: number;
  attendance_marking_enabled: boolean;
  teacher_baseline_pressure_hpa: number | null;
} | null> {
  try {
    // Run the TOTP query and clock-offset calibration in parallel
    const [{ data: totpList, error }, clockOffsetMs] = await Promise.all([
      supabase
        .from('totp_sessions')
        .select('code, expires_at, updated_at, attendance_marking_enabled, teacher_baseline_pressure_hpa')
        .eq('lecture_session_id', lectureSessionId)
        .order('updated_at', { ascending: false })
        .limit(1),
      getServerClockOffsetMs(),
    ]);

    const fetchTimeMs = Date.now();                  // local time when response arrived

    if (error) {
      console.error('[AttendanceService] TOTP query error:', error.message);
      return null;
    }

    if (!totpList || totpList.length === 0) {
      console.warn('[AttendanceService] No TOTP record found for session:', lectureSessionId);
      return null;
    }

    const totp = totpList[0];

    // source of truth: cron fires every 60 s starting from updated_at
    // expires_at is unreliable (trigger bug set it to created_at + 30s)
    const serverNowMs       = fetchTimeMs + clockOffsetMs;
    const nextUpdateMs      = new Date(totp.updated_at).getTime() + 60_000;
    const serverRemainingMs = Math.max(0, nextUpdateMs - serverNowMs);

    return {
      code: totp.code,
      expires_at: totp.expires_at,
      updated_at: totp.updated_at,
      server_remaining_ms: serverRemainingMs,
      fetch_time_ms: fetchTimeMs,
      attendance_marking_enabled: totp.attendance_marking_enabled ?? false,
      teacher_baseline_pressure_hpa: totp.teacher_baseline_pressure_hpa ?? null,
    };
  } catch (error) {
    console.error('[AttendanceService] Error fetching TOTP:', error);
    return null;
  }
}

/**
 * Teacher action: "Start Attendance"
 *
 * 1. Writes the teacher's live barometer reading as the calibrated baseline
 *    for student floor verification (replaces hourly Open-Meteo value).
 * 2. Sets attendance_marking_enabled = true so students can start marking.
 *
 * Call this when the teacher presses the "Start Attendance" button on
 * TeacherStartAttendanceScreen.
 *
 * @param lectureSessionId   - The active lecture session's UUID
 * @param teacherPressureHpa - Live barometer reading from the teacher's device (hPa).
 *                             Pass null if the device has no barometer — the flag will
 *                             still be enabled; students without barometer data simply
 *                             skip floor verification.
 * @returns success flag and optional error message
 */
export async function startAttendanceSession(
  lectureSessionId: string,
  teacherPressureHpa: number | null
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[AttendanceService] Starting attendance session:', lectureSessionId);
    console.log('[AttendanceService] Teacher baseline pressure:', teacherPressureHpa, 'hPa');

    const updatePayload: Record<string, any> = {
      attendance_marking_enabled: true,
    };
    if (teacherPressureHpa !== null) {
      updatePayload.teacher_baseline_pressure_hpa = teacherPressureHpa;
    }

    const { data: updatedRows, error } = await supabase
      .from('totp_sessions')
      .update(updatePayload)
      .eq('lecture_session_id', lectureSessionId)
      .select('id, attendance_marking_enabled, teacher_baseline_pressure_hpa');

    if (error) {
      console.error('[AttendanceService] Failed to start attendance session:', error);
      return { success: false, message: error.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Supabase returns success with 0 rows when RLS blocks the update.
      // The teacher's UPDATE policy may be missing — run TEACHER_BASELINE_PRESSURE_MIGRATION.sql.
      console.error('[AttendanceService] ❌ 0 rows updated — RLS likely blocking the UPDATE for this teacher role');
      return {
        success: false,
        message: 'Permission denied: could not update attendance session. Check RLS policies (run TEACHER_BASELINE_PRESSURE_MIGRATION.sql in Supabase).',
      };
    }

    console.log('[AttendanceService] ✅ Attendance session started, marking enabled:', updatedRows[0]);
    return { success: true, message: 'Attendance marking has been enabled for students' };
  } catch (error) {
    console.error('[AttendanceService] Error starting attendance session:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Check whether attendance marking is currently enabled for a session.
 * Used by students to show a "waiting for teacher" state instead of the
 * mark-attendance flow.
 *
 * @param lectureSessionId - The lecture session UUID
 * @returns { enabled: boolean, teacherPressure: number | null }
 */
export async function getAttendanceMarkingStatus(
  lectureSessionId: string
): Promise<{ enabled: boolean; teacherPressure: number | null }> {
  try {
    const { data, error } = await supabase
      .from('totp_sessions')
      .select('attendance_marking_enabled, teacher_baseline_pressure_hpa')
      .eq('lecture_session_id', lectureSessionId)
      .maybeSingle();

    if (error || !data) {
      return { enabled: false, teacherPressure: null };
    }
    return {
      enabled: data.attendance_marking_enabled ?? false,
      teacherPressure: data.teacher_baseline_pressure_hpa ?? null,
    };
  } catch {
    return { enabled: false, teacherPressure: null };
  }
}

// ── Server clock calibration ──────────────────────────────────────────────────
// Cache the offset so we don't hit the network on every poll
let _clockOffsetMs: number = 0;
let _clockOffsetExpiry: number = 0;

/**
 * Returns (serverTime − deviceTime) in milliseconds.
 * Uses the HTTP `Date` response header from the Supabase REST endpoint.
 * Result is cached for 5 minutes.
 */
async function getServerClockOffsetMs(): Promise<number> {
  const now = Date.now();
  if (now < _clockOffsetExpiry) return _clockOffsetMs;  // use cache

  try {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`;
    const t1  = Date.now();
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const t2  = Date.now();

    const serverDateStr = res.headers.get('Date');
    if (serverDateStr) {
      const serverMs   = new Date(serverDateStr).getTime();
      const midpointMs = Math.round((t1 + t2) / 2);   // compensate for round-trip
      _clockOffsetMs   = serverMs - midpointMs;
      _clockOffsetExpiry = t2 + 5 * 60 * 1000;         // cache 5 min
      console.log(`[AttendanceService] Clock offset calibrated: ${_clockOffsetMs > 0 ? '+' : ''}${_clockOffsetMs}ms`);
    }
  } catch {
    // Network hiccup — keep previous cached value (or 0 if first call)
  }

  return _clockOffsetMs;
}

/**
 * Get instructor's courses for filtering by querying lecture_sessions
 */
export async function getInstructorCourses(
  instructorId: string,
  universityId: string,
  filters?: { sectionId?: string; programId?: string; branchId?: string; semesterId?: string }
): Promise<{ id: string; code: string; name: string }[]> {
  try {
    console.log('[AttendanceService] Fetching courses for instructor:', instructorId, 'filters:', filters);

    // If section is provided, get courses for that specific section from lecture_sessions
    if (filters?.sectionId) {
      const { data: sectionCourses, error } = await supabase
        .from('lecture_sessions')
        .select('course_id, courses(id, code, name)')
        .eq('section_id', filters.sectionId)
        .eq('university_id', universityId)
        .eq('is_active', true)
        .eq('is_cancelled', false);

      if (error) {
        console.error('[AttendanceService] Error fetching section courses:', error);
        return [];
      }

      if (!sectionCourses || sectionCourses.length === 0) {
        console.log('[AttendanceService] No courses found for section');
        return [];
      }

      // Get unique courses
      const coursesMap = new Map<string, any>();
      sectionCourses.forEach((sc: any) => {
        if (sc.courses && !coursesMap.has(sc.courses.id)) {
          coursesMap.set(sc.courses.id, {
            id: sc.courses.id,
            code: sc.courses.code,
            name: sc.courses.name,
          });
        }
      });

      const courses = Array.from(coursesMap.values());
      console.log('[AttendanceService] Found', courses.length, 'courses for section');
      return courses;
    }

    // Else, get all courses for the instructor
    const { data: sessions, error } = await supabase
      .from('lecture_sessions')
      .select('course_id, courses(id, code, name)')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .eq('is_cancelled', false);

    if (error) {
      console.error('[AttendanceService] Error fetching sessions:', error);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      console.log('[AttendanceService] No sessions found');
      return [];
    }

    // Extract unique courses and filter by instructor
    const coursesMap = new Map<string, any>();
    for (const session of sessions) {
      // Check if instructor is in the instructor_ids array
      const sessionData = session as any;
      const { data: sessionDetail } = await supabase
        .from('lecture_sessions')
        .select('instructor_ids')
        .eq('course_id', sessionData.course_id)
        .eq('university_id', universityId)
        .limit(1)
        .single();

      if (sessionDetail?.instructor_ids && Array.isArray(sessionDetail.instructor_ids) && sessionDetail.instructor_ids.includes(instructorId)) {
        if (sessionData.courses && !coursesMap.has(sessionData.courses.id)) {
          coursesMap.set(sessionData.courses.id, {
            id: sessionData.courses.id,
            code: sessionData.courses.code,
            name: sessionData.courses.name,
          });
        }
      }
    }

    const courses = Array.from(coursesMap.values());
    console.log('[AttendanceService] Found', courses.length, 'courses for instructor');
    return courses;
  } catch (error) {
    console.error('[AttendanceService] Error in getInstructorCourses:', error);
    return [];
  }
}

/**
 * Get programs and branches for section filtering
 */
export async function getProgramsAndBranches(universityId: string): Promise<{
  programs: { id: string; name: string; code: string }[];
  branches: { id: string; name: string; program_id: string }[];
}> {
  try {
    console.log('[AttendanceService] Fetching programs and branches');

    const [{ data: programs }, { data: branches }] = await Promise.all([
      supabase
        .from('programs')
        .select('id, name, code')
        .eq('university_id', universityId)
        .eq('is_active', true),
      supabase
        .from('branches')
        .select('id, name, program_id')
        .eq('university_id', universityId)
        .eq('is_active', true),
    ]);

    return {
      programs: programs || [],
      branches: branches || [],
    };
  } catch (error) {
    console.error('[AttendanceService] Error fetching programs and branches:', error);
    return { programs: [], branches: [] };
  }
}

/**
 * Get semesters for a program
 */
export async function getSemestersForProgram(programId: string): Promise<{ id: string; name: string; number: number }[]> {
  try {
    const { data, error } = await supabase
      .from('semesters')
      .select('id, name, number')
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[AttendanceService] Error fetching semesters:', error);
    return [];
  }
}

/**
 * Get sections based on program, branch, and semester
 */
export async function getSectionsForFilters(
  programId: string,
  branchId: string,
  semesterId: string
): Promise<{ id: string; name: string; code: string }[]> {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('id, name, code')
      .eq('program_id', programId)
      .eq('branch_id', branchId)
      .eq('semester_id', semesterId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[AttendanceService] Error fetching sections:', error);
    return [];
  }
}

/**
 * Get filtered attendance history with optimized queries
 */
export async function getFilteredAttendanceHistory(
  instructorId: string,
  universityId: string,
  filters: {
    timePeriod: 'today' | 'week' | '30days';
    courseId?: string | null;
    sectionId?: string | null;
  }
): Promise<TeacherCourseAttendance[]> {
  try {
    console.log('[AttendanceService] Fetching filtered attendance history:', filters);

    // Calculate date range
    const today = new Date();
    let startDate = today.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    switch (filters.timePeriod) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case '30days':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = thirtyDaysAgo.toISOString().split('T')[0];
        break;
    }

    // Build query
    let query = supabase
      .from('lecture_sessions')
      .select(`
        id,
        course_id,
        section_id,
        session_date,
        start_time,
        end_time,
        is_active,
        is_cancelled,
        instructor_ids,
        room_id,
        courses!course_id(code, name),
        rooms!room_id(room_name, room_number, buildings(name)),
        totp_sessions(code, expires_at, updated_at)
      `)
      .eq('university_id', universityId)
      .eq('is_active', true)
      .eq('is_cancelled', false)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false });

    // Apply optional filters
    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }
    if (filters.sectionId) {
      query = query.eq('section_id', filters.sectionId);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      console.log('[AttendanceService] No sessions found for filters');
      return [];
    }

    // Filter for instructor's sessions
    const instructorSessions = sessions.filter((session: any) => {
      return session.instructor_ids && Array.isArray(session.instructor_ids) && session.instructor_ids.includes(instructorId);
    });

    console.log('[AttendanceService] Found', instructorSessions.length, 'instructor sessions for filters');

    // Build attendance data
    const result: TeacherCourseAttendance[] = [];

    for (const session of instructorSessions) {
      // Use v_attendance_summary view for counts — avoids N separate RLS-sensitive queries.
      // The view uses LEFT JOIN so it handles sessions with 0 attendance correctly.
      let enrolledCount = 0;
      let attendanceCount = 0;

      const { data: summaryRow, error: summaryErr } = await supabase
        .from('v_attendance_summary')
        .select('total_enrolled, present_count, late_count')
        .eq('lecture_session_id', session.id)
        .maybeSingle();

      if (summaryErr) {
        console.warn('[AttendanceService] v_attendance_summary error, falling back to direct count:', summaryErr.message);
        // Fallback: direct count queries
        const { count: ec } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('section_id', session.section_id)
          .eq('is_active', true);
        const { count: ac } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('lecture_session_id', session.id)
          .in('attendance_status', ['present', 'late']);
        enrolledCount = ec ?? 0;
        attendanceCount = ac ?? 0;
      } else if (summaryRow) {
        enrolledCount = summaryRow.total_enrolled ?? 0;
        attendanceCount = (summaryRow.present_count ?? 0) + (summaryRow.late_count ?? 0);
      } else {
        // No summary row — session has no attendance records yet; get enrolled count separately
        const { count: ec } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('section_id', session.section_id)
          .eq('is_active', true);
        enrolledCount = ec ?? 0;
        attendanceCount = 0;
      }

      // Determine status
      const now = new Date();
      const [startHours, startMinutes] = session.start_time.split(':');
      const [endHours, endMinutes] = session.end_time.split(':');
      const sessionStartTime = new Date(`${session.session_date}T${startHours}:${startMinutes}:00`);
      const sessionEndTime = new Date(`${session.session_date}T${endHours}:${endMinutes}:00`);

      let status: 'ongoing' | 'upcoming' | 'completed' = 'completed';
      if (now >= sessionStartTime && now < sessionEndTime) {
        status = 'ongoing';
      } else if (now < sessionStartTime) {
        status = 'upcoming';
      }

      // buildings embedded via: rooms(room_name, room_number, buildings(name))
      const _gF3 = (v: any) => Array.isArray(v) ? v?.[0] : v;
      const _room3 = _gF3((session as any).rooms);
      const buildingName: string | undefined = _gF3(_room3?.buildings)?.name;
      const attendancePercentage = enrolledCount > 0 ? Math.round((attendanceCount / enrolledCount) * 100) : 0;

      result.push({
        id: session.id,
        course_id: session.course_id,
        course_code: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.code || 'N/A',
        course_name: ((s => Array.isArray(s)?s[0]:s)((session as any).courses))?.name || 'Unknown Course',
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        room_name: _room3?.room_name || _room3?.room_number || 'TBA',
        building_name: buildingName,
        enrolled_count: enrolledCount,
        attendance_count: attendanceCount,
        status: status,
        attendance_percentage: attendancePercentage,
      });
    }

    return result;
  } catch (error) {
    console.error('[AttendanceService] Error in getFilteredAttendanceHistory:', error);
    return [];
  }
}

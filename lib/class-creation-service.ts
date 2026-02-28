import supabase from '@/lib/supabase';

/**
 * Fetch programs for instructor's university
 */
export async function fetchPrograms(universityId: string) {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, code')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching programs:', error);
    return [];
  }
}

/**
 * Fetch branches for selected program
 */
export async function fetchBranches(programId: string) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, code')
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching branches:', error);
    return [];
  }
}

/**
 * Fetch semesters for selected program
 */
export async function fetchSemesters(programId: string) {
  try {
    const { data, error } = await supabase
      .from('semesters')
      .select('id, name, academic_year, number, start_date, end_date')
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('number');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching semesters:', error);
    return [];
  }
}

/**
 * Fetch sections for selected semester
 */
export async function fetchSections(semesterId: string) {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('id, name, code')
      .eq('semester_id', semesterId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching sections:', error);
    return [];
  }
}

/**
 * Fetch courses for selected section/branch
 */
export async function fetchCourses(programId: string, branchId: string, semesterId: string) {
  try {
    // Get section IDs for this branch/program/semester
    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select('id')
      .eq('program_id', programId)
      .eq('branch_id', branchId)
      .eq('semester_id', semesterId);

    if (sectionError) throw sectionError;

    const sectionIds = sectionData?.map((s) => s.id) || [];

    if (sectionIds.length === 0) {
      return [];
    }

    // Fetch courses for these sections via timetables (distinct courses)
    const { data: timetableData, error: timetableError } = await supabase
      .from('timetables')
      .select('course_id, courses(id, name, code)')
      .in('section_id', sectionIds);

    if (timetableError) throw timetableError;

    // Get unique courses
    const uniqueCourses = Array.from(
      new Map(timetableData?.map((t: any) => [t.course_id, t.courses]) || []).values()
    );

    return uniqueCourses;
  } catch (error) {
    console.error('[class-creation-service] Error fetching courses:', error);
    return [];
  }
}

/**
 * Fetch buildings for university
 */
export async function fetchBuildings(universityId: string) {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('id, name, code')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching buildings:', error);
    return [];
  }
}

/**
 * Fetch rooms for selected building
 */
export async function fetchRooms(buildingId: string) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, room_number, room_name, room_type, capacity')
      .eq('building_id', buildingId)
      .eq('is_active', true)
      .order('room_number');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching rooms:', error);
    return [];
  }
}

/**
 * Fetch co-instructors for university (excluding current instructor)
 */
export async function fetchCoInstructors(universityId: string, currentInstructorId: string) {
  try {
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name, email, code')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .neq('id', currentInstructorId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching co-instructors:', error);
    return [];
  }
}

/**
 * Fetch instructor's timetable to suggest available times
 */
export async function fetchInstructorTimetableForDate(
  instructorId: string,
  date: string
) {
  try {
    // Validate and parse date
    if (!date || date === 'NaN' || isNaN(new Date(date).getTime())) {
      console.warn('[class-creation-service] Invalid date format:', date);
      return [];
    }

    // Parse date to get day of week (0=Monday, 6=Sunday)
    const dateObj = new Date(date);
    const dayOfWeek = (dateObj.getDay() - 1 + 7) % 7; // JavaScript: 0=Sunday, convert to 0=Monday

    console.log(`[class-creation-service] Fetching timetable for instructor ${instructorId} on day ${dayOfWeek}`);

    // Fetch timetable entries for this instructor on the selected day
    const { data, error } = await supabase
      .from('timetables')
      .select('start_time, end_time')
      .contains('instructor_ids', [instructorId])
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (error) throw error;

    console.log(`[class-creation-service] Found ${data?.length || 0} timetable entries`);
    return data || [];
  } catch (error) {
    console.error('[class-creation-service] Error fetching instructor timetable:', error);
    return [];
  }
}

/**
 * Suggest available time slots for instructor on a given date
 * based on their timetable
 */
export function suggestTimeSlots(
  busyTimes: Array<{ start_time: string; end_time: string }>
): Array<{ start: string; end: string; label: string }> {
  // Define potential time ranges
  const potential = [
    { start: '08:00', end: '09:00', label: '8:00 AM - 9:00 AM' },
    { start: '09:00', end: '10:00', label: '9:00 AM - 10:00 AM' },
    { start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM' },
    { start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM' },
    { start: '12:00', end: '13:00', label: '12:00 PM - 1:00 PM' },
    { start: '13:00', end: '14:00', label: '1:00 PM - 2:00 PM' },
    { start: '14:00', end: '15:00', label: '2:00 PM - 3:00 PM' },
    { start: '15:00', end: '16:00', label: '3:00 PM - 4:00 PM' },
    { start: '16:00', end: '17:00', label: '4:00 PM - 5:00 PM' },
    { start: '17:00', end: '18:00', label: '5:00 PM - 6:00 PM' },
  ];

  // Filter out slots that conflict with busy times
  const available = potential.filter((slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    return !busyTimes.some((busy) => {
      const busyStart = timeToMinutes(busy.start_time);
      const busyEnd = timeToMinutes(busy.end_time);

      // Check if slot overlaps with busy time
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  });

  return available.length > 0 ? available : potential; // Return all if none available
}

/**
 * Convert time string (HH:mm) to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Create a special class (lecture session)
 */
export async function createSpecialClass(classData: {
  universityId: string;
  courseId: string;
  sectionId: string;
  roomId: string;
  instructorIds: string[];
  sessionDate: string;
  startTime: string;
  endTime: string;
  totpRequired: boolean;
}) {
  try {
    // Validate date format
    if (!classData.sessionDate || isNaN(new Date(classData.sessionDate).getTime())) {
      throw new Error('Invalid session date format');
    }

    const payload = {
      university_id: classData.universityId,
      course_id: classData.courseId,
      section_id: classData.sectionId,
      room_id: classData.roomId,
      instructor_ids: classData.instructorIds,
      session_date: classData.sessionDate,
      start_time: classData.startTime,
      end_time: classData.endTime,
      scheduled_start_time: classData.startTime,
      scheduled_end_time: classData.endTime,
      totp_required: classData.totpRequired,
      is_special_class: true, // Always true for created classes
      session_status: 'scheduled',
      is_active: true,
      is_cancelled: false,
    };

    console.log('[class-creation-service] Creating special class with payload:', payload);

    const { data, error } = await supabase
      .from('lecture_sessions')
      .insert([payload])
      .select();

    if (error) throw error;

    console.log('[class-creation-service] ✓ Special class created:', data);
    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error('[class-creation-service] ❌ Error creating special class:', error);
    return { success: false, error };
  }
}

/**
 * Fetch available dates for a section
 * (within current semester)
 */
export async function fetchAvailableDatesForSection(semesterId: string) {
  try {
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('start_date, end_date')
      .eq('id', semesterId)
      .single();

    if (semesterError) throw semesterError;

    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);

    // Return the date range
    return {
      startDate: semester.start_date,
      endDate: semester.end_date,
      minDate: startDate,
      maxDate: endDate,
    };
  } catch (error) {
    console.error('[class-creation-service] Error fetching semester dates:', error);
    return null;
  }
}

/**
 * Attendance history queries — student and teacher variants
 *
 * Benefits over the old useState + useEffect pattern:
 *  • Cache per (userId, filterMode) key — switching between week/month and back
 *    is an instant cache hit (within staleTime).
 *  • Background refetch on window/network reconnect (configured in query-client.ts).
 *  • Consistent isLoading / isFetching / error states across all screens.
 *  • The teacher variant supports complex filter objects; changing any filter
 *    automatically triggers a new network fetch (the filter is part of the key).
 */

import {
    TeacherCourseAttendance,
    getFilteredAttendanceHistory,
} from '@/lib/attendance-service';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// ── Query keys ─────────────────────────────────────────────────────────────────

export const attendanceHistoryKeys = {
  studentBase: (userId: string) => ['attendance-history', 'student', userId] as const,
  student: (userId: string, filterMode: 'week' | 'month') =>
    ['attendance-history', 'student', userId, filterMode] as const,
  teacherBase: (instructorId: string, universityId: string) =>
    ['attendance-history', 'teacher', instructorId, universityId] as const,
  teacher: (
    instructorId: string,
    universityId: string,
    filters: TeacherHistoryFilters
  ) => ['attendance-history', 'teacher', instructorId, universityId, filters] as const,
};

// ── Student attendance history ─────────────────────────────────────────────────

export interface StudentAttendanceRecord {
  id: string;
  courseName: string;
  courseCode: string;
  courseDate: string;
  courseTime: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedAt: string;
  validationScore?: number;
}

interface UseStudentAttendanceHistoryOptions {
  userId: string | undefined;
  filterMode: 'week' | 'month';
}

async function fetchStudentHistory(
  userId: string,
  filterMode: 'week' | 'month'
): Promise<StudentAttendanceRecord[]> {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - (filterMode === 'week' ? 7 : 30));

  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      attendance_status,
      marked_at,
      validation_score,
      lecture_sessions!inner(
        session_date,
        start_time,
        courses!inner(
          name,
          code
        )
      )
    `)
    .eq('student_id', userId)
    .gte('marked_at', startDate.toISOString())
    .order('marked_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any): StudentAttendanceRecord => {
    const session = row.lecture_sessions;
    const course = session?.courses;
    const markedDate = new Date(row.marked_at);
    return {
      id: row.id,
      courseName: course?.name ?? 'Unknown Course',
      courseCode: course?.code ?? '',
      courseDate: session?.session_date
        ? new Date(session.session_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : markedDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
      courseTime: session?.start_time
        ? (() => {
            const [h, m] = session.start_time.split(':');
            const hNum = parseInt(h);
            const period = hNum >= 12 ? 'PM' : 'AM';
            const display = hNum % 12 || 12;
            return `${display}:${m} ${period}`;
          })()
        : '',
      status: row.attendance_status ?? 'absent',
      markedAt: row.marked_at,
      validationScore: row.validation_score,
    };
  });
}

export function useStudentAttendanceHistoryQuery({
  userId,
  filterMode,
}: UseStudentAttendanceHistoryOptions) {
  return useQuery<StudentAttendanceRecord[]>({
    queryKey: attendanceHistoryKeys.student(userId ?? '', filterMode),
    queryFn: () => fetchStudentHistory(userId!, filterMode),
    enabled: !!userId,
    // Show previous filter's data while fetching the new filter — no blank flash
    placeholderData: (prev) => prev ?? [],
  });
}

// ── Teacher attendance history ─────────────────────────────────────────────────

export interface TeacherHistoryFilters {
  timePeriod: 'today' | 'week' | '30days';
  courseId?: string | null;
  sectionId?: string | null;
}

interface UseTeacherAttendanceHistoryOptions {
  instructorId: string | undefined;
  universityId: string | undefined;
  filters: TeacherHistoryFilters;
}

export function useTeacherAttendanceHistoryQuery({
  instructorId,
  universityId,
  filters,
}: UseTeacherAttendanceHistoryOptions) {
  return useQuery<TeacherCourseAttendance[]>({
    queryKey: attendanceHistoryKeys.teacher(
      instructorId ?? '',
      universityId ?? '',
      filters
    ),
    queryFn: () =>
      getFilteredAttendanceHistory(instructorId!, universityId!, {
        timePeriod: filters.timePeriod,
        courseId: filters.courseId ?? undefined,
        sectionId: filters.sectionId ?? undefined,
      }),
    enabled: !!instructorId && !!universityId,
    placeholderData: (prev) => prev ?? [],
  });
}

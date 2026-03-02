/**
 * Dashboard data queries — student and teacher variants
 *
 * Using TanStack Query here means:
 *  • The dashboard data is cached for `staleTime` (2 min) — switching tabs costs 0 RPCs.
 *  • `refetch()` on useFocusEffect gives freshness on screen focus without duplicating logic.
 *  • All loading/error/refreshing states are derived from the query — no more parallel booleans.
 *  • 1 000 students opening the dashboard simultaneously each get their own per-userId cache
 *    entry; coming back to the screen within 2 minutes is an instant cache hit.
 */

import { DashboardStats, getTodaysDashboardData } from '@/lib/dashboard-service';
import { useQuery } from '@tanstack/react-query';

// ── Query keys (stable, serialisable) ─────────────────────────────────────────

export const dashboardKeys = {
  student: (userId: string, universityId: string) =>
    ['dashboard', 'student', userId, universityId] as const,
  teacher: (instructorId: string, universityId: string) =>
    ['dashboard', 'teacher', instructorId, universityId] as const,
};

// ── Student dashboard ─────────────────────────────────────────────────────────

interface UseStudentDashboardOptions {
  userId: string | undefined;
  universityId: string | undefined;
}

export function useStudentDashboardQuery({ userId, universityId }: UseStudentDashboardOptions) {
  return useQuery<DashboardStats | null>({
    queryKey: dashboardKeys.student(userId ?? '', universityId ?? ''),
    queryFn: () =>
      getTodaysDashboardData(userId!, universityId!, 'student'),
    enabled: !!userId && !!universityId,
    // Keep previous data visible while refetching (no flash-to-spinner on focus refresh)
    placeholderData: (prev) => prev ?? null,
  });
}

// ── Teacher dashboard ─────────────────────────────────────────────────────────

interface UseTeacherDashboardOptions {
  instructorId: string | undefined;
  universityId: string | undefined;
}

export function useTeacherDashboardQuery({ instructorId, universityId }: UseTeacherDashboardOptions) {
  return useQuery<DashboardStats | null>({
    queryKey: dashboardKeys.teacher(instructorId ?? '', universityId ?? ''),
    queryFn: () =>
      getTodaysDashboardData(instructorId!, universityId!, 'teacher'),
    enabled: !!instructorId && !!universityId,
    placeholderData: (prev) => prev ?? null,
  });
}

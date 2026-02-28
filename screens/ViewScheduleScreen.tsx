import { SessionBlock } from '@/components/SessionBlock';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getSemesterDates, getStudentSchedule, getTeacherSchedule, LectureSessionExtended } from '@/lib/schedule-service';
import supabase from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    viewToggle: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 20,
      padding: 6,
      gap: 0,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
      borderBottomWidth: 3,
      borderBottomColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    dateNavigationContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    dateNavigationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    dateButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    datesContainer: {
      flexGrow: 0,
      paddingHorizontal: 0,
    },
    dateItem: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
      minWidth: 60,
    },
    dateItemToday: {
      backgroundColor: colors.success + '15',
    },
    dateLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    dateNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      textAlignVertical: 'center',
      textAlign: 'center',
    },
    dateNumberActive: {
      backgroundColor: colors.primary,
      color: '#FFFFFF',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    dateNumberToday: {
      backgroundColor: colors.success,
      color: '#FFFFFF',
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 120,
      paddingTop: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
      color: colors.textSecondary,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    classCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginVertical: 10,
      marginHorizontal: 0,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      borderLeftWidth: 4,
    },
    classCardUpcoming: {
      borderLeftColor: colors.warning,
    },
    classCardOngoing: {
      borderLeftColor: colors.success,
    },
    classCardCompleted: {
      borderLeftColor: colors.textSecondary,
    },
    classHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    classTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusBadgeUpcoming: {
      backgroundColor: colors.warning + '15',
    },
    statusBadgeOngoing: {
      backgroundColor: colors.success + '15',
    },
    statusBadgeCompleted: {
      backgroundColor: colors.textTertiary + '15',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTextUpcoming: {
      color: colors.warning,
    },
    statusTextOngoing: {
      color: colors.success,
    },
    statusTextCompleted: {
      color: colors.textSecondary,
    },
    classDetails: {
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 14,
      color: colors.primary,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    courseCode: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    weeklyContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    weekHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    dayColumn: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayHeader: {
      backgroundColor: colors.primaryLight,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    dayHeaderToday: {
      backgroundColor: colors.success + '20',
    },
    dayName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
    },
    dayNameToday: {
      color: colors.success,
    },
    dayDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dayClasses: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dayClassItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayClassItemLast: {
      borderBottomWidth: 0,
    },
    dayClassTime: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    dayClassName: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      marginHorizontal: 8,
    },
    dayClassStatus: {
      fontSize: 10,
      fontWeight: '600',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    dayClassStatusUpcoming: {
      backgroundColor: colors.warning + '20',
      color: colors.warning,
    },
    dayClassStatusOngoing: {
      backgroundColor: colors.success + '20',
      color: colors.success,
    },
    noDayClasses: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 60,
    },
    noDayClassesText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });

interface ScheduleClass {
  id: string;
  title: string;
  courseCode: string;
  time: string;
  duration: number;
  location: string;
  instructor: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  date: Date;
}

const getDatesBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
};

/**
 * Convert date to YYYY-MM-DD format for API
 */
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert LectureSessionExtended to ScheduleClass for compatibility
 */
const convertToScheduleClass = (session: LectureSessionExtended, colors: any): ScheduleClass => {
  const [startHour, startMin] = session.start_time.split(':').map(Number);
  const [endHour, endMin] = session.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const duration = endMinutes - startMinutes;

  const hour = startHour % 12 || 12;
  const period = startHour >= 12 ? 'PM' : 'AM';
  const time = `${hour}:${String(startMin).padStart(2, '0')} ${period}`;

  const room = session.room?.room_name || session.room?.room_number || 'No room';
  const building = session.room?.building?.name ? `, ${session.room.building.name}` : '';
  const location = `${room}${building}`;

  const instructorNames = session.instructors
    ?.map((ins) => ins.name)
    .join(', ') || 'No instructor';

  // Use time-dependent displayStatus calculated in service layer
  const status = session.displayStatus || 'upcoming';

  return {
    id: session.id,
    title: session.course?.name || 'Course',
    courseCode: session.course?.code || 'CODE',
    time,
    duration,
    location,
    instructor: instructorNames,
    status: status as 'upcoming' | 'ongoing' | 'completed',
    date: new Date(session.session_date),
  };
};

export const ViewScheduleScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile, isStudent, isTeacher, instructor } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allSessions, setAllSessions] = useState<LectureSessionExtended[]>([]);
  const [allClasses, setAllClasses] = useState<ScheduleClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState<string>('');
  const [semesterStartDate, setSemesterStartDate] = useState<Date | null>(null);
  const [semesterEndDate, setSemesterEndDate] = useState<Date | null>(null);
  const dateScrollRef = useRef<ScrollView>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /**
   * Fetch schedule data based on user role
   */
  const fetchSchedule = useCallback(
    async (showLoading: boolean = true) => {
      console.log(
        `[ViewScheduleScreen] fetchSchedule called - showLoading: ${showLoading}, userProfile: ${!!userProfile}, isStudent: ${isStudent}, isTeacher: ${isTeacher}`
      );

      if (!userProfile) {
        console.log('[ViewScheduleScreen] ⚠️ User profile not loaded yet');
        return;
      }

      if (showLoading) {
        console.log('[ViewScheduleScreen] ⏳ Setting isLoading = true');
        setIsLoading(true);
      }
      setError(null);

      try {
        // Get date range: 30 days back to 90 days forward for optimal caching
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 90);

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        console.log(
          `[ViewScheduleScreen] 📅 Date range: ${startDateStr} to ${endDateStr} (${Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24))} days)`
        );

        // Create cache key
        const newCacheKey = `${userProfile.id}-${startDateStr}-${endDateStr}`;
        console.log(`[ViewScheduleScreen] 🎯 Cache key: ${newCacheKey.substring(0, 20)}...`);
        setCacheKey(newCacheKey);

        let sessions: LectureSessionExtended[] = [];
        let fetchError: Error | null = null;

        if (isStudent && userProfile.id) {
          console.log(
            `[ViewScheduleScreen] 👨‍🎓 Fetching STUDENT schedule for user: ${userProfile.id.substring(0, 8)}...`
          );
          console.time('[ViewScheduleScreen] Student schedule fetch');
          // Fetch student schedule
          const result = await getStudentSchedule(
            userProfile.id,
            userProfile.university_id,
            startDateStr,
            endDateStr
          );
          console.timeEnd('[ViewScheduleScreen] Student schedule fetch');
          sessions = result.sessions || [];
          fetchError = result.error;
        } else if (isTeacher && instructor?.id) {
          console.log(
            `[ViewScheduleScreen] 👨‍🏫 Fetching TEACHER schedule for instructor: ${instructor.id.substring(0, 8)}...`
          );
          console.time('[ViewScheduleScreen] Teacher schedule fetch');
          // Fetch teacher schedule using instructor ID from auth context
          const result = await getTeacherSchedule(
            instructor.id,
            userProfile.university_id,
            startDateStr,
            endDateStr
          );
          console.timeEnd('[ViewScheduleScreen] Teacher schedule fetch');
          sessions = result.sessions || [];
          fetchError = result.error;
        } else if (isTeacher && !instructor?.id) {
          // Teacher but no instructor ID yet - might be loading
          console.warn(
            '[ViewScheduleScreen] ⚠️ Teacher logged in but instructor ID not available yet'
          );
          setError('Instructor information is still loading. Please try again.');
          setIsLoading(false);
          return;
        }

        if (fetchError) {
          console.error('[ViewScheduleScreen] ❌ Schedule fetch error:', fetchError);
          setError(`Failed to load schedule: ${fetchError.message || 'Unknown error'}`);
        } else {
          console.log(
            `[ViewScheduleScreen] ✅ Loaded ${sessions.length} sessions successfully`
          );
          if (sessions.length > 0) {
            console.log(
              `[ViewScheduleScreen] 📊 Sample sessions: ${JSON.stringify(
                sessions.slice(0, 2).map((s) => ({
                  course: s.course?.name,
                  date: s.session_date,
                  time: `${s.start_time}-${s.end_time}`,
                }))
              )}`
            );
          }
          setAllSessions(sessions);
          // Convert to ScheduleClass format
          console.log(`[ViewScheduleScreen] Converting ${sessions.length} sessions to UI format...`);
          const convertedClasses = sessions.map((session, idx) => {
            if (idx === 0) {
              console.log(
                `[ViewScheduleScreen] Sample conversion: ${session.course?.name} at ${session.start_time}`
              );
            }
            return convertToScheduleClass(session, colors);
          });
          console.log(
            `[ViewScheduleScreen] ✏️ Converted ${convertedClasses.length} classes for UI`
          );
          setAllClasses(convertedClasses);
          setError(null);
        }
      } catch (err) {
        console.error('[ViewScheduleScreen] ❌ Unexpected error during fetch:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`An error occurred: ${errorMessage}`);
      } finally {
        console.log('[ViewScheduleScreen] 🔚 Fetch completed - setting loading states to false');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userProfile, isStudent, isTeacher, instructor, colors, today]
  );

  /**
   * Fetch schedule on component mount - ONLY when profile loads
   * Don't include fetchSchedule in deps to avoid infinite loop
   */
  useEffect(() => {
    if (!userProfile) return; // Wait for profile to load

    console.log(
      `[ViewScheduleScreen] useEffect triggered ONCE - profile loaded: userProfile=${userProfile.id.substring(0, 8)}..., isStudent=${isStudent}, isTeacher=${isTeacher}`
    );
    fetchSchedule(true);
  }, [userProfile?.id, userProfile?.university_id]); // Only re-fetch if IDs change, NOT fetchSchedule

  /**
   * Fetch semester dates when profile loads
   * For students: use semester_id from profile
   * For teachers: use academic calendar or default to 6 months range
   */
  useEffect(() => {
    const fetchSemesterDates = async () => {
      // For student: fetch from their specific semester
      if (isStudent && userProfile?.semester_id) {
        console.log('[ViewScheduleScreen] 📚 Fetching semester dates for student:', userProfile.semester_id.substring(0, 8) + '...');
        const semesterDates = await getSemesterDates(userProfile.semester_id!);
        
        if (semesterDates) {
          const start = new Date(semesterDates.startDate);
          const end = new Date(semesterDates.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          
          setSemesterStartDate(start);
          setSemesterEndDate(end);
          
          // Set default selected date to today if within semester range, else to semester start
          if (today >= start && today <= end) {
            setSelectedDate(today);
          } else {
            setSelectedDate(start);
          }
          
          console.log('[ViewScheduleScreen] ✓ Semester dates set:', semesterDates.startDate, 'to', semesterDates.endDate);
        }
      } 
      // For teacher: use academic calendar or fallback to reasonable range
      else if (isTeacher) {
        console.log('[ViewScheduleScreen] 📚 Using default date range for teacher');
        
        // Try to fetch academic calendar for the university
        try {
          const { data: calendar, error } = await supabase
            .from('academic_calendar')
            .select('semester_start_date, semester_end_date')
            .eq('university_id', userProfile?.university_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && calendar) {
            const start = new Date(calendar.semester_start_date);
            const end = new Date(calendar.semester_end_date);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            setSemesterStartDate(start);
            setSemesterEndDate(end);
            setSelectedDate(today);
            
            console.log('[ViewScheduleScreen] ✓ Teacher dates from academic calendar:', calendar.semester_start_date, 'to', calendar.semester_end_date);
            return;
          }
        } catch (err) {
          console.warn('[ViewScheduleScreen] Could not fetch academic calendar, using default range');
        }

        // Fallback: Set default range (6 months from today)
        const start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(today);
        end.setMonth(today.getMonth() + 3);
        end.setHours(0, 0, 0, 0);
        
        setSemesterStartDate(start);
        setSemesterEndDate(end);
        setSelectedDate(today);
        
        console.log('[ViewScheduleScreen] ✓ Teacher using default date range:', start.toDateString(), 'to', end.toDateString());
      }
    };

    if (!userProfile) return;

    fetchSemesterDates();
  }, [userProfile?.id, isStudent, isTeacher]);

  /**
   * Handle refresh (pull-down)
   * No dependency on fetchSchedule to avoid loops
   */
  const handleRefresh = useCallback(() => {
    console.log('[ViewScheduleScreen] 🔄 User triggered pull-to-refresh');
    console.time('[ViewScheduleScreen] Refresh duration');
    setIsRefreshing(true);
    if (!userProfile) {
      console.warn('[ViewScheduleScreen] Cannot refresh - user profile not loaded');
      setIsRefreshing(false);
      return;
    }
    // Call fetchSchedule directly with saved closure
    fetchSchedule(false);
  }, [userProfile, isStudent, isTeacher, instructor, colors, today, fetchSchedule]);

  // Get dates from semester range if available, otherwise use today + 6 days
  const dates = getDatesBetween(
    semesterStartDate || new Date(today.getTime()),
    semesterEndDate || new Date(today.getTime() + 6 * 86400000)
  );

  const selectedDateClasses = allClasses.filter((cls) => {
    const clsDate = new Date(cls.date);
    clsDate.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    return clsDate.getTime() === selDate.getTime();
  });

  const isDateToday = (date: Date): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const groupedByDay = allClasses.reduce(
    (acc, cls) => {
      const clsDate = new Date(cls.date);
      clsDate.setHours(0, 0, 0, 0);
      const key = clsDate.toISOString();

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cls);
      return acc;
    },
    {} as Record<string, ScheduleClass[]>
  );

  const handleBackPress = () => {
    router.back();
  };

  const handlePreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  /**
   * Scroll date scroller to show selected date at the start
   * This runs when dates array or selectedDate changes
   */
  useEffect(() => {
    if (!dateScrollRef.current || dates.length === 0) return;

    // Find the index of the selected date in the dates array
    const selectedIndex = dates.findIndex(
      (date) =>
        new Date(date).toDateString() === new Date(selectedDate).toDateString()
    );

    if (selectedIndex >= 0) {
      // Each item is approximately 72 pixels (60 minWidth + 12 gap)
      // Scroll so that selected date starts from the left
      const scrollPosition = selectedIndex * 72;
      setTimeout(() => {
        dateScrollRef.current?.scrollTo({
          x: scrollPosition,
          animated: true,
        });
      }, 100); // Small delay to ensure ScrollView is ready
    }
  }, [dates, selectedDate]);

  const renderDailyView = () => {
    if (isLoading) {
      console.log('[ViewScheduleScreen.renderDailyView] Still loading...');
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
            Loading your schedule...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={colors.danger}
            style={styles.emptyStateIcon}
          />
          <Text style={[styles.emptyStateText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 10,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
            onPress={handleRefresh}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (selectedDateClasses.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="event-busy"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText}>
            No classes scheduled for{'\n'}
            {formatDate(selectedDate)}
          </Text>
        </View>
      );
    }

    console.log(
      `[ViewScheduleScreen.renderDailyView] Rendering ${selectedDateClasses.length} sessions for ${formatDate(selectedDate)}`
    );

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {selectedDateClasses.map((_, index) => {
          const session = allSessions.find((s) => s.id === selectedDateClasses[index].id);
          if (!session) {
            console.warn(
              `[ViewScheduleScreen.renderDailyView] Session not found for class at index ${index}`
            );
            return null;
          }

          return (
            <SessionBlock
              key={session.id}
              session={session}
              isFirstItem={index === 0}
              colors={colors}
              index={index}
            />
          );
        })}
      </ScrollView>
    );
  };

  const renderWeeklyView = () => {
    if (isLoading) {
      console.log('[ViewScheduleScreen.renderWeeklyView] Still loading...');
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
            Loading your schedule...
          </Text>
        </View>
      );
    }

    if (error) {
      console.log('[ViewScheduleScreen.renderWeeklyView] Error state:', error);
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color={colors.danger}
            style={styles.emptyStateIcon}
          />
          <Text style={[styles.emptyStateText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 10,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
            onPress={handleRefresh}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekDates = getDatesBetween(weekStart, weekEnd);

    console.log(
      `[ViewScheduleScreen.renderWeeklyView] Rendering weekly view: ${weekStart.toDateString()} to ${weekEnd.toDateString()}, total days: ${weekDates.length}`
    );
    console.log(
      `[ViewScheduleScreen.renderWeeklyView] Total sessions: ${allClasses.length}, grouped by day: ${Object.keys(groupedByDay).length} days with classes`
    );

    return (
      <ScrollView
        contentContainerStyle={styles.weeklyContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.weekHeader}>This Week</Text>

        {weekDates.map((date, dayIndex) => {
          const dayKey = new Date(date);
          dayKey.setHours(0, 0, 0, 0);
          const dayClasses = groupedByDay[dayKey.toISOString()] || [];
          const isDayToday = isDateToday(date);

          if (dayIndex === 0) {
            console.log(
              `[ViewScheduleScreen.renderWeeklyView] Week sample - Day 0 (${getDayName(date)} ${formatDate(date)}): ${dayClasses.length} classes`
            );
          }

          return (
            <Animated.View
              key={date.toISOString()}
              entering={FadeInDown.delay(dayIndex * 50)}
              style={styles.dayColumn}
            >
              <View
                style={[
                  styles.dayHeader,
                  isDayToday && styles.dayHeaderToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    isDayToday && styles.dayNameToday,
                  ]}
                >
                  {getDayName(date)}
                </Text>
                <Text style={styles.dayDate}>{formatDate(date)}</Text>
              </View>

              <View style={styles.dayClasses}>
                {dayClasses.length > 0 ? (
                  dayClasses.map((cls, idx) => (
                    <View
                      key={cls.id}
                      style={[
                        styles.dayClassItem,
                        idx === dayClasses.length - 1 && styles.dayClassItemLast,
                      ]}
                    >
                      <Text style={styles.dayClassTime}>{cls.time}</Text>
                      <Text
                        style={styles.dayClassName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {cls.title}
                      </Text>
                      <Text
                        style={[
                          styles.dayClassStatus,
                          cls.status === 'upcoming' && styles.dayClassStatusUpcoming,
                          cls.status === 'ongoing' && styles.dayClassStatusOngoing,
                        ]}
                      >
                        {cls.status.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noDayClasses}>
                    <Text style={styles.noDayClassesText}>No classes</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.cardBackground}
        translucent={false}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.iconButton}
            onPress={handleBackPress}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>

          <Text style={styles.headerTitle}>My Schedule</Text>

          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(main)/profile' as any)}>
              <Image
                source={
                  userProfile?.profile_picture_url && userProfile.profile_picture_url.trim().length > 0
                    ? { uri: userProfile.profile_picture_url }
                    : require('@/assets/images/profile-icon1.png')
                }
                style={styles.profileIcon}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* View Toggle */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={styles.viewToggle}
      >
        {['daily', 'weekly'].map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.toggleButton,
              viewMode === mode && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode(mode as 'daily' | 'weekly')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === mode && styles.toggleTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Date Navigation - Only show in Daily mode */}
      {viewMode === 'daily' && (
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.dateNavigationContainer}
        >
          <View style={styles.dateNavigationContent}>
            <Pressable
              style={styles.dateButton}
              onPress={handlePreviousDay}
            >
              <MaterialIcons
                name="chevron-left"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>

            <ScrollView
              ref={dateScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.datesContainer}
              contentContainerStyle={{ gap: 12 }}
              scrollIndicatorInsets={{ right: 1 }}
              scrollEventThrottle={16}
            >
              {dates.map((date) => {
                const isSelected =
                  new Date(date).toDateString() ===
                  new Date(selectedDate).toDateString();
                const isToday = isDateToday(date);

                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[
                      styles.dateItem,
                      isToday && styles.dateItemToday,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={styles.dateLabel}>
                      {date
                        .toLocaleDateString('en-US', { weekday: 'short' })
                        .toUpperCase()}
                    </Text>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isSelected
                          ? isToday
                            ? colors.success
                            : colors.primary
                          : 'transparent',
                        shadowColor: isSelected ? (isToday ? colors.success : colors.primary) : 'transparent',
                        shadowOffset: isSelected ? { width: 0, height: 4 } : { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.35 : 0,
                        shadowRadius: isSelected ? 8 : 0,
                        elevation: isSelected ? 6 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: isSelected
                            ? '#FFFFFF'
                            : colors.textPrimary,
                        }}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.dateButton}
              onPress={handleNextDay}
            >
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {viewMode === 'daily'
          ? renderDailyView()
          : renderWeeklyView()}
      </View>
    </View>
  );
};

export default ViewScheduleScreen;

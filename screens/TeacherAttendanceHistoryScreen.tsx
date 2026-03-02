import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTeacherAttendanceHistoryQuery } from '@/hooks/queries/useAttendanceHistoryQuery';
import { TeacherCourseAttendance, getInstructorCourses, getProgramsAndBranches, getSectionsForFilters, getSemestersForProgram } from '@/lib/attendance-service';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    brandText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    activeSessionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
    },
    sessionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    sessionCode: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    ongoingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.danger + '15',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    ongoingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },
    ongoingText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
      textTransform: 'uppercase',
    },
    manageButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
    },
    manageButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundAlt,
    },
    filterChipActive: {
      backgroundColor: colors.primary + '20',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    historyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    historyContent: {
      flex: 1,
      gap: 6,
    },
    historyDate: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    attendanceBar: {
      height: 6,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 4,
    },
    attendanceFill: {
      height: '100%',
      borderRadius: 3,
    },
    attendanceText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
    },
    chevron: {
      color: colors.textSecondary,
    },
  });

const getAttendanceColor = (percentage: number): string => {
  if (percentage >= 90) return '#10B981'; // Green
  if (percentage >= 70) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
};

const SCREEN_H = Dimensions.get('window').height;

export const TeacherAttendanceHistoryScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile, instructor } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ============================================
  // FILTER STATE - Single organized object
  // ============================================
  const [filters, setFilters] = useState({
    timePeriod: 'today' as 'today' | 'week' | '30days',
    course: null as any,
    program: null as any,
    branch: null as any,
    semester: null as any,
    section: null as any,
  });

  const [tempFilters, setTempFilters] = useState({...filters});

  // ============================================
  // FILTER DATA STATE - Dropdown options
  // ============================================
  const [courseOptions, setCourseOptions] = useState<any[]>([]);
  const [programOptions, setProgramOptions] = useState<any[]>([]);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<any[]>([]);
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);

  // ============================================
  // UI STATE
  // ============================================
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // ============================================
  // DATA STATE
  // ============================================
  const { data: historyData = [], isLoading, isFetching, refetch } = useTeacherAttendanceHistoryQuery({
    instructorId: instructor?.id,
    universityId: userProfile?.university_id,
    filters: {
      timePeriod: filters.timePeriod,
      courseId: filters.course?.id,
      sectionId: filters.section?.id,
    },
  });

  const isRefreshing = isFetching && !isLoading;

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch])
  );

  // ============================================
  // DETAIL MODAL STATE
  // ============================================
  const [selectedRecord, setSelectedRecord] = useState<TeacherCourseAttendance | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailStudents, setDetailStudents] = useState<any[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ============================================
  // FILTER EFFECTS - Load data based on temp filters (modal)
  // ============================================
  
  // Load programs and branches on mount
  useEffect(() => {
    if (userProfile?.university_id) {
      (async () => {
        const { programs, branches } = await getProgramsAndBranches(userProfile.university_id);
        setProgramOptions(programs);
        setBranchOptions(branches);
      })();
    }
  }, [userProfile?.university_id]);

  // Load semesters when temp program changes
  useEffect(() => {
    if (tempFilters.program?.id) {
      (async () => {
        const semesters = await getSemestersForProgram(tempFilters.program.id);
        setSemesterOptions(semesters);
      })();
    } else {
      setSemesterOptions([]);
    }
  }, [tempFilters.program]);

  // Load sections when temp program/branch/semester change
  useEffect(() => {
    if (tempFilters.program?.id && tempFilters.branch?.id && tempFilters.semester?.id) {
      (async () => {
        const sections = await getSectionsForFilters(tempFilters.program.id, tempFilters.branch.id, tempFilters.semester.id);
        setSectionOptions(sections);
      })();
    } else {
      setSectionOptions([]);
    }
  }, [tempFilters.program?.id, tempFilters.branch?.id, tempFilters.semester?.id]);

  // Load courses when temp section changes
  useEffect(() => {
    if (tempFilters.section?.id) {
      (async () => {
        const courses = await getInstructorCourses(instructor?.id || '', userProfile?.university_id || '', {
          sectionId: tempFilters.section?.id,
        });
        setCourseOptions(courses);
      })();
    } else {
      setCourseOptions([]);
    }
  }, [tempFilters.section?.id, instructor?.id, userProfile?.university_id]);

  // ============================================
  // FILTER HANDLERS
  // ============================================
  
  const handleSelectFilter = (field: string, value: any) => {
    setTempFilters((prev) => {
      const updated = {...prev, [field]: value};
      // Reset dependent filters when parent changes
      if (field === 'program') {
        updated.branch = null;
        updated.semester = null;
        updated.section = null;
        updated.course = null;
      } else if (field === 'branch') {
        updated.semester = null;
        updated.section = null;
        updated.course = null;
      } else if (field === 'semester') {
        updated.section = null;
        updated.course = null;
      } else if (field === 'section') {
        updated.course = null;
      }
      return updated;
    });
    setActiveDropdown(null);
  };

  const handleOpenFilterModal = () => {
    setTempFilters({...filters});
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    setFilters({...tempFilters});
    setShowFilterModal(false);
    setActiveDropdown(null);
  };

  const handleResetFilters = () => {
    setTempFilters({
      timePeriod: 'today',
      course: null,
      program: null,
      branch: null,
      semester: null,
      section: null,
    });
  };

  const fetchDetailStudents = useCallback(async (lectureSessionId: string) => {
    setIsLoadingDetail(true);
    setDetailStudents([]);
    setDetailError(null);
    try {
      // Step 1: fetch attendance records for this session
      const { data: records, error: recErr } = await supabase
        .from('attendance_records')
        .select('student_id, attendance_status, marked_at')
        .eq('lecture_session_id', lectureSessionId)
        .order('marked_at', { ascending: true });

      if (recErr) {
        console.error('[DetailModal] attendance_records RLS/error:', recErr.message, recErr.code);
        setDetailError('Cannot load student list — run RLS_ATTENDANCE_RECORDS_POLICY.sql in Supabase SQL editor');
        return;
      }

      if (!records || records.length === 0) {
        setDetailStudents([]);
        return;
      }

      // Step 2: fetch user profiles for those student IDs
      const studentIds = records.map((r: any) => r.student_id).filter(Boolean);
      const { data: users, error: usrErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, profile_picture_url')
        .in('id', studentIds);

      if (usrErr) console.warn('[DetailModal] users fetch error:', usrErr.message);

      const userMap: Record<string, any> = {};
      (users || []).forEach((u: any) => { userMap[u.id] = u; });

      // Step 3: merge
      const merged = records.map((r: any) => ({
        attendance_status: r.attendance_status,
        marked_at: r.marked_at,
        user: userMap[r.student_id] || null,
      }));
      setDetailStudents(merged);
    } catch (err) {
      console.error('[DetailModal] Error fetching students:', err);
      setDetailError('Unexpected error loading students');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleCardPress = useCallback((record: TeacherCourseAttendance) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
    fetchDetailStudents(record.id);
  }, [fetchDetailStudents]);

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);

  const handleProfilePress = () => {
    router.push('/(main)/profile' as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerBrand}>
          <Image
            source={require('@/assets/images/ATMA-inApp.png')}
            style={styles.brandIcon}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>ATMA</Text>
        </View>
        <Pressable style={{ width: 40, height: 40 }} onPress={handleProfilePress}>
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
      </Animated.View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme === 'dark' ? '#FFFFFF' : '#000000'}
              progressBackgroundColor={colors.cardBackground}
            />
          }
        >
          {/* Attendance History */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
              <Pressable
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.cardBackground,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: (filters.timePeriod !== 'today' || filters.course || filters.program || filters.branch || filters.semester || filters.section) ? colors.primary : colors.border,
                }}
                onPress={handleOpenFilterModal}
              >
                <MaterialIcons
                  name="tune"
                  size={20}
                  color={(filters.timePeriod !== 'today' || filters.course || filters.program || filters.branch || filters.semester || filters.section) ? colors.primary : colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Filter Bottom Sheet Modal */}
            <Modal
              visible={showFilterModal}
              transparent={true}
              animationType="slide"
              statusBarTranslucent={true}
              onRequestClose={() => setShowFilterModal(false)}
            >
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowFilterModal(false)} />
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: colors.cardBackground,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 16,
                }}>
                  {/* Background tail - fills Android gesture nav bar gap */}
                  <View style={{ position: 'absolute', bottom: -80, left: 0, right: 0, height: 80, backgroundColor: colors.cardBackground }} />
                  {/* Handle bar */}
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 }} />
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Filters</Text>
                    <Pressable onPress={() => setShowFilterModal(false)} style={{ padding: 4 }}>
                      <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Scrollable Content */}
                  <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16} style={{ maxHeight: SCREEN_H * 0.52 }}>
                    {/* Time Period */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Time Period</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { value: 'today' as const, label: 'Today' },
                          { value: 'week' as const, label: 'Week' },
                          { value: '30days' as const, label: '30 Days' },
                        ].map((option) => (
                          <Pressable
                            key={option.value}
                            style={{
                              flex: 1,
                              paddingHorizontal: 12,
                              paddingVertical: 12,
                              borderRadius: 8,
                              backgroundColor: tempFilters.timePeriod === option.value ? colors.primary : colors.border,
                              alignItems: 'center',
                            }}
                            onPress={() => setTempFilters((prev) => ({ ...prev, timePeriod: option.value }))}
                          >
                            <Text style={{
                              color: tempFilters.timePeriod === option.value ? '#fff' : colors.textPrimary,
                              fontSize: 13,
                              fontWeight: tempFilters.timePeriod === option.value ? '700' : '500',
                            }}>
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Program Dropdown */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Program</Text>
                      <Pressable
                        style={{
                          backgroundColor: colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onPress={() => setActiveDropdown(activeDropdown === 'program' ? null : 'program')}
                      >
                        <Text style={{
                          color: tempFilters.program ? colors.textPrimary : colors.textSecondary,
                          fontSize: 13,
                          flex: 1,
                        }} numberOfLines={1}>
                          {tempFilters.program ? `${tempFilters.program.code} - ${tempFilters.program.name}` : 'All Programs'}
                        </Text>
                        <MaterialIcons name={activeDropdown === 'program' ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
                      </Pressable>

                      {activeDropdown === 'program' && (
                        <View style={{
                          backgroundColor: colors.background,
                          borderRadius: 8,
                          marginTop: 8,
                          overflow: 'hidden',
                          maxHeight: 300,
                        }}>
                          <ScrollView scrollEnabled={programOptions.length > 5} nestedScrollEnabled={true}>
                            <Pressable
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                backgroundColor: !tempFilters.program ? colors.primary + '20' : 'transparent',
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                              }}
                              onPress={() => handleSelectFilter('program', null)}
                            >
                              {!tempFilters.program && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                              <Text style={{ color: !tempFilters.program ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: !tempFilters.program ? '600' : '500' }}>
                                All Programs
                              </Text>
                            </Pressable>
                            {programOptions.map((program) => (
                              <Pressable
                                key={program.id}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  backgroundColor: tempFilters.program?.id === program.id ? colors.primary + '20' : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }}
                                onPress={() => handleSelectFilter('program', program)}
                              >
                                {tempFilters.program?.id === program.id && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                <Text style={{ color: tempFilters.program?.id === program.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: tempFilters.program?.id === program.id ? '600' : '500' }}>
                                  {program.code} - {program.name}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Branch Dropdown - Always Visible */}
                    <View style={{ marginBottom: 24, opacity: tempFilters.program ? 1 : 0.5 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Branch</Text>
                        <Pressable
                          disabled={!tempFilters.program}
                          style={{
                            backgroundColor: colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: tempFilters.program ? 1 : 0.6,
                          }}
                          onPress={() => setActiveDropdown(activeDropdown === 'branch' ? null : 'branch')}
                        >
                          <Text style={{
                            color: tempFilters.branch ? colors.textPrimary : colors.textSecondary,
                            fontSize: 13,
                            flex: 1,
                          }} numberOfLines={1}>
                            {tempFilters.branch ? tempFilters.branch.name : 'All Branches'}
                          </Text>
                          <MaterialIcons name={activeDropdown === 'branch' ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
                        </Pressable>

                        {activeDropdown === 'branch' && (
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            marginTop: 8,
                            overflow: 'hidden',
                            maxHeight: 300,
                          }}>
                            <ScrollView scrollEnabled={branchOptions.length > 5} nestedScrollEnabled={true}>
                              <Pressable
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  backgroundColor: !tempFilters.branch ? colors.primary + '20' : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }}
                                onPress={() => handleSelectFilter('branch', null)}
                              >
                                {!tempFilters.branch && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                <Text style={{ color: !tempFilters.branch ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: !tempFilters.branch ? '600' : '500' }}>
                                  All Branches
                                </Text>
                              </Pressable>
                              {branchOptions
                                .filter((b) => b.program_id === tempFilters.program?.id)
                                .map((branch) => (
                                  <Pressable
                                    key={branch.id}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 12,
                                      backgroundColor: tempFilters.branch?.id === branch.id ? colors.primary + '20' : 'transparent',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      borderBottomWidth: 1,
                                      borderBottomColor: colors.border,
                                    }}
                                    onPress={() => handleSelectFilter('branch', branch)}
                                  >
                                    {tempFilters.branch?.id === branch.id && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                    <Text style={{ color: tempFilters.branch?.id === branch.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: tempFilters.branch?.id === branch.id ? '600' : '500' }}>
                                      {branch.name}
                                    </Text>
                                  </Pressable>
                                ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                    {/* Semester Dropdown - Always Visible */}
                    <View style={{ marginBottom: 24, opacity: tempFilters.program ? 1 : 0.5 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Semester</Text>
                        <Pressable
                          disabled={!tempFilters.program}
                          style={{
                            backgroundColor: colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: tempFilters.program ? 1 : 0.6,
                          }}
                          onPress={() => setActiveDropdown(activeDropdown === 'semester' ? null : 'semester')}
                        >
                          <Text style={{
                            color: tempFilters.semester ? colors.textPrimary : colors.textSecondary,
                            fontSize: 13,
                            flex: 1,
                          }} numberOfLines={1}>
                            {tempFilters.semester ? `Semester ${tempFilters.semester.number}` : 'All Semesters'}
                          </Text>
                          <MaterialIcons name={activeDropdown === 'semester' ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
                        </Pressable>

                        {activeDropdown === 'semester' && (
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            marginTop: 8,
                            overflow: 'hidden',
                            maxHeight: 300,
                          }}>
                            <ScrollView scrollEnabled={semesterOptions.length > 5} nestedScrollEnabled={true}>
                              <Pressable
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  backgroundColor: !tempFilters.semester ? colors.primary + '20' : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }}
                                onPress={() => handleSelectFilter('semester', null)}
                              >
                                {!tempFilters.semester && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                <Text style={{ color: !tempFilters.semester ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: !tempFilters.semester ? '600' : '500' }}>
                                  All Semesters
                                </Text>
                              </Pressable>
                              {semesterOptions.map((semester) => (
                                <Pressable
                                  key={semester.id}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    backgroundColor: tempFilters.semester?.id === semester.id ? colors.primary + '20' : 'transparent',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                  }}
                                  onPress={() => handleSelectFilter('semester', semester)}
                                >
                                  {tempFilters.semester?.id === semester.id && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                  <Text style={{ color: tempFilters.semester?.id === semester.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: tempFilters.semester?.id === semester.id ? '600' : '500' }}>
                                    Semester {semester.number}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                    {/* Section Dropdown - Always Visible */}
                    <View style={{ marginBottom: 24, opacity: (tempFilters.program && tempFilters.branch && tempFilters.semester) ? 1 : 0.5 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Section</Text>
                        <Pressable
                          disabled={!tempFilters.program || !tempFilters.branch || !tempFilters.semester}
                          style={{
                            backgroundColor: colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: (tempFilters.program && tempFilters.branch && tempFilters.semester) ? 1 : 0.6,
                          }}
                          onPress={() => setActiveDropdown(activeDropdown === 'section' ? null : 'section')}
                        >
                          <Text style={{
                            color: tempFilters.section ? colors.textPrimary : colors.textSecondary,
                            fontSize: 13,
                            flex: 1,
                          }} numberOfLines={1}>
                            {tempFilters.section ? tempFilters.section.code : 'All Sections'}
                          </Text>
                          <MaterialIcons name={activeDropdown === 'section' ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
                        </Pressable>

                        {activeDropdown === 'section' && (
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            marginTop: 8,
                            overflow: 'hidden',
                            maxHeight: 300,
                          }}>
                            <ScrollView scrollEnabled={sectionOptions.length > 5} nestedScrollEnabled={true}>
                              <Pressable
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  backgroundColor: !tempFilters.section ? colors.primary + '20' : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }}
                                onPress={() => handleSelectFilter('section', null)}
                              >
                                {!tempFilters.section && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                <Text style={{ color: !tempFilters.section ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: !tempFilters.section ? '600' : '500' }}>
                                  All Sections
                                </Text>
                              </Pressable>
                              {sectionOptions.map((section) => (
                                <Pressable
                                  key={section.id}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    backgroundColor: tempFilters.section?.id === section.id ? colors.primary + '20' : 'transparent',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                  }}
                                  onPress={() => handleSelectFilter('section', section)}
                                >
                                  {tempFilters.section?.id === section.id && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                  <Text style={{ color: tempFilters.section?.id === section.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: tempFilters.section?.id === section.id ? '600' : '500' }}>
                                    {section.code}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                    {/* Course Dropdown - Always Visible */}
                    <View style={{ marginBottom: 24, opacity: tempFilters.section ? 1 : 0.5 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 }}>Course</Text>
                        <Pressable
                          disabled={!tempFilters.section}
                          style={{
                            backgroundColor: colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: tempFilters.section ? 1 : 0.6,
                          }}
                          onPress={() => setActiveDropdown(activeDropdown === 'course' ? null : 'course')}
                        >
                          <Text style={{
                            color: tempFilters.course ? colors.textPrimary : colors.textSecondary,
                            fontSize: 13,
                            flex: 1,
                          }} numberOfLines={1}>
                            {tempFilters.course ? `${tempFilters.course.code} - ${tempFilters.course.name}` : 'All Courses'}
                          </Text>
                          <MaterialIcons name={activeDropdown === 'course' ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
                        </Pressable>

                        {activeDropdown === 'course' && (
                          <View style={{
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            marginTop: 8,
                            overflow: 'hidden',
                            maxHeight: 300,
                          }}>
                            <ScrollView scrollEnabled={courseOptions.length > 5} nestedScrollEnabled={true}>
                              <Pressable
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  backgroundColor: !tempFilters.course ? colors.primary + '20' : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }}
                                onPress={() => handleSelectFilter('course', null)}
                              >
                                {!tempFilters.course && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                <Text style={{ color: !tempFilters.course ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: !tempFilters.course ? '600' : '500' }}>
                                  All Courses
                                </Text>
                              </Pressable>
                              {courseOptions.map((course) => (
                                <Pressable
                                  key={course.id}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    backgroundColor: tempFilters.course?.id === course.id ? colors.primary + '20' : 'transparent',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                  }}
                                  onPress={() => handleSelectFilter('course', course)}
                                >
                                  {tempFilters.course?.id === course.id && <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                                  <Text style={{ color: tempFilters.course?.id === course.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: tempFilters.course?.id === course.id ? '600' : '500', flex: 1 }} numberOfLines={1}>
                                    {course.code} - {course.name}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                    {/* Spacer for scrolling */}
                    <View style={{ height: 20 }} />
                  </ScrollView>

                  {/* Action Buttons - Fixed at Bottom */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 0,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}>
                    <Pressable
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: colors.border,
                        alignItems: 'center',
                      }}
                      onPress={handleResetFilters}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Reset</Text>
                    </Pressable>
                    <Pressable
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                      }}
                      onPress={handleApplyFilters}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Apply</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>


            {/* History Cards */}
            {historyData.length > 0 ? (
              historyData.map((record, index) => (
                <Animated.View key={record.id} entering={FadeInUp.delay(index * 100)}>
                  <Pressable style={styles.historyCard} onPress={() => handleCardPress(record)}>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyDate}>{record.session_date}</Text>
                      <Text style={styles.historyTitle}>{record.course_name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        {record.course_code}
                      </Text>
                      <View style={styles.attendanceBar}>
                        <View
                          style={[
                            styles.attendanceFill,
                            {
                              width: `${record.attendance_percentage}%`,
                              backgroundColor: getAttendanceColor(record.attendance_percentage),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.attendanceText}>
                        {record.attendance_count}/{record.enrolled_count} ({record.attendance_percentage}%)
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </Animated.View>
              ))
            ) : (
              <View style={[styles.historyCard, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginVertical: 24 }}>
                  No sessions found for this filter
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Attendance Detail Modal ── */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowDetailModal(false)} />
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
          }}>
            {/* Background tail - fills Android gesture nav bar gap */}
            <View style={{ position: 'absolute', bottom: -80, left: 0, right: 0, height: 80, backgroundColor: colors.cardBackground }} />
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }} numberOfLines={2}>
                  {selectedRecord?.course_name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }}>
                  {selectedRecord?.session_date}
                  {selectedRecord?.start_time ? ` · ${(() => { const [h, m] = selectedRecord.start_time.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })()}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setShowDetailModal(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Summary chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#10B98118', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>{selectedRecord?.attendance_count ?? 0}</Text>
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 2 }}>Present</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.border + '50', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>{selectedRecord?.enrolled_count ?? 0}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 }}>Enrolled</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F59E0B18', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B' }}>{selectedRecord?.attendance_percentage ?? 0}%</Text>
                <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 2 }}>Rate</Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Students
            </Text>

            {/* Student list */}
            {isLoadingDetail ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : detailError ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MaterialIcons name="lock" size={36} color="#EF4444" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 }}>
                  {detailError}
                </Text>
              </View>
            ) : detailStudents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialIcons name="group-off" size={40} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No attendance records found</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_H * 0.45 }} nestedScrollEnabled>
                {detailStudents.map((item: any, idx: number) => {
                  const user = item.user || {};
                  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
                  const status: string = item.attendance_status ?? 'present';
                  const statusColor = status === 'present' ? '#10B981' : status === 'late' ? '#F59E0B' : '#EF4444';
                  const markedAt = item.marked_at
                    ? new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        borderBottomWidth: idx < detailStudents.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      {user.profile_picture_url ? (
                        <Image
                          source={{ uri: user.profile_picture_url }}
                          style={{ width: 40, height: 40, borderRadius: 20 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: colors.primaryLight,
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{markedAt}</Text>
                      </View>
                      <View style={{
                        backgroundColor: statusColor + '22',
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderRadius: 20,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor, textTransform: 'capitalize' }}>
                          {status}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TeacherAttendanceHistoryScreen;

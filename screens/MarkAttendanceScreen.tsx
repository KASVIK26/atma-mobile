import { AttendanceBottomSheet } from '@/components/AttendanceBottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ClassWithStatus, getTodaysClassesWithStatus } from '@/lib/dashboard-service';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
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
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
      paddingBottom: 100,
    },
    titleSection: {
      marginBottom: 24,
    },
    mainTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    ongoingSessionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sessionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    badgeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.success,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    courseCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    courseTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      lineHeight: 24,
    },
    detailsGrid: {
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      flex: 1,
    },
    markButton: {
      marginTop: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.success,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    markButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyState: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
  });

export const MarkAttendanceScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [classes, setClasses] = useState<ClassWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ongoingSession, setOngoingSession] = useState<ClassWithStatus | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Fetch today's classes and find ongoing one
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userProfile?.id || !userProfile?.university_id) {
        console.warn('[MarkAttendanceScreen] Missing user profile data');
        setIsLoading(false);
        return;
      }

      try {
        const classesWithStatus = await getTodaysClassesWithStatus(
          userProfile.id,
          userProfile.university_id,
          userProfile.role || 'student'  // Pass user's role for TOTP visibility
        );

        setClasses(classesWithStatus);

        // Find the ongoing session
        const ongoing = classesWithStatus.find((c) => c.status === 'ongoing');
        setOngoingSession(ongoing || null);

        console.log('[MarkAttendanceScreen] Loaded', classesWithStatus.length, 'classes');
        console.log('[MarkAttendanceScreen] All classes:', classesWithStatus.map(c => ({
          code: c.course?.code,
          status: c.status,
          time: `${c.start_time}-${c.end_time}`
        })));
        console.log('[MarkAttendanceScreen] Ongoing session:', ongoing?.course?.code || 'NONE');
        
        // If no ongoing session, use first upcoming for testing
        if (!ongoing && classesWithStatus.length > 0) {
          console.log('[MarkAttendanceScreen] No ongoing session - test mode enabled');
          setTestMode(true);
        }
      } catch (error) {
        console.error('[MarkAttendanceScreen] Error fetching classes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [userProfile?.id, userProfile?.university_id]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const handleMarkAttendance = () => {
    if (ongoingSession) {
      setShowBottomSheet(true);
    }
  };

  const handleBottomSheetClose = () => {
    setShowBottomSheet(false);
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
        entering={FadeInDown.delay(0)}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons
              name="done-all"
              size={24}
              color={colors.success}
            />
            <Text style={styles.headerTitle}>Mark Attendance</Text>
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.titleSection}>
          <Text style={styles.mainTitle}>Check In</Text>
          <Text style={styles.subtitle}>Mark your attendance for your class</Text>
        </Animated.View>

        {/* Ongoing Session or Empty State */}
        <Animated.View entering={FadeInUp.delay(200)}>
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : ongoingSession || (testMode && classes.length > 0) ? (
            <View style={styles.ongoingSessionCard}>
              {/* Session Badge */}
              <View style={styles.sessionBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {testMode ? 'TEST MODE - Click to Test' : 'Currently Ongoing'}
                </Text>
              </View>

              {/* Course Info */}
              <Text style={styles.courseCode}>
                {(ongoingSession || classes[0])?.course?.code}
              </Text>
              <Text style={styles.courseTitle}>
                {(ongoingSession || classes[0])?.course?.name}
              </Text>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                {/* Time */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="access-time" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.detailText}>
                    {(ongoingSession || classes[0])?.start_time} - {(ongoingSession || classes[0])?.end_time}
                  </Text>
                </View>

                {/* Location */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="location-on" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailText}>
                      {(ongoingSession || classes[0])?.room?.room_name || 
                       (ongoingSession || classes[0])?.room?.room_number || 
                       'TBA'}
                    </Text>
                    {(ongoingSession || classes[0])?.room?.building?.name && (
                      <Text style={[styles.detailText, { fontSize: 12, marginTop: 2 }]}>
                        {(ongoingSession || classes[0])?.room.building.name}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Instructor */}
                {(ongoingSession || classes[0])?.instructor_names && (ongoingSession || classes[0])?.instructor_names?.length > 0 && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <MaterialIcons name="person" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.detailText}>
                      {(ongoingSession || classes[0])?.instructor_names?.join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mark Attendance Button */}
              <Pressable
                style={styles.markButton}
                onPress={() => {
                  if (ongoingSession || testMode) {
                    // Use actual session if available, otherwise test
                    if (!ongoingSession && testMode) {
                      setOngoingSession(classes[0])
                    }
                    setShowBottomSheet(true);
                  }
                }}
              >
                <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.markButtonText}>
                  {testMode ? 'Test Attendance' : 'Mark Attendance'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="event-busy"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No Ongoing Classes</Text>
              <Text style={styles.emptySubtext}>
                You don't have any classes happening right now. Check back later!
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Attendance Bottom Sheet */}
      {ongoingSession && (
        <AttendanceBottomSheet
          isVisible={showBottomSheet}
          onClose={handleBottomSheetClose}
          session={ongoingSession}
          studentId={userProfile?.id}
          universityId={userProfile?.university_id}
        />
      )}
    </View>
  );
};

export default MarkAttendanceScreen;

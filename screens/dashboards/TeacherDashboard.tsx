import { QuickActionButton } from '@/components/QuickActionButton';
import { StatsCard } from '@/components/StatsCard';
import { UpcomingClassCard } from '@/components/UpcomingClassCard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DashboardStats, formatTime, getTodaysDashboardData } from '@/lib/dashboard-service';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any, theme: string) =>
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
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBg: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    headerBrand: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
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
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 120,
    },
    headline: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 4,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginVertical: 12,
      marginBottom: 20,
    },
    statHalf: {
      flex: 1,
      minWidth: '48%',
    },
    quickActionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginVertical: 16,
    },
    carouselContent: {
      paddingHorizontal: 0,
      gap: 12,
    },
    spacer: {
      height: 12,
    },
  });

const defaultStats = [
  { icon: 'event-available', number: '0', label: 'Total Classes', color: '#10B981' },
  { icon: 'done-all', number: '0', label: 'Completed Sessions', color: '#2563EB' },
];

export const TeacherDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile, instructor } = useAuth();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState(defaultStats);

  // Memoized fetch function that can be called from multiple places
  const fetchDashboardData = useCallback(async () => {
    if (!instructor?.id || !userProfile?.university_id) {
      console.warn('[TeacherDashboard] Missing instructor data');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const data = await getTodaysDashboardData(
        instructor.id,
        userProfile.university_id,
        'teacher'  // Explicitly pass teacher role
      );

      if (data) {
        setDashboardData(data);
        // Update stats with real data
        setStats([
          {
            icon: 'event-available',
            number: String(data.totalClasses),
            label: 'Total Classes',
            color: '#10B981',
          },
          {
            icon: 'done-all',
            number: String(data.attendanceStreak), // This returns completed sessions count
            label: 'Completed Sessions',
            color: '#2563EB',
          },
        ]);
        console.log('[TeacherDashboard] Dashboard data loaded successfully');
      }
    } catch (error) {
      console.error('[TeacherDashboard] Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [instructor?.id, userProfile?.university_id]);

  // Initial data load on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh when screen comes into focus (e.g., after creating special class)
  useFocusEffect(
    useCallback(() => {
      console.log('[TeacherDashboard] Screen focused - auto-refreshing');
      setIsRefreshing(true);
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const greeting = getTimeBasedGreeting();
  const teacherName = userProfile?.first_name || 'Teacher';

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const handleProfilePress = () => {
    router.push('/profile' as any);
  };

  const handleViewSchedule = () => {
    router.push('/(main)/view-schedule' as any);
  };

  const handleAttendance = () => {
    router.push('/(main)/start-attendance' as any);
  };

  const handleCreateClass = () => {
    router.push('/(main)/create-class' as any);
  };

  const handleAttendanceHistory = () => {
    router.push('/(main)/history' as any);
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
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBg}>
              <Image
                source={require('@/assets/images/ATMA-LOGO.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.headerBrand}>ATMA</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={handleProfilePress}>
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

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressBackgroundColor={colors.cardBackground}
          />
        }
      >
        {/* Greeting */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.headline}>{greeting}, {teacherName}</Text>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(200)}
          style={styles.quickActionsContainer}
        >
          <View style={{ flexDirection: 'row', flex: 1, gap: 12 }}>
            <QuickActionButton
              icon="qr-code-scanner"
              label="Start Attendance"
              onPress={handleAttendance}
              colors={colors}
            />
            <QuickActionButton
              icon="calendar-month"
              label="View Schedule"
              onPress={handleViewSchedule}
              colors={colors}
            />
            <QuickActionButton
              icon="add-circle"
              label="Create Class"
              onPress={handleCreateClass}
              colors={colors}
            />
            <QuickActionButton
              icon="history"
              label="Attendance History"
              onPress={handleAttendanceHistory}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Upcoming Classes Section */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.sectionTitle}>Today’s Classes</Text>
          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (() => {
            // Show ALL of today's sessions — ongoing, upcoming, AND completed.
            // Teachers need to see completed sessions to review attendance.
            const now = new Date();
            const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const allTodaySessions = (dashboardData?.upcomingSessions || []).map((session) => {
              const [endH, endM] = session.end_time.split(':');
              const [startH, startM] = session.start_time.split(':');
              const sessionEnd   = new Date(`${todayLocal}T${endH}:${endM}:00`);
              const sessionStart = new Date(`${todayLocal}T${startH}:${startM}:00`);
              const displayStatus =
                now >= sessionStart && now < sessionEnd ? 'ongoing'
                : now >= sessionEnd                    ? 'completed'
                : 'upcoming';
              return { ...session, displayStatus };
            });
            // Sort: ongoing first, then upcoming, then completed
            const sorted = [
              ...allTodaySessions.filter(s => s.displayStatus === 'ongoing'),
              ...allTodaySessions.filter(s => s.displayStatus === 'upcoming'),
              ...allTodaySessions.filter(s => s.displayStatus === 'completed'),
            ];
            const filteredSessions = sorted;

            return filteredSessions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                scrollIndicatorInsets={{ bottom: 1 }}
              >
                {filteredSessions.map((session, index) => {
                  const roomName = session.room?.room_name || session.room?.room_number || 'TBA';
                  const buildingName = session.room?.building?.name ? ` - ${session.room.building.name}` : '';
                  const location = `${roomName}${buildingName}`;

                  return (
                    <UpcomingClassCard
                      key={`${session.id}-${index}`}
                      time={formatTime(session.start_time)}
                      courseCode={session.course?.code || 'N/A'}
                      courseName={session.course?.name || 'Unknown Course'}
                      location={location}
                      colors={colors}
                      theme={theme}
                      isPrimary={index === 0}
                      delay={400 + index * 100}
                    />
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  No classes scheduled for today
                </Text>
              </View>
            );
          })()}
        </Animated.View>

        {/* Stats Section */}
        <Animated.View entering={FadeInUp.delay(500)}>
          <Text style={styles.sectionTitle}>Your day at a glance</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statHalf}>
                <StatsCard
                  icon={stat.icon as any}
                  number={stat.number}
                  label={stat.label}
                  colors={colors}
                  iconColor={stat.color}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

export default TeacherDashboard;

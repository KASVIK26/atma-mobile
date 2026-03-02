import { AttendanceProgress } from '@/components/AttendanceProgress';
import { QuickActionButton } from '@/components/QuickActionButton';
import { StatsCard } from '@/components/StatsCard';
import { UpcomingClassCard } from '@/components/UpcomingClassCard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useStudentDashboardQuery } from '@/hooks/queries/useDashboardQuery';
import { formatTime } from '@/lib/dashboard-service';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
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
    greetingCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    greetingTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 16,
    },
    carouselContent: {
      paddingHorizontal: 0,
      gap: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginVertical: 12,
      marginBottom: 24,
    },
    statHalf: {
      flex: 1,
      minWidth: '48%',
    },
    statFull: {
      width: '100%',
    },
    spacer: {
      height: 12,
    },
  });


const studentClasses = [
  // This will be populated with real data from dashboard service
];

export const StudentDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile } = useAuth();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  // ── Server state via TanStack Query ─────────────────────────────────────────
  // Cache key: ['dashboard', 'student', userId, universityId]
  // staleTime 2 min → zero extra RPCs on tab switch within that window.
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    refetch,
  } = useStudentDashboardQuery({
    userId: userProfile?.id,
    universityId: userProfile?.university_id,
  });

  // Refresh data every time this screen comes into focus (e.g. after marking attendance).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Stats derived from dashboard data — recomputed only when data changes.
  const stats = useMemo(() => [
    {
      icon: 'event-available',
      number: String(dashboardData?.totalClasses ?? 0),
      label: 'Total Classes',
      color: '#10B981',
    },
    {
      icon: 'trending-up',
      number: String(dashboardData?.attendanceStreak ?? 0),
      label: 'Attendance Streak',
      color: '#2563EB',
    },
    {
      icon: 'percent',
      number: `${dashboardData?.weeklyAttendancePercentage ?? 0}%`,
      label: 'Weekly Attendance',
      color: '#F59E0B',
    },
  ], [dashboardData]);

  // Get time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = userProfile?.first_name || 'there';

  const handleProfilePress = () => {
    router.push('/profile' as any);
  };

  const handleMarkAttendance = () => {
    router.push('/(main)/mark-attendance' as any);
  };

  const handleMyClasses = () => {
    router.push('/(main)/classes' as any);
  };

  const handleViewSchedule = () => {
    router.push('/(main)/view-schedule' as any);
  };

  const handleGeolocationTest = () => {
    router.push('/(main)/geolocation-test' as any);
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
            <Image
              source={require('@/assets/images/ATMA-inApp.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
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
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting Card with Attendance */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>{greeting}, {userName}</Text>
          <AttendanceProgress percentage={85} colors={colors} />
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(200)}
          style={styles.quickActionsContainer}
        >
          <QuickActionButton
            icon="qr-code-scanner"
            label="Mark Attendance"
            onPress={handleMarkAttendance}
            colors={colors}
          />
          <QuickActionButton
            icon="school"
            label="My Classes"
            onPress={handleMyClasses}
            colors={colors}
          />
          <QuickActionButton
            icon="calendar-month"
            label="View Schedule"
            onPress={handleViewSchedule}
            colors={colors}
          />
          <QuickActionButton
            icon="location-on"
            label="Geo Test"
            onPress={handleGeolocationTest}
            colors={colors}
          />
        </Animated.View>

        {/* Upcoming Classes Section */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (() => {
            // Show ALL of today's sessions — ongoing, upcoming, AND completed.
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

            return sorted.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                scrollIndicatorInsets={{ bottom: 1 }}
              >
                {sorted.map((session, index) => {
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
                      onPress={handleMyClasses}
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
          <Text style={styles.sectionTitle}>Your Day at a Glance</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View
                key={index}
                style={[
                  styles.statHalf,
                  index === 2 && styles.statFull,
                ]}
              >
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

export default StudentDashboard;

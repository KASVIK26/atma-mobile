import { AttendanceProgress } from '@/components/AttendanceProgress';
import { QuickActionButton } from '@/components/QuickActionButton';
import { StatsCard } from '@/components/StatsCard';
import { UpcomingClassCard } from '@/components/UpcomingClassCard';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
    Image,
    Pressable,
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
  {
    time: '09:00 AM',
    courseCode: 'CS-101',
    courseName: 'Introduction to Computer Science',
    location: 'Lab 101',
    icon: 'code',
    isPrimary: true,
  },
  {
    time: '11:00 AM',
    courseCode: 'MATH-201',
    courseName: 'Calculus II',
    location: 'Room 205',
    icon: 'calculate',
    isPrimary: false,
  },
  {
    time: '02:00 PM',
    courseCode: 'ENG-150',
    courseName: 'English Literature',
    location: 'Auditorium A',
    icon: 'book',
    isPrimary: false,
  },
];

const stats = [
  { icon: 'event-available', number: '12', label: 'Total Classes', color: '#10B981' },
  { icon: 'trending-up', number: '4', label: 'Attendance Streak', color: '#2563EB' },
  { icon: 'hourglass-top', number: '2', label: 'Absence Requests', color: '#F59E0B' },
];

export const StudentDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

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
            <Pressable style={styles.iconButton}>
              <MaterialIcons
                name="search"
                size={24}
                color={colors.textSecondary}
              />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={handleProfilePress}>
              <Image
                source={
                  theme === 'light'
                    ? require('@/assets/images/profile-icon4.png')
                    : require('@/assets/images/profile-icon3.png')
                }
                style={styles.profileIcon}
                resizeMode="contain"
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
      >
        {/* Greeting Card with Attendance */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>Good afternoon, Alex</Text>
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
            onPress={() => {}}
            colors={colors}
          />
          <QuickActionButton
            icon="school"
            label="My Classes"
            onPress={() => {}}
            colors={colors}
          />
          <QuickActionButton
            icon="calendar-month"
            label="View Schedule"
            onPress={handleViewSchedule}
            colors={colors}
          />
        </Animated.View>

        {/* Upcoming Classes Section */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.sectionTitle}>Upcoming Today</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            scrollIndicatorInsets={{ bottom: 1 }}
          >
            {studentClasses.map((classItem, index) => (
              <UpcomingClassCard
                key={`${classItem.courseCode}-${index}`}
                time={classItem.time}
                courseCode={classItem.courseCode}
                courseName={classItem.courseName}
                location={classItem.location}
                colors={colors}
                theme={theme}
                isPrimary={classItem.isPrimary}
                delay={400 + index * 100}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View entering={FadeInUp.delay(500)}>
          <Text style={styles.sectionTitle}>Your Week at a Glance</Text>
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

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
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    schoolIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
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


const teacherClasses = [
  {
    time: '02:00 PM',
    courseCode: 'CS-301',
    courseName: 'Software Engineering',
    location: 'Room 404B',
    isPrimary: true,
  },
  {
    time: '04:00 PM',
    courseCode: 'DS-212',
    courseName: 'Data Structures',
    location: 'Hall A',
    isPrimary: false,
  },
  {
    time: '05:30 PM',
    courseCode: 'AI-401',
    courseName: 'Intro to Artificial Intelligence',
    location: 'Room 201C',
    isPrimary: false,
  },
];

const stats = [
  { icon: 'event-available', number: '5', label: 'Total Classes', color: '#10B981' },
  { icon: 'done-all', number: '2', label: 'Completed Sessions', color: '#2563EB' },
];

export const TeacherDashboard = () => {
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

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
              <MaterialIcons name="school" size={24} color={colors.primary} />
            </View>
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
        {/* Headline */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.headline}>Good afternoon, Dr. Evans</Text>
          <Text style={styles.date}>Today is {dateString}</Text>
        </Animated.View>

        {/* Your day at a glance - Stats */}
        <Animated.View entering={FadeInUp.delay(200)}>
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

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(300)}
          style={styles.quickActionsContainer}
        >
          <QuickActionButton
            icon="qr-code-scanner"
            label="Start Attendance"
            onPress={() => {}}
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
            onPress={() => {}}
            colors={colors}
          />
        </Animated.View>

        {/* Upcoming Classes */}
        <Animated.View entering={FadeInUp.delay(400)}>
          <Text style={styles.sectionTitle}>Upcoming classes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            scrollIndicatorInsets={{ bottom: 1 }}
          >
            {teacherClasses.map((classItem, index) => (
              <UpcomingClassCard
                key={`${classItem.courseCode}-${index}`}
                time={classItem.time}
                courseCode={classItem.courseCode}
                courseName={classItem.courseName}
                location={classItem.location}
                colors={colors}
                theme={theme}
                isPrimary={classItem.isPrimary}
                delay={500 + index * 100}
              />
            ))}
          </ScrollView>
        </Animated.View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

export default TeacherDashboard;

import { ClassCard } from '@/components/ClassCard';
import { useTheme } from '@/context/ThemeContext';
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
      backgroundColor: theme === 'dark' ? '#0E0E0E' : colors.background,
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
      paddingTop: 12,
      paddingBottom: 12,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBg: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBrand: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    greetingSection: {
      marginBottom: 24,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    greetingSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      marginTop: 8,
    },
    upcomingClass: {
      marginBottom: 32,
    },
  });

export const TeacherDashboard = () => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const upcomingClasses = [
    {
      courseCode: 'CS 101',
      courseName: 'Introduction to Computer Science',
      time: '09:00 AM',
      instructor: 'Prof. John Smith',
      room: 'Lab 101',
    },
    {
      courseCode: 'CS 201',
      courseName: 'Data Structures',
      time: '11:00 AM',
      instructor: 'Prof. John Smith',
      room: 'Lab 102',
    },
    {
      courseCode: 'CS 301',
      courseName: 'Advanced Algorithms',
      time: '02:00 PM',
      instructor: 'Prof. John Smith',
      room: 'Lab 103',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
        <View style={[styles.headerTop, { paddingTop: insets.top + 12 }]}>
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/ATMA-LOGO.png')}
              style={styles.logoBg}
              resizeMode="contain"
            />
            <Text style={styles.headerBrand}>ATMA</Text>
          </View>
          <Pressable style={styles.profileButton}>
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
        <View style={styles.headerDivider} />
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.greetingSection}>
          <Text style={styles.greeting}>Welcome back, Teacher!</Text>
          <Text style={styles.greetingSubtitle}>Here are your classes for today</Text>
        </Animated.View>

        {/* Upcoming Classes Section */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.upcomingClass}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
          {upcomingClasses.map((classItem, index) => (
            <ClassCard
              key={`${classItem.courseCode}-${index}`}
              courseCode={classItem.courseCode}
              courseName={classItem.courseName}
              time={classItem.time}
              instructor={classItem.instructor}
              room={classItem.room}
              colors={colors}
              theme={theme}
              delay={300 + index * 100}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default TeacherDashboard;

import { TimelineClassCard } from '@/components/TimelineClassCard';
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
      flex: 1,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    profileButton: {
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
    timelineContainer: {
      marginTop: 16,
    },
  });

const classesData = [
  {
    time: '09:00 AM',
    courseCode: 'PSY-101',
    courseName: 'Introduction to Psychology',
    room: 'Room 304',
    instructor: 'Prof. Ada Lovelace',
    duration: '90 min',
    status: 'on-time' as const,
  },
  {
    time: '11:00 AM',
    courseCode: 'CS-301',
    courseName: 'Advanced Algorithms',
    room: 'Room 112',
    instructor: 'Prof. Alan Turing',
    duration: '50 min',
    status: 'cancelled' as const,
  },
  {
    time: '12:00 PM',
    courseCode: 'MATH-205',
    courseName: 'Linear Algebra',
    room: 'Hall A',
    instructor: 'Prof. Emmy Noether',
    duration: '60 min',
    status: 'upcoming' as const,
  },
];

export const ClassesScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

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
        entering={FadeInDown.delay(0)}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="school" size={24} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Atma Mobile</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={handleProfilePress}>
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
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.titleSection}>
          <Text style={styles.mainTitle}>Classes</Text>
          <Text style={styles.subtitle}>Your scheduled classes — tap a class for details.</Text>
        </Animated.View>

        {/* Timeline Classes */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.timelineContainer}>
          {classesData.map((classItem, index) => (
            <TimelineClassCard
              key={`${classItem.courseCode}-${index}`}
              courseCode={classItem.courseCode}
              courseName={classItem.courseName}
              room={classItem.room}
              instructor={classItem.instructor}
              duration={classItem.duration}
              status={classItem.status}
              colors={colors}
              theme={theme}
              showConnector={index < classesData.length - 1}
              delay={300 + index * 100}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ClassesScreen;

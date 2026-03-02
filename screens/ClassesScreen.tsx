import { TimelineClassCard } from '@/components/TimelineClassCard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatTime, getTodaysClassesWithStatus } from '@/lib/dashboard-service';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
  // This will be populated with real data from database
];

export const ClassesScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!userProfile?.id || !userProfile?.university_id) {
        console.warn('[ClassesScreen] Missing user profile data');
        setIsLoading(false);
        return;
      }

      try {
        const classesWithStatus = await getTodaysClassesWithStatus(
          userProfile.id,
          userProfile.university_id
        );
        
        setClasses(classesWithStatus);
        console.log('[ClassesScreen] Loaded', classesWithStatus.length, 'classes');
      } catch (error) {
        console.error('[ClassesScreen] Error fetching classes:', error);
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
            <View style={[styles.headerIcon, { borderRadius: 10, width: 40, height: 40, overflow: 'hidden' }]}>
              <Image
                source={require('@/assets/images/ATMA-inApp.png')}
                style={{ width: 40, height: 40, borderRadius: 10 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>ATMA</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={handleProfilePress}>
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
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : classes.length > 0 ? (
            classes.map((classItem, index) => {
              // Calculate duration
              const [startHour, startMin] = classItem.start_time.split(':');
              const [endHour, endMin] = classItem.end_time.split(':');
              const startTotalMin = parseInt(startHour) * 60 + parseInt(startMin);
              const endTotalMin = parseInt(endHour) * 60 + parseInt(endMin);
              const durationMin = endTotalMin - startTotalMin;
              const duration = durationMin > 0 ? `${durationMin} min` : 'N/A';

              // Get instructor names
              const instructorName = classItem.instructor_names && classItem.instructor_names.length > 0
                ? classItem.instructor_names.join(', ')
                : 'Instructor';

              // Get building info
              const building = classItem.room?.building?.name ? ` - ${classItem.room.building.name}` : '';

              return (
                <TimelineClassCard
                  key={`${classItem.id}-${index}`}
                  courseCode={classItem.course?.code || 'Unknown'}
                  courseName={classItem.course?.name || 'Unknown Course'}
                  room={classItem.room?.room_name || classItem.room?.room_number || 'TBA'}
                  building={building}
                  instructor={instructorName}
                  duration={duration}
                  status={classItem.status}
                  colors={colors}
                  theme={theme}
                  showConnector={index < classes.length - 1}
                  delay={300 + index * 100}
                  time={formatTime(classItem.start_time)}
                  totpCode={classItem.totp_code}
                  codeShared={classItem.totp_code_shared}
                  attendanceMarkingEnabled={classItem.attendance_marking_enabled}
                  sessionId={classItem.id}
                  studentId={userProfile?.id}
                  universityId={userProfile?.university_id}
                  onAttendanceMarked={(success) => {
                    if (success) {
                      // Optionally refresh the list
                      console.log('[ClassesScreen] Attendance marked, could refresh list here');
                    }
                  }}
                />
              );
            })
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                No classes scheduled for today
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ClassesScreen;

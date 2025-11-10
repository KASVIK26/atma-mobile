import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
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

interface TeacherSession {
  id: string;
  className: string;
  courseCode: string;
  status: 'active' | 'history';
}

interface AttendanceHistory {
  id: string;
  date: string;
  className: string;
  attendancePercentage: number;
  presentCount: number;
  totalCount: number;
  color: string;
}

const generateTeacherData = () => {
  return {
    activeSession: {
      id: '1',
      className: 'Introduction to Psychology',
      courseCode: 'PSYC 101',
      status: 'active',
    } as TeacherSession,
    history: [
      {
        id: '1',
        date: 'Oct 10, 2023',
        className: 'Introduction to Psychology',
        attendancePercentage: 93.75,
        presentCount: 30,
        totalCount: 32,
        color: '#10B981',
      },
      {
        id: '2',
        date: 'Oct 09, 2023',
        className: 'Advanced Calculus',
        attendancePercentage: 80,
        presentCount: 24,
        totalCount: 30,
        color: '#F59E0B',
      },
      {
        id: '3',
        date: 'Oct 08, 2023',
        className: 'History of Ancient Rome',
        attendancePercentage: 100,
        presentCount: 25,
        totalCount: 25,
        color: '#10B981',
      },
    ] as AttendanceHistory[],
  };
};

export const TeacherAttendanceHistoryScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [historyFilter, setHistoryFilter] = useState<'week' | 'classes' | 'completed'>('week');

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const data = generateTeacherData();

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
          <View style={styles.brandIcon}>
            <MaterialIcons name="school" size={24} color={colors.primary} />
          </View>
          <Text style={styles.brandText}>Atma Mobile</Text>
        </View>
        <Pressable style={{ width: 40, height: 40 }} onPress={handleProfilePress}>
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
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Session */}
        <Animated.View entering={FadeInDown.delay(50)}>
          <Text style={styles.sectionTitle}>Active Session</Text>
          <View style={styles.activeSessionCard}>
            <View style={styles.sessionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle}>{data.activeSession.className}</Text>
                <Text style={styles.sessionCode}>{data.activeSession.courseCode}</Text>
              </View>
              <View style={styles.ongoingBadge}>
                <View style={styles.ongoingDot} />
                <Text style={styles.ongoingText}>Ongoing</Text>
              </View>
            </View>
            <Pressable style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Manage Session</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Attendance History */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Attendance History</Text>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              { key: 'week', label: 'This Week' },
              { key: 'classes', label: 'All Classes' },
              { key: 'completed', label: 'Completed' },
            ].map((filter) => (
              <Pressable
                key={filter.key}
                style={[
                  styles.filterChip,
                  historyFilter === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setHistoryFilter(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    historyFilter === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                <MaterialIcons
                  name="expand-more"
                  size={18}
                  color={
                    historyFilter === filter.key
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </Pressable>
            ))}
          </ScrollView>

          {/* History Cards */}
          {data.history.map((record, index) => (
            <Animated.View key={record.id} entering={FadeInUp.delay(index * 100)}>
              <Pressable style={styles.historyCard}>
                <View style={styles.historyContent}>
                  <Text style={styles.historyDate}>{record.date}</Text>
                  <Text style={styles.historyTitle}>{record.className}</Text>
                  <View style={styles.attendanceBar}>
                    <View
                      style={[
                        styles.attendanceFill,
                        {
                          width: `${record.attendancePercentage}%`,
                          backgroundColor: record.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.attendanceText}>
                    {record.presentCount}/{record.totalCount}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default TeacherAttendanceHistoryScreen;

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
      paddingTop: 12,
      paddingBottom: 120,
    },
    filterContainer: {
      flexDirection: 'row',
      height: 48,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      padding: 6,
      marginBottom: 16,
    },
    filterButton: {
      flex: 1,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    attendanceCard: {
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
    attendanceCardHighlight: {
      borderWidth: 1,
      borderColor: colors.primary,
      shadowOpacity: 0.15,
      elevation: 4,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconPresent: {
      backgroundColor: colors.success + '20',
    },
    iconAbsent: {
      backgroundColor: colors.danger + '20',
    },
    iconLate: {
      backgroundColor: colors.warning + '20',
    },
    cardContent: {
      flex: 1,
      gap: 4,
    },
    courseName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    courseDate: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: colors.textPrimary,
    },
    statusPresent: {
      backgroundColor: colors.success + '20',
    },
    statusAbsent: {
      backgroundColor: colors.danger + '20',
    },
    statusLate: {
      backgroundColor: colors.warning + '20',
    },
    detailSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 12,
    },
    detailTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
    detailValue: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    mapContainer: {
      height: 120,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 8,
      backgroundColor: colors.backgroundAlt,
    },
    mapImage: {
      width: '100%',
      height: '100%',
    },
  });

interface AttendanceRecord {
  id: string;
  courseName: string;
  courseDate: string;
  courseTime: string;
  status: 'present' | 'absent' | 'late';
  device?: string;
  location?: string;
  checkInTime?: string;
  lateMinutes?: number;
  mapImage?: string;
}

const generateAttendanceData = (): AttendanceRecord[] => {
  return [
    {
      id: '1',
      courseName: 'Advanced Calculus',
      courseDate: 'Oct 26, 2023',
      courseTime: '09:05 AM',
      status: 'present',
    },
    {
      id: '2',
      courseName: 'Intro to Physics',
      courseDate: 'Oct 25, 2023',
      courseTime: '11:00 AM',
      status: 'absent',
    },
    {
      id: '3',
      courseName: 'History of Art',
      courseDate: 'Oct 24, 2023',
      courseTime: '01:12 PM',
      status: 'late',
      device: 'iPhone 14 Pro',
      location: 'Main Library',
      checkInTime: '01:12 PM',
      lateMinutes: 12,
      mapImage: 'require data-location check in from university main library',
    },
    {
      id: '4',
      courseName: 'Organic Chemistry Lab',
      courseDate: 'Oct 23, 2023',
      courseTime: '02:01 PM',
      status: 'present',
    },
  ];
};

export const StudentAttendanceHistoryScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [filterMode, setFilterMode] = useState<'week' | 'month'>('week');
  const [expandedId, setExpandedId] = useState<string | null>('3');

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const attendanceRecords = generateAttendanceData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'absent':
        return 'cancel';
      case 'late':
        return 'error';
      default:
        return 'help';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return colors.success;
      case 'absent':
        return colors.danger;
      case 'late':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Late';
      default:
        return 'Unknown';
    }
  };

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

      {/* Title */}
      <Animated.View entering={FadeInDown.delay(50)} style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 }}>
          Attendance History
        </Text>
      </Animated.View>

      {/* Filter Toggle */}
      <Animated.View entering={FadeInDown.delay(100)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={styles.filterContainer}>
          {['week', 'month'].map((mode) => (
            <Pressable
              key={mode}
              style={[styles.filterButton, filterMode === mode && styles.filterButtonActive]}
              onPress={() => setFilterMode(mode as 'week' | 'month')}
            >
              <Text
                style={[
                  styles.filterText,
                  filterMode === mode && styles.filterTextActive,
                ]}
              >
                {mode === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Attendance Records */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {attendanceRecords.map((record, index) => (
          <Animated.View key={record.id} entering={FadeInUp.delay(index * 100)}>
            <Pressable
              style={[
                styles.attendanceCard,
                expandedId === record.id && styles.attendanceCardHighlight,
              ]}
              onPress={() =>
                setExpandedId(expandedId === record.id ? null : record.id)
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  record.status === 'present' && styles.iconPresent,
                  record.status === 'absent' && styles.iconAbsent,
                  record.status === 'late' && styles.iconLate,
                ]}
              >
                <MaterialIcons
                  name={getStatusIcon(record.status) as any}
                  size={24}
                  color={getStatusColor(record.status)}
                />
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.courseName}>{record.courseName}</Text>
                <Text style={styles.courseDate}>{record.courseDate} - {record.courseTime}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  record.status === 'present' && styles.statusPresent,
                  record.status === 'absent' && styles.statusAbsent,
                  record.status === 'late' && styles.statusLate,
                ]}
              >
                <Text style={styles.statusText}>{getStatusLabel(record.status)}</Text>
              </View>
            </Pressable>

            {/* Detail Section for Late */}
            {expandedId === record.id && record.status === 'late' && (
              <Animated.View
                entering={FadeInUp}
                style={[
                  styles.attendanceCard,
                  styles.detailSection,
                  { marginBottom: 12, marginTop: -8 },
                ]}
              >
                <View style={{ width: '100%' }}>
                  <Text style={styles.detailTitle}>Check-in Details</Text>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Check-in Time:</Text>
                    <Text style={styles.detailValue}>
                      {record.checkInTime} ({record.lateMinutes} mins late)
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="smartphone" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Device:</Text>
                    <Text style={styles.detailValue}>{record.device}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{record.location}</Text>
                  </View>

                  <View style={styles.mapContainer}>
                    <View style={{ flex: 1, backgroundColor: colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="map" size={48} color={colors.textSecondary} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                        Map Preview
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

export default StudentAttendanceHistoryScreen;

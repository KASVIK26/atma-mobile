import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface TimelineClassCardProps {
  courseCode: string;
  courseName: string;
  room: string;
  building?: string;
  instructor: string;
  duration: string;
  status: 'on-time' | 'cancelled' | 'upcoming' | 'ongoing' | 'completed';
  colors: any;
  theme: string;
  showConnector?: boolean;
  delay?: number;
  time: string;
  totpCode?: string;
  codeShared?: boolean;
  attendanceMarkingEnabled?: boolean;
  sessionId?: string;
  studentId?: string;
  universityId?: string; // Required for multi-layer validation
  onAttendanceMarked?: (success: boolean) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 40,
    },
    timelineContainer: {
      flexDirection: 'row',
      gap: 20,
      alignItems: 'flex-start',
    },
    timelineLeft: {
      alignItems: 'center',
      width: 70,
      paddingTop: 8,
    },
    time: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      borderWidth: 4,
      borderColor: colors.background,
    },
    dotCompleted: {
      backgroundColor: colors.success,
    },
    dotCancelled: {
      backgroundColor: colors.danger,
    },
    dotOnTime: {
      backgroundColor: colors.warning,
    },
    connector: {
      position: 'absolute',
      top: 40,
      left: 8,
      width: 2,
      height: 200,
      backgroundColor: colors.border,
    },
    cardContainer: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    cardContainerCompleted: {
      borderLeftColor: colors.success,
    },
    cardContainerCancelled: {
      borderLeftColor: colors.danger,
    },
    cardContainerOnTime: {
      borderLeftColor: colors.warning,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
      gap: 10,
    },
    courseInfo: {
      flex: 1,
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    durationBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      minWidth: 70,
      alignItems: 'center',
    },
    durationText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
    },
    detailIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
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
    totpSection: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    totpLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    totpCode: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 4,
      fontFamily: 'monospace',
    },
    totpExpiry: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
      fontWeight: '500',
    },
    statusContainer: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    actionButton: {
      marginTop: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    actionButtonPrimary: {
      backgroundColor: '#2563EB',
    },
    actionButtonSecondary: {
      backgroundColor: '#10B981',
    },
    actionButtonDisabled: {
      backgroundColor: '#D1D5DB',
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    buildingText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '400',
      marginTop: 2,
    },
  });

const getStatusColor = (status: string, colors: any) => {
  switch (status) {
    case 'on-time':
      return colors.warning;
    case 'cancelled':
      return colors.danger;
    case 'ongoing':
      return colors.success;
    case 'completed':
      return colors.success;
    case 'upcoming':
      return colors.primary;
    default:
      return colors.primary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'on-time':
      return 'On-time';
    case 'cancelled':
      return 'Cancelled';
    case 'ongoing':
      return 'Ongoing';
    case 'completed':
      return 'Completed';
    case 'upcoming':
      return 'Upcoming';
    default:
      return 'Upcoming';
  }
};

export const TimelineClassCard: React.FC<TimelineClassCardProps> = ({
  courseCode,
  courseName,
  room,
  building,
  instructor,
  duration,
  status,
  colors,
  theme,
  showConnector = true,
  delay = 0,
  time,
  totpCode,
  codeShared = false,
  attendanceMarkingEnabled = false,
  sessionId,
  studentId,
  universityId,
  onAttendanceMarked,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor = getStatusColor(status, colors);
  const statusLabel = getStatusLabel(status);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const getCardContainerStyle = () => {
    switch (status) {
      case 'ongoing':
        return styles.cardContainerCompleted;
      case 'completed':
        return styles.cardContainerCompleted;
      case 'cancelled':
        return styles.cardContainerCancelled;
      case 'on-time':
        return styles.cardContainerOnTime;
      default:
        return {};
    }
  };

  const getDotStyle = () => {
    switch (status) {
      case 'ongoing':
        return styles.dotCompleted;
      case 'completed':
        return styles.dotCompleted;
      case 'cancelled':
        return styles.dotCancelled;
      case 'on-time':
        return styles.dotOnTime;
      default:
        return {};
    }
  };

  const handleMarkAttendance = async () => {
    if (!sessionId || !studentId || !universityId || attendanceMarked) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setIsMarkingAttendance(true);

    try {
      // Dynamic import to avoid circular dependency
      const { markAttendance } = await import('@/lib/dashboard-service');
      
      // Call markAttendance with multi-layer validation support
      // Note: GPS and pressure data would be collected from device sensors
      // For now, passing null - update when sensor integration is ready
      const result = await markAttendance(
        studentId,
        sessionId,
        universityId,
        totpCode,      // TOTP code to validate
        undefined,     // gpsLatitude - from device when available
        undefined,     // gpsLongitude - from device when available
        undefined      // pressureValue - from barometer when available
      );

      if (result.success) {
        setAttendanceMarked(true);
        Alert.alert('Success', result.message);
        onAttendanceMarked?.(true);
      } else {
        Alert.alert('Error', result.message);
        onAttendanceMarked?.(false);
      }
    } catch (error) {
      console.error('[TimelineClassCard] Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
      onAttendanceMarked?.(false);
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(delay)} style={styles.container}>
      <View style={styles.timelineContainer}>
        <View style={styles.timelineLeft}>
          <Text style={styles.time}>{time}</Text>
          <View style={[styles.dot, getDotStyle()]} />
          {showConnector && <View style={styles.connector} />}
        </View>
        <View style={[styles.cardContainer, getCardContainerStyle()]}>
          <View style={styles.cardHeader}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseCode}>{courseCode}</Text>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {courseName}
              </Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsRow}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="location-on" size={12} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailText}>{room}</Text>
              {building && <Text style={styles.buildingText}>{building}</Text>}
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="person" size={12} color={colors.primary} />
            </View>
            <Text style={styles.detailText}>{instructor}</Text>
          </View>

          {codeShared && totpCode && (
            <View style={styles.totpSection}>
              <Text style={styles.totpLabel}>TOTP Code</Text>
              <Text style={styles.totpCode}>{totpCode}</Text>
              <Text style={styles.totpExpiry}>Instructor shared this code</Text>
            </View>
          )}

          {attendanceMarkingEnabled && !attendanceMarked && (
            <Pressable
              style={[
                styles.actionButton,
                styles.actionButtonSecondary,
                isMarkingAttendance && styles.actionButtonDisabled,
              ]}
              onPress={handleMarkAttendance}
              disabled={isMarkingAttendance || attendanceMarked}
            >
              {isMarkingAttendance ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Attendance</Text>
                </>
              )}
            </Pressable>
          )}

          {attendanceMarked && (
            <View style={[styles.actionButton, styles.actionButtonSecondary]}>
              <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Attendance Marked</Text>
            </View>
          )}

          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

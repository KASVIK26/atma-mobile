import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface TimelineClassCardProps {
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  duration: string;
  status: 'on-time' | 'cancelled' | 'upcoming';
  colors: any;
  theme: string;
  showConnector?: boolean;
  delay?: number;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 32,
    },
    timelineContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    timelineLeft: {
      alignItems: 'center',
      width: 60,
    },
    time: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
      borderWidth: 4,
      borderColor: colors.background,
    },
    dotInactive: {
      backgroundColor: colors.border,
    },
    connector: {
      position: 'absolute',
      top: 32,
      left: 7.5,
      width: 1,
      height: 168,
      backgroundColor: colors.border,
    },
    cardContainer: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    courseTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    durationBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    durationText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    courseCode: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    instructor: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });

const getStatusColor = (status: string, colors: any) => {
  switch (status) {
    case 'on-time':
      return colors.success;
    case 'cancelled':
      return colors.danger;
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
  instructor,
  duration,
  status,
  colors,
  theme,
  showConnector = true,
  delay = 0,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor = getStatusColor(status, colors);
  const statusLabel = getStatusLabel(status);
  const isInactive = status === 'upcoming';

  return (
    <Animated.View entering={FadeInUp.delay(delay)} style={styles.container}>
      <View style={styles.timelineContainer}>
        <View style={styles.timelineLeft}>
          <Text style={styles.time}>{courseCode.split('-')[0]}</Text>
          <View style={[styles.dot, isInactive && styles.dotInactive]} />
          {showConnector && <View style={styles.connector} />}
        </View>
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {courseName}
            </Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          </View>
          <Text style={styles.courseCode}>{courseCode} • {room}</Text>
          <Text style={styles.instructor}>{instructor}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

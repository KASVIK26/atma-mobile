import { LectureSessionExtended, calculateDuration, formatTime, getStatusColor, getStatusLabel } from '@/lib/schedule-service';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SessionBlockProps {
  session: LectureSessionExtended;
  isFirstItem?: boolean;
  colors: any;
  index?: number;
}

/**
 * Reusable session block component for displaying lecture session information
 * Used in both daily and weekly views
 */
export const SessionBlock: React.FC<SessionBlockProps> = ({
  session,
  isFirstItem = false,
  colors,
  index = 0,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const duration = calculateDuration(session.start_time, session.end_time);
  const formattedStartTime = formatTime(session.start_time);
  const formattedEndTime = formatTime(session.end_time);
  const statusLabel = getStatusLabel(session.session_status);
  const statusColor = getStatusColor(session.session_status, colors);

  // Get instructor names
  const instructorNames = session.instructors
    ?.map((ins) => ins.name)
    .join(', ') || 'No instructor';

  // Get room info
  const roomInfo = session.room?.room_name || session.room?.room_number
    ? session.room?.building?.name
      ? `${session.room.room_name || session.room.room_number}, ${session.room.building.name}`
      : session.room.room_name || session.room.room_number
    : 'No room assigned';

  console.log(
    `[SessionBlock] Rendering session ${session.course?.name || 'Course'} - Room: ${roomInfo}, Building: ${session.room?.building?.name || 'N/A'}`
  );

  const showTOTPIndicator = session.totp_required && session.session_status === 'active';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={[styles.container, !isFirstItem && styles.containerMargin]}
    >
      <View style={styles.card}>
        {/* Header: Course Title and Status Badge */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {session.course?.name || 'Course'}
            </Text>
            {showTOTPIndicator && (
              <View style={[styles.totpBadge, { backgroundColor: colors.danger + '15' }]}>
                <View style={[styles.totpDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.totpText, { color: colors.danger }]}>TOTP Active</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '15' },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Course Code */}
        <Text style={styles.courseCode}>
          {session.course?.code || 'CODE'}
        </Text>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          {/* Time */}
          <View style={styles.detailRow}>
            <MaterialIcons
              name="schedule"
              size={16}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formattedStartTime} - {formattedEndTime} ({duration} mins)
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.detailRow}>
            <MaterialIcons
              name="location-on"
              size={16}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {roomInfo}
              </Text>
            </View>
          </View>

          {/* Instructor */}
          <View style={styles.detailRow}>
            <MaterialIcons
              name="person"
              size={16}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Instructor</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {instructorNames}
              </Text>
            </View>
          </View>

          {/* Late Policy - only show if applicable */}
          {session.max_late_minutes > 0 && (
            <View style={styles.detailRow}>
              <MaterialIcons
                name="access-time"
                size={16}
                color={colors.warning}
                style={styles.detailIcon}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Late Policy</Text>
                <Text style={styles.detailValue}>
                  Max late: {session.max_late_minutes} mins
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Special Class Indicator */}
        {session.is_special_class && (
          <View
            style={[
              styles.specialClassIndicator,
              { backgroundColor: colors.primary + '10', borderColor: colors.primary },
            ]}
          >
            <MaterialIcons
              name="star"
              size={14}
              color={colors.primary}
              style={styles.specialIcon}
            />
            <Text style={[styles.specialText, { color: colors.primary }]}>
              Special Class
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    containerMargin: {
      marginTop: 12,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    titleContainer: {
      flex: 1,
      gap: 8,
    },
    courseTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
      minWidth: 100,
      justifyContent: 'center',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    totpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    totpDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    totpText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    courseCode: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailsSection: {
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    detailIcon: {
      marginTop: 4,
      minWidth: 16,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      marginTop: 2,
    },
    specialClassIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
      borderWidth: 1,
      gap: 8,
    },
    specialIcon: {
      marginTop: 2,
    },
    specialText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

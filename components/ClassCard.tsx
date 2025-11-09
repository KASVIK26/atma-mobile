import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface ClassCardProps {
  courseCode: string;
  courseName: string;
  time: string;
  instructor?: string;
  room?: string;
  colors: any;
  delay?: number;
  onPress?: () => void;
  theme: 'light' | 'dark';
}

export const ClassCard: React.FC<ClassCardProps> = ({
  courseCode,
  courseName,
  time,
  instructor,
  room,
  colors,
  delay = 0,
  onPress,
  theme,
}) => {
  const styles = getStyles(colors, theme);

  return (
    <Animated.View entering={FadeInUp.delay(delay)}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
      >
        <View style={styles.cardHeader}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{courseCode}</Text>
            <Text style={styles.courseName} numberOfLines={2}>
              {courseName}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialIcons name="schedule" size={20} color={colors.primary} />
            <Text style={styles.time}>{time}</Text>
          </View>
        </View>

        {(instructor || room) && (
          <View style={styles.cardFooter}>
            {instructor && (
              <View style={styles.footerItem}>
                <MaterialIcons name="person" size={16} color={colors.textSecondary} />
                <Text style={styles.footerText}>{instructor}</Text>
              </View>
            )}
            {room && (
              <View style={styles.footerItem}>
                <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                <Text style={styles.footerText}>{room}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const getStyles = (colors: any, theme: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme === 'dark' ? '#E19B8B' : colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: theme === 'dark' ? '#D41414' : colors.primary,
    },
    cardPressed: {
      opacity: 0.7,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    courseInfo: {
      flex: 1,
    },
    courseCode: {
      fontSize: 12,
      fontWeight: '600',
      color: theme === 'dark' ? '#D41414' : colors.primary,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    courseName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme === 'dark' ? '#1F2937' : colors.textPrimary,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : colors.inputBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    time: {
      fontSize: 13,
      fontWeight: '600',
      color: theme === 'dark' ? '#1F2937' : colors.textPrimary,
    },
    cardFooter: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : colors.border,
      gap: 8,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });

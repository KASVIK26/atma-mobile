import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface UpcomingClassCardProps {
  time: string;
  courseCode: string;
  courseName: string;
  location: string;
  colors: any;
  theme: string;
  isPrimary?: boolean;
  delay?: number;
}

const createStyles = (colors: any, isPrimary: boolean) =>
  StyleSheet.create({
    card: {
      width: 260,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      backgroundColor: isPrimary ? colors.primary : colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isPrimary ? 0.15 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    time: {
      fontSize: 16,
      fontWeight: '700',
      color: isPrimary ? '#FFFFFF' : colors.textPrimary,
    },
    arrowIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.2)' : colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseCode: {
      fontSize: 16,
      fontWeight: '700',
      color: isPrimary ? '#FFFFFF' : colors.textPrimary,
      marginBottom: 4,
    },
    courseName: {
      fontSize: 13,
      color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 8,
    },
    location: {
      fontSize: 13,
      color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary,
      fontWeight: '500',
    },
  });

export const UpcomingClassCard: React.FC<UpcomingClassCardProps> = ({
  time,
  courseCode,
  courseName,
  location,
  colors,
  theme,
  isPrimary = false,
  delay = 0,
}) => {
  const styles = useMemo(
    () => createStyles(colors, isPrimary),
    [colors, isPrimary]
  );

  return (
    <Animated.View entering={FadeInUp.delay(delay)}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.time}>{time}</Text>
          <View style={styles.arrowIcon}>
            <MaterialIcons
              name="arrow-forward"
              size={16}
              color={isPrimary ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
        </View>

        <View>
          <Text style={styles.courseCode}>{courseCode}</Text>
          <Text style={styles.courseName}>{courseName}</Text>
        </View>

        <View style={styles.footer}>
          <MaterialIcons
            name="location-on"
            size={14}
            color={isPrimary ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary}
          />
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

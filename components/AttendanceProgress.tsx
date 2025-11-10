import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AttendanceProgressProps {
  percentage: number;
  colors: any;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    percentage: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
  });

export const AttendanceProgress: React.FC<AttendanceProgressProps> = ({
  percentage,
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Weekly Attendance</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%` },
          ]}
        />
      </View>
    </View>
  );
};

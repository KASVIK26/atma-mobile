import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface AttendanceStepBarometerProps {
  expectedAltitude: number;
  onComplete: (verified: boolean) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    infoBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    readingsContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      gap: 12,
    },
    readingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    readingLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    readingValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      fontFamily: 'monospace',
    },
    statusBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    statusIcon: {
      fontSize: 48,
      marginBottom: 8,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    statusSubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSuccess: {
      backgroundColor: colors.success,
    },
    buttonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoAlert: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: 12,
      marginBottom: 12,
    },
    alertRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    alertText: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export const AttendanceStepBarometer: React.FC<AttendanceStepBarometerProps> = ({
  expectedAltitude,
  onComplete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [readings, setReadings] = useState<{
    pressure: string;
    altitude: string;
    difference: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckBarometer = async () => {
    setIsChecking(true);
    setError(null);

    try {
      // TODO: Implement actual barometer checking
      // 1. Request sensor permission if needed
      // 2. Read barometer pressure from device
      // 3. Calculate altitude from pressure
      // 4. Compare with expected room altitude
      // 5. Set verified if within tolerance

      // Simulate checking
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock readings
      const mockPressure = (101.325 + Math.random() * 2).toFixed(3);
      const mockAltitude = (expectedAltitude + Math.random() * 10 - 5).toFixed(1);
      const mockDifference = (Math.abs(parseFloat(mockAltitude) - expectedAltitude)).toFixed(1);

      setReadings({
        pressure: mockPressure + ' kPa',
        altitude: mockAltitude + ' m',
        difference: mockDifference + ' m',
      });

      // Verify if within tolerance (5 meters)
      const verified = parseFloat(mockDifference) < 5;
      setIsVerified(verified);
      onComplete(verified);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read barometer';
      setError(errorMessage);
      onComplete(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Expected Altitude */}
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Expected Room Altitude</Text>
        <Text style={styles.infoValue}>{expectedAltitude} m (approx.)</Text>
      </View>

      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <View style={styles.alertRow}>
          <MaterialIcons name="info" size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.alertText}>
            Your device will measure atmospheric pressure to verify altitude
          </Text>
        </View>
      </View>

      {/* Readings */}
      {readings ? (
        <Animated.View entering={FadeIn} style={styles.readingsContainer}>
          <View style={styles.readingRow}>
            <Text style={styles.readingLabel}>Pressure Reading</Text>
            <Text style={styles.readingValue}>{readings.pressure}</Text>
          </View>
          <View style={styles.readingRow}>
            <Text style={styles.readingLabel}>Calculated Altitude</Text>
            <Text style={styles.readingValue}>{readings.altitude}</Text>
          </View>
          <View style={[styles.readingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.readingLabel}>Difference</Text>
            <Text
              style={[
                styles.readingValue,
                {
                  color: parseFloat(readings.difference) < 5 ? colors.success : colors.danger,
                },
              ]}
            >
              {readings.difference}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Status */}
      {isVerified ? (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="check-circle" size={48} color={colors.success} />
          <Text style={styles.statusText}>Altitude Verified!</Text>
          <Text style={styles.statusSubtext}>
            Your device is at the correct altitude for this classroom
          </Text>
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="error" size={48} color={colors.danger} />
          <Text style={styles.statusText}>Verification Failed</Text>
          <Text style={styles.statusSubtext}>{error}</Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          {isChecking ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.statusText}>Checking Barometer...</Text>
              <Text style={styles.statusSubtext}>Measuring atmospheric pressure</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="cloud" size={48} color={colors.primary} />
              <Text style={styles.statusText}>Ready to Check</Text>
              <Text style={styles.statusSubtext}>
                Click below to verify using device barometer
              </Text>
            </>
          )}
        </Animated.View>
      )}

      {/* Check Button */}
      <Pressable
        style={[
          styles.button,
          isVerified
            ? styles.buttonSuccess
            : isChecking
              ? styles.buttonDisabled
              : styles.buttonPrimary,
        ]}
        onPress={handleCheckBarometer}
        disabled={isChecking || isVerified}
      >
        {isChecking ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.buttonText}>Checking...</Text>
          </>
        ) : isVerified ? (
          <>
            <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Verified</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="speed" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Check Barometer</Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

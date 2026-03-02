import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface AttendanceStepGeolocationProps {
  lectureSessionId: string;
  universityId: string;
  onComplete: (verified: boolean, locationData?: any) => void;
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
    warningBox: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
      padding: 12,
      marginBottom: 12,
    },
    warningRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    warningText: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export const AttendanceStepGeolocation: React.FC<AttendanceStepGeolocationProps> = ({
  lectureSessionId,
  universityId,
  onComplete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('Loading...');
  const [distance, setDistance] = useState<number | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    // Fetch room data when component mounts
    const fetchRoomData = async () => {
      try {
        const { fetchRoomDataForSession } = await import('@/lib/geolocation-service');
        const data = await fetchRoomDataForSession(lectureSessionId, universityId);
        
        if (data) {
          setRoomData(data);
          setRoomName(data.room_name || `Room ${data.room_number}`);
        } else {
          setError('Could not fetch room details');
        }
      } catch (err) {
        console.error('[AttendanceStepGeolocation] Error fetching room data:', err);
        setError('Failed to load room information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [lectureSessionId, universityId]);

  const handleCheckLocation = async () => {
    if (!roomData) {
      setError('Room data not loaded');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const { getCurrentLocation, requestLocationPermissions, isInsideRoom } = await import('@/lib/geolocation-service');

      // Step 1: Request location permissions
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      // Step 2: Get current GPS location
      const location = await getCurrentLocation();
      if (!location) {
        throw new Error('Could not get device location. Please try again.');
      }

      // Step 3: Check if location is inside room (12m radius from center or polygon)
      const result = isInsideRoom(location, roomData.geofence_geojson!);
      const distanceValue = result.distance || 0;
      setDistance(distanceValue);

      // NEW RULE: 12m distance to center
      const isWithin12m = distanceValue <= 12;

      if (isWithin12m) {
        setIsVerified(true);
        // Pass location data to parent for attendance submission
        onComplete(true, location);
      } else {
        throw new Error(`You are ${distanceValue.toFixed(1)}m away from the classroom. Move closer and try again.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify location';
      setError(errorMessage);
      onComplete(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Room Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Expected Location</Text>
        <Text style={styles.infoValue}>
          {isLoading ? 'Loading...' : roomName}
        </Text>
        {distance !== null && (
          <Text style={[styles.infoValue, { marginTop: 8, fontSize: 12, color: colors.textSecondary }]}>
            Distance: {distance.toFixed(1)}m (12m required)
          </Text>
        )}
      </View>

      {/* Warning */}
      <View style={styles.warningBox}>
        <View style={styles.warningRow}>
          <MaterialIcons name="info" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
          <Text style={styles.warningText}>
            Ensure your device&apos;s location services are enabled before checking in
          </Text>
        </View>
      </View>

      {/* Status */}
      {isVerified ? (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="check-circle" size={48} color={colors.success} />
          <Text style={styles.statusText}>Location Verified!</Text>
          <Text style={styles.statusSubtext}>
            You are within {distance?.toFixed(1)}m of the classroom
          </Text>
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="location-off" size={48} color={colors.danger} />
          <Text style={styles.statusText}>Location Not Verified</Text>
          <Text style={styles.statusSubtext}>{error}</Text>
        </Animated.View>
      ) : isLoading ? (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>Loading Room Details</Text>
          <Text style={styles.statusSubtext}>
            Fetching classroom location from server
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="location-searching" size={48} color={colors.warning} />
          <Text style={styles.statusText}>Device Location</Text>
          <Text style={styles.statusSubtext}>
            Click the button below to verify your location
          </Text>
        </Animated.View>
      )}

      {/* Check Button */}
      <Pressable
        style={[
          styles.button,
          isVerified
            ? styles.buttonSuccess
            : isChecking || isLoading
              ? styles.buttonDisabled
              : styles.buttonPrimary,
        ]}
        onPress={handleCheckLocation}
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
            <MaterialIcons name="my-location" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Check Location</Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

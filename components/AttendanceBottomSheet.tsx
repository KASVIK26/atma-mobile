import { useTheme } from '@/context/ThemeContext';
import { ClassWithStatus } from '@/lib/dashboard-service';
import supabase from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttendanceStepBarometer } from './AttendanceSteps/AttendanceStepBarometer';
import { AttendanceStepGeolocation } from './AttendanceSteps/AttendanceStepGeolocation';
import { AttendanceStepTOTP } from './AttendanceSteps/AttendanceStepTOTP';

interface AttendanceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  session: ClassWithStatus;
  studentId?: string;
  universityId?: string;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 10,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionInfo: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 0,
    },
    sessionCode: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sessionName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingBottom: 30,
    },
    stepsContainer: {
      gap: 20,
    },
    stepWrapper: {
      opacity: 1,
    },
    stepInactive: {
      opacity: 0.5,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    stepIndicator: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepIndicatorActive: {
      backgroundColor: colors.success,
    },
    stepIndicatorInactive: {
      backgroundColor: colors.border,
    },
    stepIndicatorText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepTitleContainer: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    stepSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    stepContent: {
      marginLeft: 52,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    submitButtonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.6,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 52,
    },
    completedText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
    },
  });

type AttendanceStep = 1 | 2 | 3;

export const AttendanceBottomSheet: React.FC<AttendanceBottomSheetProps> = ({
  isVisible,
  onClose,
  session,
  studentId,
  universityId,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentStep, setCurrentStep] = useState<AttendanceStep>(1);
  const [stepStates, setStepStates] = useState({
    geolocation: { completed: false, verified: false, data: null as any },
    barometer: { completed: false, verified: false, data: null as any },
    totp: { completed: false, code: '' },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGeolocationComplete = (verified: boolean, locationData?: any) => {
    setStepStates((prev) => ({
      ...prev,
      geolocation: { completed: true, verified, data: locationData },
    }));
    if (verified) {
      setCurrentStep(2);
    }
  };

  const handleBarometerComplete = (verified: boolean, barometerData?: any) => {
    setStepStates((prev) => ({
      ...prev,
      barometer: { completed: true, verified, data: barometerData },
    }));
    if (verified) {
      setCurrentStep(3);
    }
  };

  const handleTOTPComplete = (code: string) => {
    setStepStates((prev) => ({
      ...prev,
      totp: { completed: true, code },
    }));
  };

  const canSubmit =
    stepStates.geolocation.completed &&
    stepStates.totp.completed; // Barometer is optional since Expo doesn't support it

  const handleSubmit = async () => {
    if (!canSubmit || !studentId || !universityId || !session.id) return;

    setIsSubmitting(true);
    try {
      // Pre-check: Verify attendance hasn't already been marked (prevent duplicates)
      const existingRecord = await supabase
        .from('attendance_records')
        .select('id, attendance_status, validation_score')
        .eq('lecture_session_id', session.id)
        .eq('student_id', studentId)
        .order('marked_at', { ascending: false })
        .limit(1)
        .single();

      if (existingRecord.data) {
        const { attendance_status, validation_score } = existingRecord.data;
        
        // If marked as present, prevent duplicate
        if (attendance_status === 'present') {
          alert(`You have already marked attendance for this class with a score of ${validation_score}/100`);
          setIsSubmitting(false);
          onClose();
          return;
        }

        // Check max attempts (3 total allowed: 1 present + 2 retries for sensor issues)
        const { data: allAttempts } = await supabase
          .from('attendance_records')
          .select('id', { count: 'exact' })
          .eq('lecture_session_id', session.id)
          .eq('student_id', studentId);

        if (allAttempts && allAttempts.length >= 3) {
          alert('Maximum attendance marking attempts (3) reached for this class');
          setIsSubmitting(false);
          onClose();
          return;
        }
      }

      const { markAttendance } = await import('@/lib/attendance-service');
      const { fetchRoomDataForSession } = await import('@/lib/geolocation-service');
      const { getBarometerReading } = await import('@/lib/barometer-service');

      // Step 1: Fetch room data for geofence geometry
      console.log('[AttendanceBottomSheet] Fetching room data...');
      const roomData = await fetchRoomDataForSession(session.id, universityId);
      
      if (!roomData) {
        console.error('[AttendanceBottomSheet] Room data not found');
        alert('Error: Could not fetch room details');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Get GPS location from geolocation step
      const locationData = stepStates.geolocation.data;
      if (!locationData) {
        alert('GPS location verification failed');
        setIsSubmitting(false);
        return;
      }

      // Step 3: Get current barometer reading
      const barometerData = await getBarometerReading();
      const currentPressure = barometerData?.pressure || null;

      // Step 3b: Resolve pressure baseline.
      // Priority:
      //   1. Teacher's live barometer captured at "Start Attendance" (most accurate)
      //   2. buildings.surface_pressure_hpa updated hourly by Open-Meteo Edge Fn
      //   3. Static room baseline / ISA fallback
      let baselinePressure: number | null = null;

      if (session.teacher_baseline_pressure_hpa) {
        // Best: teacher device reading — same device-class offset, captured right here, right now
        baselinePressure = session.teacher_baseline_pressure_hpa;
        console.log(`[AttendanceBottomSheet] Using teacher baseline: ${baselinePressure.toFixed(2)} hPa`);
      } else {
        // Fallback: building's Open-Meteo surface pressure (hourly)
        baselinePressure = roomData.baseline_pressure_hpa ?? null;
        const buildingId = roomData.building?.id;
        if (buildingId) {
          try {
            const { getBuildingSurfacePressure } = await import('@/lib/pressure-service');
            const pressResult = await getBuildingSurfacePressure(buildingId);
            baselinePressure = pressResult.pressure_hpa;
            console.log(`[AttendanceBottomSheet] Fallback baseline: ${baselinePressure.toFixed(2)} hPa (${pressResult.source})`);
          } catch (pressErr) {
            console.warn('[AttendanceBottomSheet] Could not fetch live pressure, using static value:', pressErr);
          }
        }
      }

      // Step 4: Call markAttendance with all verification data
      console.log('[AttendanceBottomSheet] Submitting attendance with multi-layer verification...');
      const result = await markAttendance(
        session.id, // lectureSessionId
        studentId,
        universityId,
        locationData, // LocationCoordinates
        roomData.geofence_geojson, // RoomGeometry
        baselinePressure, // live baseline from DB
        currentPressure, // currentPressure
        stepStates.totp.code // studentTotpCode
      );

      if (result.success) {
        console.log('[AttendanceBottomSheet] ✅ Attendance marked successfully');
        alert(`✅ Attendance marked as ${result.verificationResult?.validation_score || 0}/100`);
        
        // Close sheet on success
        setTimeout(() => {
          onClose();
          // Reset state
          setCurrentStep(1);
          setStepStates({
            geolocation: { completed: false, verified: false, data: null },
            barometer: { completed: false, verified: false, data: null },
            totp: { completed: false, code: '' },
          });
        }, 500);
      } else {
        console.error('[AttendanceBottomSheet] Attendance marking failed:', result.message);
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('[AttendanceBottomSheet] Error marking attendance:', error);
      alert('Error marking attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView
          behavior="padding"
          enabled={Platform.OS === 'ios'}
          style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom }]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Verify Attendance</Text>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Session Info */}
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionCode}>{session.course?.code}</Text>
                <Text style={styles.sessionName} numberOfLines={1}>
                  {session.course?.name}
                </Text>
              </View>
            </View>

            {/* Steps — guarded: only shown after teacher starts the session */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollIndicatorInsets={{ right: 1 }}
              keyboardDismissMode="on-drag"
            >
              {!session.attendance_marking_enabled ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 16 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: '#F59E0B20',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <MaterialIcons name="hourglass-top" size={36} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                    Waiting for Teacher
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
                    {"Your instructor hasn't started the attendance session yet.\nOnce they press Start Attendance, you can begin marking."}
                  </Text>
                </View>
              ) : (
                <View style={styles.stepsContainer}>
                  {/* Step 1: Geolocation */}
                  <Animated.View
                    entering={FadeInUp.delay(100)}
                    style={[
                      styles.stepWrapper,
                      currentStep > 1 && styles.stepInactive,
                    ]}
                  >
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepIndicator,
                          stepStates.geolocation.completed
                            ? styles.stepIndicatorActive
                            : currentStep === 1
                              ? styles.stepIndicator
                              : styles.stepIndicatorInactive,
                        ]}
                      >
                        {stepStates.geolocation.completed ? (
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.stepIndicatorText}>1</Text>
                        )}
                      </View>
                      <View style={styles.stepTitleContainer}>
                        <Text style={styles.stepTitle}>Location Verification</Text>
                        <Text style={styles.stepSubtitle}>
                          {stepStates.geolocation.completed
                            ? 'Location verified'
                            : 'Check your classroom location'}
                        </Text>
                      </View>
                    </View>

                    {currentStep === 1 ? (
                      <View style={styles.stepContent}>
                        <AttendanceStepGeolocation
                          lectureSessionId={session.id}
                          universityId={universityId ?? ''}
                          onComplete={handleGeolocationComplete}
                        />
                      </View>
                    ) : (
                      stepStates.geolocation.completed && (
                        <View style={styles.completedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={colors.success} />
                          <Text style={styles.completedText}>Verified</Text>
                        </View>
                      )
                    )}
                  </Animated.View>

                  {/* Step 2: Barometer */}
                  <Animated.View
                    entering={FadeInUp.delay(200)}
                    style={[
                      styles.stepWrapper,
                      currentStep !== 2 && currentStep <= 1 && styles.stepInactive,
                    ]}
                  >
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepIndicator,
                          stepStates.barometer.completed
                            ? styles.stepIndicatorActive
                            : currentStep === 2
                              ? styles.stepIndicator
                              : styles.stepIndicatorInactive,
                        ]}
                      >
                        {stepStates.barometer.completed ? (
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.stepIndicatorText}>2</Text>
                        )}
                      </View>
                      <View style={styles.stepTitleContainer}>
                        <Text style={styles.stepTitle}>Altitude Verification</Text>
                        <Text style={styles.stepSubtitle}>
                          {stepStates.barometer.completed
                            ? 'Altitude verified'
                            : 'Verify using device barometer'}
                        </Text>
                      </View>
                    </View>

                    {currentStep === 2 ? (
                      <View style={styles.stepContent}>
                        <AttendanceStepBarometer
                          expectedAltitude={0}
                          onComplete={handleBarometerComplete}
                        />
                      </View>
                    ) : (
                      stepStates.barometer.completed && (
                        <View style={styles.completedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={colors.success} />
                          <Text style={styles.completedText}>Verified</Text>
                        </View>
                      )
                    )}
                  </Animated.View>

                  {/* Step 3: TOTP */}
                  <Animated.View
                    entering={FadeInUp.delay(300)}
                    style={[
                      styles.stepWrapper,
                      currentStep !== 3 && currentStep <= 2 && styles.stepInactive,
                    ]}
                  >
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepIndicator,
                          stepStates.totp.completed
                            ? styles.stepIndicatorActive
                            : currentStep === 3
                              ? styles.stepIndicator
                              : styles.stepIndicatorInactive,
                        ]}
                      >
                        {stepStates.totp.completed ? (
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.stepIndicatorText}>3</Text>
                        )}
                      </View>
                      <View style={styles.stepTitleContainer}>
                        <Text style={styles.stepTitle}>TOTP Code Verification</Text>
                        <Text style={styles.stepSubtitle}>
                          {stepStates.totp.completed
                            ? 'Code verified'
                            : 'Enter the code from your instructor'}
                        </Text>
                      </View>
                    </View>

                    {currentStep === 3 ? (
                      <View style={styles.stepContent}>
                        <AttendanceStepTOTP
                          onComplete={handleTOTPComplete}
                        />
                      </View>
                    ) : (
                      stepStates.totp.completed && (
                        <View style={styles.completedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={colors.success} />
                          <Text style={styles.completedText}>
                            {`Code: ${stepStates.totp.code}`}
                          </Text>
                        </View>
                      )
                    )}
                  </Animated.View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.buttonContainer, { paddingBottom: 16 }]}>
              <Pressable
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

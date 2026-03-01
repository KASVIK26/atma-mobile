import { AttendanceBottomSheet } from '@/components/AttendanceBottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BarometerReading, calculateFloorHeightFromPressure, estimateFloorNumber, subscribeToBarometer } from '@/lib/barometer-service';
import { ClassWithStatus, getTodaysClassesWithStatus } from '@/lib/dashboard-service';
import { getCurrentLocation } from '@/lib/geolocation-service';
import { getNearestBuildingSurfacePressure } from '@/lib/pressure-service';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TestVerificationResult {
  gpsStatus: 'pass' | 'fail' | 'skipped';
  baroStatus: 'pass' | 'fail' | 'skipped';
  totpStatus: 'skipped';
  gpsAccuracy: number | null;
  baroHpa: number | null;
  surfacePressureHpa: number | null;
  heightDiff: number | null;
  floor: number | null;
  score: number;
  overall: 'pass' | 'fail';
  timestamp: string;
}

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
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
      paddingBottom: 100,
    },
    titleSection: {
      marginBottom: 24,
    },
    mainTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    ongoingSessionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sessionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    badgeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.success,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      lineHeight: 24,
    },
    detailsGrid: {
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
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
    markButton: {
      marginTop: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.success,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    markButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyState: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
  });

export const MarkAttendanceScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [classes, setClasses] = useState<ClassWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ongoingSession, setOngoingSession] = useState<ClassWithStatus | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestVerificationResult | null>(null);
  const liveBaroRef = useRef<BarometerReading | null>(null);

  // Fetch today's classes and find ongoing one
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userProfile?.id || !userProfile?.university_id) {
        console.warn('[MarkAttendanceScreen] Missing user profile data');
        setIsLoading(false);
        return;
      }

      try {
        const classesWithStatus = await getTodaysClassesWithStatus(
          userProfile.id,
          userProfile.university_id,
          userProfile.role || 'student'  // Pass user's role for TOTP visibility
        );

        setClasses(classesWithStatus);

        // Find the ongoing session
        const ongoing = classesWithStatus.find((c) => c.status === 'ongoing');
        setOngoingSession(ongoing || null);

        console.log('[MarkAttendanceScreen] Loaded', classesWithStatus.length, 'classes');
        console.log('[MarkAttendanceScreen] All classes:', classesWithStatus.map(c => ({
          code: c.course?.code,
          status: c.status,
          time: `${c.start_time}-${c.end_time}`
        })));
        console.log('[MarkAttendanceScreen] Ongoing session:', ongoing?.course?.code || 'NONE');
        
        // If no ongoing session, use first upcoming for testing
        if (!ongoing && classesWithStatus.length > 0) {
          console.log('[MarkAttendanceScreen] No ongoing session - test mode enabled');
          setTestMode(true);
        }
      } catch (error) {
        console.error('[MarkAttendanceScreen] Error fetching classes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [userProfile?.id, userProfile?.university_id]);

  // Subscribe to barometer when in test mode so we have a reading ready
  useEffect(() => {
    if (!testMode) return;
    let unsub: (() => void) | null = null;
    subscribeToBarometer((reading) => { liveBaroRef.current = reading; }, 1000)
      .then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, [testMode]);

  // Run a local GPS + barometer verification without touching the DB
  const runTestVerification = useCallback(async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const loc = await getCurrentLocation();
      const gpsOk = loc !== null && loc.accuracy <= 30;

      const lat = loc?.latitude ?? 23.1765;
      const lon = loc?.longitude ?? 75.7885;
      // DB-first: nearest building's surface_pressure_hpa (updated hourly by Edge Fn)
      const pressResult = await getNearestBuildingSurfacePressure(lat, lon);
      const baseline = pressResult.pressure_hpa;
      console.log(`[MarkAttendance] Baseline pressure: ${baseline.toFixed(2)} hPa (${pressResult.source})`);

      const baro = liveBaroRef.current;
      let baroOk = false, heightDiff: number | null = null, floor: number | null = null;
      if (baro) {
        heightDiff = calculateFloorHeightFromPressure(baseline, baro.pressure);
        floor      = estimateFloorNumber(baseline, baro.pressure);
        baroOk     = Math.abs(heightDiff) <= 2.8;
      }

      const stepsChecked = (gpsOk ? 1 : 0) + (baro ? 1 : 0) + 0; // TOTP is always skipped
      const stepsPassed  = (gpsOk ? 1 : 0) + (baro && baroOk ? 1 : 0);

      setTestResult({
        gpsStatus:          loc ? (gpsOk ? 'pass' : 'fail') : 'fail',
        baroStatus:         baro ? (baroOk ? 'pass' : 'fail') : 'skipped',
        totpStatus:         'skipped',
        gpsAccuracy:        loc?.accuracy ?? null,
        baroHpa:            baro?.pressure ?? null,
        surfacePressureHpa: baseline,
        heightDiff,
        floor,
        score:              stepsPassed,
        overall:            gpsOk ? 'pass' : 'fail',
        timestamp:          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } catch (err) {
      console.error('[MarkAttendanceScreen] test verification error:', err);
    } finally {
      setTestRunning(false);
    }
  }, []);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const handleMarkAttendance = () => {
    if (ongoingSession) {
      setShowBottomSheet(true);
    }
  };

  const handleBottomSheetClose = () => {
    setShowBottomSheet(false);
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
        entering={FadeInDown.delay(0)}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons
              name="done-all"
              size={24}
              color={colors.success}
            />
            <Text style={styles.headerTitle}>Mark Attendance</Text>
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.titleSection}>
          <Text style={styles.mainTitle}>Check In</Text>
          <Text style={styles.subtitle}>Mark your attendance for your class</Text>
        </Animated.View>

        {/* Ongoing Session or Empty State */}
        <Animated.View entering={FadeInUp.delay(200)}>
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : ongoingSession || (testMode && classes.length > 0) ? (
            <View style={styles.ongoingSessionCard}>
              {/* Session Badge */}
              <View style={styles.sessionBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {testMode ? 'TEST MODE – No DB writes' : 'Currently Ongoing'}
                </Text>
              </View>

              {/* Course Info */}
              <Text style={styles.courseCode}>
                {(ongoingSession || classes[0])?.course?.code}
              </Text>
              <Text style={styles.courseTitle}>
                {(ongoingSession || classes[0])?.course?.name}
              </Text>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                {/* Time */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="access-time" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.detailText}>
                    {(ongoingSession || classes[0])?.start_time} - {(ongoingSession || classes[0])?.end_time}
                  </Text>
                </View>

                {/* Location */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="location-on" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailText}>
                      {(ongoingSession || classes[0])?.room?.room_name || 
                       (ongoingSession || classes[0])?.room?.room_number || 
                       'TBA'}
                    </Text>
                    {(ongoingSession || classes[0])?.room?.building?.name && (
                      <Text style={[styles.detailText, { fontSize: 12, marginTop: 2 }]}>
                        {(ongoingSession || classes[0])?.room.building.name}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Instructor */}
                {(ongoingSession || classes[0])?.instructor_names && (ongoingSession || classes[0])?.instructor_names?.length > 0 && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <MaterialIcons name="person" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.detailText}>
                      {(ongoingSession || classes[0])?.instructor_names?.join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mark Attendance / Test Button */}
              <Pressable
                style={[styles.markButton, testMode && { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (testMode) {
                    runTestVerification();
                  } else if (ongoingSession) {
                    setShowBottomSheet(true);
                  }
                }}
                disabled={testRunning}
              >
                <MaterialIcons
                  name={testRunning ? 'hourglass-empty' : testMode ? 'science' : 'check-circle'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.markButtonText}>
                  {testRunning ? 'Running diagnostics…' : testMode ? 'Run Sensor Diagnostics' : 'Mark Attendance'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="event-busy"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No Ongoing Classes</Text>
              <Text style={styles.emptySubtext}>
                You don't have any classes happening right now. Check back later!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Test Mode Result Card */}
        {testResult && (
          <Animated.View entering={FadeInUp.delay(100)}>
            {/* Overall banner */}
            <View style={{
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              backgroundColor: testResult.overall === 'pass' ? colors.success + '18' : '#FF3B30' + '12',
              borderWidth: 1,
              borderColor: testResult.overall === 'pass' ? colors.success + '40' : '#FF3B30' + '40',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <MaterialIcons
                  name={testResult.overall === 'pass' ? 'verified' : 'dangerous'}
                  size={28}
                  color={testResult.overall === 'pass' ? colors.success : '#FF3B30'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: testResult.overall === 'pass' ? colors.success : '#FF3B30' }}>
                    {testResult.overall === 'pass' ? 'Sensors Verified ✓' : 'Verification Failed'}
                  </Text>
                  <Text style={{ fontSize: 11, marginTop: 2, color: colors.textSecondary }}>
                    Test run at {testResult.timestamp} · No database writes
                  </Text>
                </View>
                <Pressable onPress={() => setTestResult(null)} style={{ padding: 6 }}>
                  <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Score */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.cardBackground }}>
                <MaterialIcons name="stars" size={20} color={testResult.score >= 2 ? colors.success : testResult.score === 1 ? colors.warning : '#FF3B30'} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: testResult.score >= 2 ? colors.success : testResult.score === 1 ? colors.warning : '#FF3B30' }}>
                  {testResult.score}/2 sensors verified
                </Text>
              </View>

              {/* Step 1: GPS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: testResult.gpsStatus === 'pass' ? colors.success : testResult.gpsStatus === 'fail' ? '#FF3B30' : colors.textTertiary }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>GPS Location</Text>
                  {testResult.gpsAccuracy != null && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                      Accuracy: {testResult.gpsAccuracy.toFixed(1)} m
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                  backgroundColor: testResult.gpsStatus === 'pass' ? colors.success + '22' : testResult.gpsStatus === 'fail' ? '#FF3B30' + '22' : colors.border }}>
                  <MaterialIcons
                    name={testResult.gpsStatus === 'pass' ? 'check-circle' : testResult.gpsStatus === 'fail' ? 'cancel' : 'schedule'}
                    size={13}
                    color={testResult.gpsStatus === 'pass' ? colors.success : testResult.gpsStatus === 'fail' ? '#FF3B30' : colors.textSecondary}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: testResult.gpsStatus === 'pass' ? colors.success : testResult.gpsStatus === 'fail' ? '#FF3B30' : colors.textSecondary }}>
                    {testResult.gpsStatus === 'pass' ? 'Passed' : testResult.gpsStatus === 'fail' ? 'Failed' : 'Skipped'}
                  </Text>
                </View>
              </View>

              {/* Step 2: Barometer */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: testResult.baroStatus === 'pass' ? colors.success : testResult.baroStatus === 'fail' ? '#FF3B30' : colors.warning }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Barometer / Floor</Text>
                  {testResult.baroHpa != null ? (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                      {testResult.baroHpa.toFixed(2)} hPa · {testResult.heightDiff != null ? `Δh ${testResult.heightDiff > 0 ? '+' : ''}${testResult.heightDiff.toFixed(1)} m` : ''}{testResult.floor != null ? ` · Floor ${testResult.floor}` : ''}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>No barometer reading</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                  backgroundColor: testResult.baroStatus === 'pass' ? colors.success + '22' : testResult.baroStatus === 'fail' ? '#FF3B30' + '22' : colors.warning + '22' }}>
                  <MaterialIcons
                    name={testResult.baroStatus === 'pass' ? 'check-circle' : testResult.baroStatus === 'fail' ? 'cancel' : 'remove-circle-outline'}
                    size={13}
                    color={testResult.baroStatus === 'pass' ? colors.success : testResult.baroStatus === 'fail' ? '#FF3B30' : colors.warning}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: testResult.baroStatus === 'pass' ? colors.success : testResult.baroStatus === 'fail' ? '#FF3B30' : colors.warning }}>
                    {testResult.baroStatus === 'pass' ? 'Passed' : testResult.baroStatus === 'fail' ? 'Failed' : 'Skipped'}
                  </Text>
                </View>
              </View>

              {/* Step 3: TOTP */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textTertiary }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>TOTP Code</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Verified in live attendance flow</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.warning + '22' }}>
                  <MaterialIcons name="remove-circle-outline" size={13} color={colors.warning} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>Skipped</Text>
                </View>
              </View>

              {/* Surface pressure info */}
              {testResult.surfacePressureHpa != null && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>
                    Surface pressure: {testResult.surfacePressureHpa.toFixed(2)} hPa (DB / Open-Meteo)
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Attendance Bottom Sheet */}
      {ongoingSession && (
        <AttendanceBottomSheet
          isVisible={showBottomSheet}
          onClose={handleBottomSheetClose}
          session={ongoingSession}
          studentId={userProfile?.id}
          universityId={userProfile?.university_id}
        />
      )}
    </View>
  );
};

export default MarkAttendanceScreen;

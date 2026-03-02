import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { TeacherCourseAttendance, getInstructorActiveSession, getTotpSessionForSession, startAttendanceSession } from '@/lib/attendance-service';
import { getBarometerReading } from '@/lib/barometer-service';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── TOTP helpers ─────────────────────────────────────────────────────────────
/** Full record from getTotpSessionForSession, including server-calibrated timing */
type TotpRecord = {
  code: string;
  expires_at: string;
  updated_at: string;
  /** ms remaining from the server's perspective at the moment we received the response */
  server_remaining_ms: number;
  /** device Date.now() snapshot when the fetch response arrived */
  fetch_time_ms: number;
  /** true after teacher pressed Start Attendance */
  attendance_marking_enabled: boolean;
  /** teacher's live barometer reading captured at session start (hPa) */
  teacher_baseline_pressure_hpa: number | null;
};

/**
 * Remaining seconds, anchored to server time (eliminates device clock drift).
 * elapsed = how long ago we fetched — subtracted from the server-calibrated remainder.
 */
function serverRemainingSec(r: TotpRecord): number {
  const elapsed = Date.now() - r.fetch_time_ms;
  return Math.max(0, Math.ceil((r.server_remaining_ms - elapsed) / 1000));
}

/**
 * Cron cycle is 60 seconds anchored to updated_at.
 * expires_at is unreliable (trigger bug) — ignore it for timing.
 */
const TOTP_CYCLE_SEC = 60;
function calcWindowSec(_r: TotpRecord): number { return TOTP_CYCLE_SEC; }

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 },
    sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    courseCode: { fontSize: 12, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    courseName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 2, marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border + '60' },
    infoLabel: { fontSize: 12, color: colors.textSecondary },
    infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    totpContainer: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      marginTop: 12,
      marginBottom: 12,
      alignItems: 'center',
      gap: 8,
    },
    totpLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
    totpCode: {
      fontSize: 40,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 8,
      fontFamily: 'monospace',
    },
    timerBar: { width: '100%', height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
    timerFill: { height: '100%', borderRadius: 2 },
    timerText: { fontSize: 13, fontWeight: '600' },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export const TeacherStartAttendanceScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { userProfile, instructor } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── session ────────────────────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<TeacherCourseAttendance | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── TOTP display state ─────────────────────────────────────────────────────
  const [totpCode,          setTotpCode]          = useState<string | null>(null);
  const [totpWindowSec,     setTotpWindowSec]     = useState(TOTP_CYCLE_SEC);
  const [totpTimeRemaining, setTotpTimeRemaining] = useState(0);

  // ── Attendance session state ───────────────────────────────────────────────
  const [attendanceEnabled,    setAttendanceEnabled]    = useState(false);
  const [isStartingAttendance, setIsStartingAttendance] = useState(false);
  const [startAttendanceError, setStartAttendanceError] = useState<string | null>(null);

  // ── internal refs (never cause re-renders) ─────────────────────────────────
  const sessionIdRef      = useRef<string | null>(null);
  const currentRecordRef  = useRef<TotpRecord | null>(null);   // full record for tick accuracy
  const prefetchTimer     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pollTimer         = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer         = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── cleanup helpers ────────────────────────────────────────────────────────
  const clearPrefetch = () => { if (prefetchTimer.current) { clearTimeout(prefetchTimer.current);  prefetchTimer.current = null; } };
  const clearPoll     = () => { if (pollTimer.current)     { clearInterval(pollTimer.current);     pollTimer.current    = null; } };
  const clearTick     = () => { if (tickTimer.current)     { clearInterval(tickTimer.current);     tickTimer.current    = null; } };
  const clearAll      = () => { clearPrefetch(); clearPoll(); clearTick(); };

  // ── core: apply a new TOTP record and arm the next pre-fetch ──────────────
  const applyTotp = useCallback((totp: TotpRecord) => {
    clearPrefetch();
    clearPoll();

    const windowSec  = calcWindowSec(totp);    // e.g. 30 s (from DB, drift-free)
    const remaining  = serverRemainingSec(totp);

    setTotpCode(totp.code);
    setTotpWindowSec(windowSec);
    setTotpTimeRemaining(remaining);
    setAttendanceEnabled(totp.attendance_marking_enabled);
    currentRecordRef.current = totp;

    // ── tick every 500 ms using server-calibrated remaining ─────────────────
    clearTick();
    tickTimer.current = setInterval(() => {
      const rec = currentRecordRef.current;
      if (rec) setTotpTimeRemaining(serverRemainingSec(rec));
    }, 500);

    // ── pre-fetch 2 s before server-side expiry ──────────────────────────────
    // server_remaining_ms already accounts for clock drift; use it as-is
    const prefetchDelay = Math.max(500, totp.server_remaining_ms - 2000);

    prefetchTimer.current = setTimeout(() => {
      if (!sessionIdRef.current) return;
      const prevUpdatedAt = totp.updated_at;
      let attempts = 0;

      pollTimer.current = setInterval(async () => {
        attempts++;
        if (attempts > 40) { clearPoll(); return; }   // give up after 20 s

        const fresh = await getTotpSessionForSession(sessionIdRef.current!);
        if (fresh && fresh.updated_at !== prevUpdatedAt) {
          clearPoll();
          applyTotp(fresh);
        }
      }, 500);
    }, prefetchDelay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fetch session + TOTP ───────────────────────────────────────────────────
  const fetchActiveSession = useCallback(async () => {
    if (!instructor?.id || !userProfile?.university_id) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const session = await getInstructorActiveSession(instructor.id, userProfile.university_id);
      setActiveSession(session);
      sessionIdRef.current = session?.id ?? null;

      // Always reset marking enabled from DB to stay in sync
      if (!session?.id) {
        setAttendanceEnabled(false);
      }

      if (session?.id) {
        // Always use getTotpSessionForSession — it calibrates against server clock
        const totp = await getTotpSessionForSession(session.id);
        if (totp) applyTotp(totp);
      }
    } catch (err) {
      console.error('[StartAttendance] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [instructor?.id, userProfile?.university_id, applyTotp]);

  useFocusEffect(
    useCallback(() => {
      setIsRefreshing(true);
      fetchActiveSession();
      return () => clearAll();          // stop all timers when screen blurs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchActiveSession])
  );

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
    return () => clearAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${period}`;
  };

  // colour: green → amber at last 33% of window → red at last 5 s
  const timerColor = totpTimeRemaining > totpWindowSec * 0.33
    ? colors.primary
    : totpTimeRemaining > 5
      ? '#F59E0B'
      : '#EF4444';

  // progress bar drains over the server-derived window (e.g. 30 s)
  const timerProgress = totpWindowSec > 0
    ? Math.max(0, Math.min(1, totpTimeRemaining / totpWindowSec))
    : 0;

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
        <View style={styles.headerBrand}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/ATMA-LOGO.png')}
              style={{ width: 40, height: 40, borderRadius: 10 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandText}>ATMA</Text>
        </View>
        <Pressable style={{ width: 40, height: 40 }} onPress={() => router.push('/(main)/profile' as any)}>
          <Image
            source={
              userProfile?.profile_picture_url && userProfile.profile_picture_url.trim().length > 0
                ? { uri: userProfile.profile_picture_url }
                : require('@/assets/images/profile-icon1.png')
            }
            style={styles.profileIcon}
            resizeMode="cover"
          />
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); fetchActiveSession(); }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.sectionTitle}>Active Session</Text>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeSession ? (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.card}>
            {/* Status + Title */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseCode}>{activeSession.course_code}</Text>
                <Text style={styles.courseName} numberOfLines={2}>{activeSession.course_name}</Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: activeSession.status === 'ongoing' ? '#EF444420' : '#F59E0B20'
              }]}>
                <Text style={[styles.statusText, {
                  color: activeSession.status === 'ongoing' ? '#EF4444' : '#F59E0B'
                }]}>
                  {activeSession.status === 'ongoing' ? '● ONGOING' : '◯ UPCOMING'}
                </Text>
              </View>
            </View>

            {/* Info Rows */}
            <View style={{ gap: 2, marginBottom: 4 }}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatTime(activeSession.start_time)} – {formatTime(activeSession.end_time)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {activeSession.room_name}{activeSession.building_name ? `, ${activeSession.building_name}` : ''}
                </Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Enrolled</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {activeSession.enrolled_count}
                </Text>
              </View>
            </View>

            {/* ── TOTP ─────────────────────────────────────────── */}
            {totpCode ? (
              // Always show the code — pre-fetch engine keeps it fresh seamlessly
              <Animated.View entering={FadeIn} style={styles.totpContainer}>
                <Text style={styles.totpLabel}>ATTENDANCE CODE</Text>
                <Text style={styles.totpCode}>{totpCode}</Text>

                {/* progress bar drains over the full cycle */}
                <View style={styles.timerBar}>
                  <View style={[styles.timerFill, {
                    width: `${timerProgress * 100}%`,
                    backgroundColor: timerColor,
                  }]} />
                </View>

                <Text style={[styles.timerText, { color: timerColor }]}>
                  {totpTimeRemaining > 0
                    ? `Refreshes in ${totpTimeRemaining}s`
                    : 'Fetching next code…'}
                </Text>
              </Animated.View>
            ) : (
              // Only shown when there truly is no session TOTP record at all
              <View style={[styles.totpContainer, { backgroundColor: colors.border + '30' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.totpLabel, { marginTop: 8 }]}>Waiting for TOTP…</Text>
              </View>
            )}

            {/* ── Start Attendance Button ────────────────────────── */}
            {attendanceEnabled ? (
              /* Already active — show a status badge */
              <View style={[styles.primaryButton, { backgroundColor: '#16A34A' }]}>
                <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Attendance Open ✓</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.primaryButton, { opacity: totpCode && !isStartingAttendance ? 1 : 0.45 }]}
                disabled={!totpCode || isStartingAttendance}
                onPress={async () => {
                  if (!activeSession?.id) return;
                  setIsStartingAttendance(true);
                  setStartAttendanceError(null);
                  try {
                    // 1. Capture teacher's live barometer (source of truth)
                    let teacherPressure: number | null = null;
                    try {
                      const baroReading = await getBarometerReading();
                      teacherPressure = baroReading?.pressure ?? null;
                      console.log('[StartAttendance] Teacher barometer:', teacherPressure, 'hPa', '(source:', baroReading?.source, ')');
                    } catch (baroErr) {
                      console.warn('[StartAttendance] Barometer read failed — proceeding without pressure baseline:', baroErr);
                    }
                    // 2. Enable attendance in DB
                    const result = await startAttendanceSession(activeSession.id, teacherPressure);
                    if (result.success) {
                      setAttendanceEnabled(true);
                    } else {
                      setStartAttendanceError(result.message);
                    }
                  } finally {
                    setIsStartingAttendance(false);
                  }
                }}
              >
                {isStartingAttendance
                  ? <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Capturing sensor…</Text>
                    </>
                  : <>
                      <MaterialIcons name="play-circle-filled" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Start Attendance</Text>
                    </>
                }
              </Pressable>
            )}

            {/* Error message */}
            {startAttendanceError ? (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: '#DC2626', textAlign: 'center' }}>
                  {startAttendanceError}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.delay(100)} style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <MaterialIcons name="info-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' }}>
              No active or upcoming sessions today
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

export default TeacherStartAttendanceScreen;

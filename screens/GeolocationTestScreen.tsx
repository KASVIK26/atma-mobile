import MapPolygonVisualization from '@/components/MapPolygonVisualization';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  BarometerReading,
  calculateFloorHeightFromPressure,
  estimateFloorNumber,
  pressureDropPerFloor,
  subscribeToBarometer,
} from '@/lib/barometer-service';
import {
  calculateDistance,
  getCurrentLocation,
  LocationCoordinates,
  requestLocationPermissions,
  RoomGeometry
} from '@/lib/geolocation-service';
import { getNearestBuildingSurfacePressure } from '@/lib/pressure-service';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Classroom test geometry (Indore zone) ────────────────────────────────────
const ROOM_GEOMETRY: RoomGeometry = {
  type: 'Polygon',
  coordinates: [
    [75.784611, 23.167191],
    [75.784614, 23.167137],
    [75.784665, 23.167132],
    [75.784665, 23.167181],
    [75.784611, 23.167191],
  ] as number[][],
};
const FALLBACK_PRESSURE_HPA = 956.72;   // used only if Open-Meteo is unreachable
const GPS_THRESHOLD_M = 12;
// 2.8 m covers the ~0.3 hPa Open-Meteo model bias (≈ 2.1 m at 956 hPa) with extra margin.
// Still < half a floor (floor sep ≈ 3.1 m at this altitude).
const BARO_TOLERANCE_M = 2.8;
const SCAN_SAMPLES = 5;
const SCAN_INTERVAL_MS = 1000;

// ─── Types ─────────────────────────────────────────────────────────────────────
type VerificationStatus = 'idle' | 'scanning' | 'pass' | 'fail';
type StepStatus = 'idle' | 'checking' | 'pass' | 'fail' | 'skipped';

interface ScanResult {
  gps: StepStatus;
  barometer: StepStatus;
  overall: 'pass' | 'fail';
  distance: number;
  pressure: number | null;
  heightDiff: number | null;
  floor: number | null;
  accuracy: number;
  timestamp: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function polygonCenter(coords: number[][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  return [lat, lon];
}
const [CENTER_LAT, CENTER_LON] = polygonCenter(ROOM_GEOMETRY.coordinates as number[][]);

// ─── Sub-components ────────────────────────────────────────────────────────────
const StatusBadge = ({ status, colors }: { status: StepStatus; colors: any }) => {
  const map: Record<StepStatus, { label: string; bg: string; fg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    idle:     { label: 'Waiting',  bg: colors.border,         fg: colors.textSecondary, icon: 'schedule' },
    checking: { label: 'Checking', bg: colors.primary + '22', fg: colors.primary,       icon: 'refresh'  },
    pass:     { label: 'Passed',   bg: colors.success + '22', fg: colors.success,       icon: 'check-circle' },
    fail:     { label: 'Failed',   bg: '#FF3B30' + '22',      fg: '#FF3B30',            icon: 'cancel'   },
    skipped:  { label: 'Skipped',  bg: colors.warning + '22', fg: colors.warning,       icon: 'remove-circle-outline' },
  };
  const { label, bg, fg, icon } = map[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: bg }}>
      <MaterialIcons name={icon} size={13} color={fg} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
};

const MetricRow = ({
  label, value, valueColor, icon, colors, last = false,
}: {
  label: string; value: string; valueColor?: string;
  icon: keyof typeof MaterialIcons.glyphMap; colors: any; last?: boolean;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 10 }}>
    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name={icon} size={15} color={colors.primary} />
    </View>
    <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '700', color: valueColor ?? colors.textPrimary }}>{value}</Text>
  </View>
);

const AccuracyBar = ({ accuracy, colors }: { accuracy: number; colors: any }) => {
  const pct = Math.min(100, Math.max(0, 100 - accuracy * 3));
  const color = accuracy < 5 ? colors.success : accuracy < 15 ? colors.warning : '#FF3B30';
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>GPS Accuracy</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color }}>
          {accuracy.toFixed(1)} m  ·  {accuracy < 5 ? 'High' : accuracy < 15 ? 'Medium' : 'Low'}
        </Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>
    </View>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export function GeolocationTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [permissionGranted, setPermissionGranted]   = useState(false);
  const [baroAvailable, setBaroAvailable]           = useState<boolean | null>(null);
  const [liveLocation, setLiveLocation]             = useState<LocationCoordinates | null>(null);
  const [liveBaro, setLiveBaro]                     = useState<BarometerReading | null>(null);
  const [locationRefreshing, setLocationRefreshing] = useState(false);
  // Live surface pressure — DB-first (buildings.surface_pressure_hpa), then Open-Meteo, then fallback
  const [surfacePressure, setSurfacePressure]       = useState<number>(FALLBACK_PRESSURE_HPA);
  const [surfacePressureSource, setSurfacePressureSource] = useState<'database' | 'open_meteo' | 'fallback'>('fallback');

  const [scanStatus, setScanStatus]   = useState<VerificationStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null);
  const [gpsStep, setGpsStep]         = useState<StepStatus>('idle');
  const [baroStep, setBaroStep]       = useState<StepStatus>('idle');

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const liveDistance   = liveLocation ? calculateDistance([liveLocation.latitude, liveLocation.longitude], [CENTER_LAT, CENTER_LON]) : null;
  const liveHeightDiff = liveBaro ? calculateFloorHeightFromPressure(surfacePressure, liveBaro.pressure) : null;
  const liveFloor      = liveBaro ? estimateFloorNumber(surfacePressure, liveBaro.pressure) : null;

  // Permissions + initial location + live surface pressure
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermissions();
      setPermissionGranted(granted);
      if (granted) {
        const loc = await getCurrentLocation();
        if (loc) setLiveLocation(loc);
      }

      // Fetch live surface pressure — DB first (hourly Edge Fn), then Open-Meteo direct, then fallback
      const pressResult = await getNearestBuildingSurfacePressure(CENTER_LAT, CENTER_LON);
      setSurfacePressure(pressResult.pressure_hpa);
      setSurfacePressureSource(
        pressResult.source === 'database' ? 'database'
        : pressResult.source === 'open_meteo_direct' ? 'open_meteo'
        : 'fallback'
      );
      console.log(`[GeoTest] Surface pressure: ${pressResult.pressure_hpa.toFixed(2)} hPa (${pressResult.source})`);
    })();
  }, []);

  // Live barometer subscription
  useEffect(() => {
    let unsub: (() => void) | null = null;
    subscribeToBarometer((reading) => {
      setLiveBaro(reading);
      if (baroAvailable === null) setBaroAvailable(reading.source === 'hardware');
    }, 1000).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  // Pulse animation
  useEffect(() => {
    if (scanStatus === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [scanStatus]);

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: scanProgress / SCAN_SAMPLES, duration: 400, useNativeDriver: false }).start();
  }, [scanProgress]);

  const refreshLocation = useCallback(async () => {
    setLocationRefreshing(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) setLiveLocation(loc);
    } finally {
      setLocationRefreshing(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (scanStatus === 'scanning' || !permissionGranted) return;
    setScanStatus('scanning');
    setScanProgress(0);
    setScanResult(null);
    setGpsStep('checking');
    setBaroStep('checking');
    progressAnim.setValue(0);

    try {
      const samples: LocationCoordinates[] = [];
      for (let i = 0; i < SCAN_SAMPLES; i++) {
        const loc = await getCurrentLocation();
        if (loc) { samples.push(loc); setLiveLocation(loc); }
        setScanProgress(i + 1);
        if (i < SCAN_SAMPLES - 1) await new Promise((r) => setTimeout(r, SCAN_INTERVAL_MS));
      }

      if (samples.length === 0) {
        setScanStatus('fail'); setGpsStep('fail'); setBaroStep('skipped'); return;
      }

      const best = samples.reduce((a, b) => (a.accuracy < b.accuracy ? a : b));
      const dist = calculateDistance([best.latitude, best.longitude], [CENTER_LAT, CENTER_LON]);
      const gpsPass = dist <= GPS_THRESHOLD_M;
      setGpsStep(gpsPass ? 'pass' : 'fail');

      const currentBaro = liveBaro;
      let baroPass = false, heightDiff: number | null = null, floor: number | null = null;
      if (currentBaro) {
        heightDiff = calculateFloorHeightFromPressure(surfacePressure, currentBaro.pressure);
        floor      = estimateFloorNumber(surfacePressure, currentBaro.pressure);
        baroPass   = Math.abs(heightDiff) <= BARO_TOLERANCE_M;
        setBaroStep(baroPass ? 'pass' : 'fail');
      } else {
        setBaroStep('skipped');
      }

      const overall: 'pass' | 'fail' = gpsPass && (baroPass || !currentBaro) ? 'pass' : 'fail';
      setScanResult({
        gps: gpsPass ? 'pass' : 'fail',
        barometer: currentBaro ? (baroPass ? 'pass' : 'fail') : 'skipped',
        overall, distance: dist, pressure: currentBaro?.pressure ?? null,
        heightDiff, floor, accuracy: best.accuracy,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      setScanStatus(overall);
    } catch (err) {
      console.error('[GeoTest] scan error:', err);
      setScanStatus('fail'); setGpsStep('fail'); setBaroStep('fail');
    }
  }, [scanStatus, permissionGranted, liveBaro]);

  const resetScan = () => {
    setScanStatus('idle'); setScanProgress(0); setScanResult(null);
    setGpsStep('idle'); setBaroStep('idle'); progressAnim.setValue(0);
  };

  // ── Styles ──
  const s = StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.background },
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.cardBackground },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    headerSub:   { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    scroll:      { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    card:        { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    cardTitle:   { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
    row:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pill:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
    scanBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 10, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
    scanBtnTxt:  { fontSize: 15, fontWeight: '800', color: '#fff' },
    stepCard:    { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepNum:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    mapCard:     { borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    mapTitle:    { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.cardBackground },
  });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="default" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="radar" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Location Diagnostics</Text>
          <Text style={s.headerSub}>GPS  ·  Barometer  ·  Verification</Text>
        </View>
        <View style={[s.pill, { backgroundColor: permissionGranted ? colors.success + '20' : '#FF3B30' + '20' }]}>
          <MaterialIcons name={permissionGranted ? 'gps-fixed' : 'gps-off'} size={13} color={permissionGranted ? colors.success : '#FF3B30'} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: permissionGranted ? colors.success : '#FF3B30' }}>
            {permissionGranted ? 'GPS On' : 'No GPS'}
          </Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Result banner ── */}
        {scanResult && (
          <View style={{ borderRadius: 14, padding: 16, marginBottom: 14, backgroundColor: scanResult.overall === 'pass' ? colors.success + '18' : '#FF3B30' + '12', borderWidth: 1, borderColor: scanResult.overall === 'pass' ? colors.success + '40' : '#FF3B30' + '40' }}>
            <View style={[s.row, { marginBottom: 12 }]}>
              <MaterialIcons name={scanResult.overall === 'pass' ? 'verified' : 'dangerous'} size={28} color={scanResult.overall === 'pass' ? colors.success : '#FF3B30'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: scanResult.overall === 'pass' ? colors.success : '#FF3B30' }}>
                  {scanResult.overall === 'pass' ? 'Location Verified ✓' : 'Verification Failed'}
                </Text>
                <Text style={{ fontSize: 12, marginTop: 2, color: scanResult.overall === 'pass' ? colors.success : '#FF3B30', opacity: 0.8 }}>
                  Scanned at {scanResult.timestamp}
                </Text>
              </View>
              <Pressable onPress={resetScan} style={{ padding: 6 }}>
                <MaterialIcons name="refresh" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <MetricRow label="Distance to classroom" value={`${scanResult.distance.toFixed(1)} m`} valueColor={scanResult.distance <= GPS_THRESHOLD_M ? colors.success : '#FF3B30'} icon="place" colors={colors} />
            <MetricRow label="GPS accuracy"          value={`${scanResult.accuracy.toFixed(1)} m`} icon="gps-not-fixed" colors={colors} />
            {scanResult.pressure != null && <MetricRow label="Pressure reading"       value={`${scanResult.pressure.toFixed(2)} hPa`} icon="compress" colors={colors} />}
            {scanResult.floor    != null && <MetricRow label="Estimated floor"        value={`Floor ${scanResult.floor}`} valueColor={scanResult.floor === 0 ? colors.success : colors.warning} icon="stairs" colors={colors} last />}
          </View>
        )}

        {/* ── Verification steps ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Verification Steps</Text>

          <View style={[s.stepCard, { backgroundColor: gpsStep === 'pass' ? colors.success + '10' : gpsStep === 'fail' ? '#FF3B30' + '08' : colors.background }]}>
            <View style={[s.stepNum, { backgroundColor: gpsStep === 'pass' ? colors.success : gpsStep === 'fail' ? '#FF3B30' : colors.textTertiary }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>GPS Location</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Must be within {GPS_THRESHOLD_M} m of classroom</Text>
            </View>
            <StatusBadge status={gpsStep} colors={colors} />
          </View>

          <View style={[s.stepCard, { backgroundColor: baroStep === 'pass' ? colors.success + '10' : baroStep === 'fail' ? '#FF3B30' + '08' : colors.background }]}>
            <View style={[s.stepNum, { backgroundColor: baroStep === 'pass' ? colors.success : baroStep === 'fail' ? '#FF3B30' : baroStep === 'skipped' ? colors.warning : colors.textTertiary }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Barometer / Floor</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {'Ground floor (0) · Δh ≤ ' + BARO_TOLERANCE_M + ' m'}
                {'  (≈ ±' + (BARO_TOLERANCE_M / 8568 * surfacePressure).toFixed(2) + ' hPa)  ·  '}
                {baroAvailable === true ? 'Hardware sensor' : baroAvailable === false ? 'Mock fallback' : 'Detecting…'}
              </Text>
            </View>
            <StatusBadge status={baroStep} colors={colors} />
          </View>

          <View style={[s.stepCard, { backgroundColor: colors.background, marginBottom: 0 }]}>
            <View style={[s.stepNum, { backgroundColor: colors.textTertiary }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>TOTP Code</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Verified in attendance flow</Text>
            </View>
            <StatusBadge status="idle" colors={colors} />
          </View>
        </View>

        {/* ── Scan button ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Verification Scan</Text>
          {scanStatus === 'scanning' ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary + '40' }}>
                  <MaterialIcons name="radar" size={36} color={colors.primary} />
                </View>
              </Animated.View>
              <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                Scanning… {scanProgress}/{SCAN_SAMPLES}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>Collecting GPS samples &amp; barometer data</Text>
              <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 16 }}>
                <Animated.View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.primary, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
              </View>
            </View>
          ) : (
            <Pressable
              style={[s.scanBtn, { backgroundColor: permissionGranted ? colors.primary : colors.textTertiary, shadowColor: permissionGranted ? colors.primary : 'transparent' }]}
              onPress={runScan}
              disabled={!permissionGranted}
            >
              <MaterialIcons name="gps-fixed" size={20} color="#fff" />
              <Text style={s.scanBtnTxt}>{scanStatus === 'idle' ? 'Start Verification Scan' : 'Scan Again'}</Text>
            </Pressable>
          )}
        </View>

        {/* ── Live GPS ── */}
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Text style={[s.cardTitle, { flex: 1, marginBottom: 0 }]}>Live GPS</Text>
            <Pressable
              onPress={refreshLocation}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primaryLight }}
            >
              <MaterialIcons name={locationRefreshing ? 'refresh' : 'my-location'} size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{locationRefreshing ? 'Fetching…' : 'Refresh'}</Text>
            </Pressable>
          </View>
          {liveLocation ? (
            <>
              <MetricRow label="Latitude"   value={liveLocation.latitude.toFixed(6)}  icon="near-me"  colors={colors} />
              <MetricRow label="Longitude"  value={liveLocation.longitude.toFixed(6)} icon="near-me"  colors={colors} />
              <MetricRow label="Distance to classroom" value={liveDistance != null ? `${liveDistance.toFixed(1)} m` : '—'}
                valueColor={liveDistance != null ? (liveDistance <= GPS_THRESHOLD_M ? colors.success : liveDistance <= 30 ? colors.warning : '#FF3B30') : undefined}
                icon="place" colors={colors} />
              <MetricRow label="Altitude"   value={`${liveLocation.altitude.toFixed(1)} m`}          icon="terrain" colors={colors} />
              <MetricRow label="Speed"      value={`${(liveLocation.speed * 3.6).toFixed(1)} km/h`}  icon="speed"   colors={colors} last />
              <AccuracyBar accuracy={liveLocation.accuracy} colors={colors} />
            </>
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="location-searching" size={32} color={colors.textTertiary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Tap Refresh to get current position</Text>
            </View>
          )}
        </View>

        {/* ── Live Barometer ── */}
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Text style={[s.cardTitle, { flex: 1, marginBottom: 0 }]}>Live Barometer</Text>
            <View style={[s.pill, { backgroundColor: baroAvailable === true ? colors.success + '20' : colors.warning + '20' }]}>
              <MaterialIcons name={baroAvailable === true ? 'sensors' : 'sensors-off'} size={12} color={baroAvailable === true ? colors.success : colors.warning} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: baroAvailable === true ? colors.success : colors.warning }}>
                {baroAvailable === true ? 'Hardware' : baroAvailable === false ? 'Mock' : '…'}
              </Text>
            </View>
          </View>
          {liveBaro ? (
            <>
              <MetricRow label="Pressure"          value={`${liveBaro.pressure.toFixed(2)} hPa`}                                                                                      icon="compress" colors={colors} />
              <MetricRow label={surfacePressureSource === 'database' ? 'Surface (DB — live)' : surfacePressureSource === 'open_meteo' ? 'Surface (Open-Meteo)' : 'Surface (Fallback)'} value={`${surfacePressure.toFixed(2)} hPa ${surfacePressureSource !== 'fallback' ? '✓' : '⚠'}`} valueColor={surfacePressureSource === 'database' ? colors.success : surfacePressureSource === 'open_meteo' ? colors.success : colors.warning} icon="adjust" colors={colors} />
              <MetricRow
                label="Δ Pressure (bias)"
                value={`${(surfacePressure - liveBaro.pressure) > 0 ? '+' : ''}${(surfacePressure - liveBaro.pressure).toFixed(3)} hPa`}
                valueColor={Math.abs(surfacePressure - liveBaro.pressure) < 0.30 ? colors.success : Math.abs(surfacePressure - liveBaro.pressure) < 0.50 ? colors.warning : '#FF3B30'}
                icon="compare" colors={colors} />
              <MetricRow
                label="Floor sep (per 3.5 m)"
                value={`${pressureDropPerFloor(surfacePressure, 3.5).toFixed(3)} hPa`}
                icon="layers" colors={colors} />
              <MetricRow label="Height difference" value={liveHeightDiff != null ? `${liveHeightDiff > 0 ? '+' : ''}${liveHeightDiff.toFixed(1)} m` : '—'}
                valueColor={liveHeightDiff != null ? (Math.abs(liveHeightDiff) <= BARO_TOLERANCE_M ? colors.success : '#FF3B30') : undefined}
                icon="height"  colors={colors} />
              <MetricRow label="Estimated floor"   value={liveFloor != null ? `Floor ${liveFloor}` : '—'} valueColor={liveFloor === 0 ? colors.success : colors.warning}             icon="stairs"   colors={colors} />
              <MetricRow label="Altitude (derived)" value={`${liveBaro.altitude.toFixed(1)} m`}                                                                                       icon="terrain"  colors={colors} />
              <MetricRow label="Floor check"       value={liveHeightDiff != null ? (Math.abs(liveHeightDiff) <= BARO_TOLERANCE_M ? '✓ Correct floor' : '✗ Wrong floor') : '—'}
                valueColor={liveHeightDiff != null ? (Math.abs(liveHeightDiff) <= BARO_TOLERANCE_M ? colors.success : '#FF3B30') : undefined}
                icon="check" colors={colors} last />
            </>
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="hourglass-empty" size={32} color={colors.textTertiary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Waiting for barometer…</Text>
            </View>
          )}
        </View>

        {/* ── Map ── */}
        <View style={s.mapCard}>
          <View style={s.mapTitle}>
            <Text style={[s.cardTitle, { marginBottom: 0 }]}>Classroom Polygon  ·  Indore</Text>
            {scanResult && (
              <Text style={{ fontSize: 12, marginTop: 2, color: scanResult.overall === 'pass' ? colors.success : '#FF3B30' }}>
                {scanResult.overall === 'pass' ? '✓ Inside classroom' : '✗ Outside classroom'}
              </Text>
            )}
          </View>
          <MapPolygonVisualization
            polygon={ROOM_GEOMETRY.coordinates as Array<[number, number]>}
            currentLocation={liveLocation || undefined}
            isInside={scanResult?.overall === 'pass' || false}
            title="Classroom · Indore"
            height={280}
          />
        </View>

        {/* ── Classroom info ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Classroom Geometry</Text>
          <MetricRow label="Type"            value="Polygon"                                                   icon="hexagon"             colors={colors} />
          <MetricRow label="Vertices"        value={`${(ROOM_GEOMETRY.coordinates as number[][]).length}`}     icon="grain"               colors={colors} />
          <MetricRow label="Center lat"      value={CENTER_LAT.toFixed(6)}                                     icon="my-location"         colors={colors} />
          <MetricRow label="Center lon"      value={CENTER_LON.toFixed(6)}                                     icon="my-location"         colors={colors} />
          <MetricRow label="GPS threshold"   value={`${GPS_THRESHOLD_M} m`}                                    icon="radio-button-checked" colors={colors} />
          <MetricRow label="Baro baseline"   value={`${surfacePressure.toFixed(2)} hPa`}                            icon="adjust"              colors={colors} />
          <MetricRow label="Floor tolerance" value={`± ${BARO_TOLERANCE_M} m`}                                 icon="height"              colors={colors} last />
        </View>

        {/* ── Debug ── */}
        <View style={[s.card, { borderStyle: 'dashed' }]}>
          <Text style={s.cardTitle}>Debug Info</Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary, lineHeight: 18 }}>
            {`user.id      : ${user?.id?.substring(0, 16) ?? 'n/a'}…\n`}
            {`gps perm     : ${permissionGranted}\n`}
            {`baro source  : ${baroAvailable === true ? 'hardware' : baroAvailable === false ? 'mock' : 'detecting'}\n`}
            {`scan samples : ${SCAN_SAMPLES} × ${SCAN_INTERVAL_MS}ms\n`}
            {`gps thresh   : ${GPS_THRESHOLD_M} m\n`}
            {`baro thresh  : ±${BARO_TOLERANCE_M} m\n`}
            {`surface P    : ${surfacePressure.toFixed(2)} hPa (${surfacePressureSource})`}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

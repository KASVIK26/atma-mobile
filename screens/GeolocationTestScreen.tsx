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
import supabase from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Building / room dropdown option types ────────────────────────────────────
interface BuildingOption { id: string; name: string; code?: string | null; }
interface RoomOption {
  id: string;
  room_number: string;
  room_name: string | null;
  floor_number: number;
  geofence_geojson: any;
  latitude?: number | null;
  longitude?: number | null;
}
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
/** Normalise a GeoJSON Polygon's coordinates to a flat ring [[lon, lat], …] */
function extractPolygonRing(geojson: any): [number, number][] | null {
  if (!geojson || geojson.type !== 'Polygon') return null;
  const coords = geojson.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const first = coords[0];
  // Standard GeoJSON wraps rings in an outer array: coordinates[0] is the outer ring
  if (Array.isArray(first) && Array.isArray(first[0])) return first as [number, number][];
  // Already a flat ring
  return coords as [number, number][];
}

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
  const { user, userProfile, enrollments, instructor } = useAuth();
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

  // ── Building / room selection ──
  const [buildings, setBuildings]                   = useState<BuildingOption[]>([]);
  const [rooms, setRooms]                           = useState<RoomOption[]>([]);
  const [selectedBuilding, setSelectedBuilding]     = useState<BuildingOption | null>(null);
  const [selectedRoom, setSelectedRoom]             = useState<RoomOption | null>(null);
  const [buildingPickerOpen, setBuildingPickerOpen] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen]         = useState(false);
  const [buildingsLoading, setBuildingsLoading]     = useState(false);
  const [roomsLoading, setRoomsLoading]             = useState(false);
  const [roomGeometry, setRoomGeometry]             = useState<RoomGeometry | null>(null);
  const [roomCenter, setRoomCenter]                 = useState<[number, number] | null>(null);
  const [autoLoadLabel, setAutoLoadLabel]           = useState<string | null>(null);

  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const roomCenterRef = useRef<[number, number] | null>(null);

  const liveDistance   = liveLocation && roomCenter ? calculateDistance([liveLocation.latitude, liveLocation.longitude], roomCenter) : null;
  const liveHeightDiff = liveBaro ? calculateFloorHeightFromPressure(surfacePressure, liveBaro.pressure) : null;
  const liveFloor      = liveBaro ? estimateFloorNumber(surfacePressure, liveBaro.pressure) : null;

  // Permissions + initial location
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermissions();
      setPermissionGranted(granted);
      if (granted) {
        const loc = await getCurrentLocation();
        if (loc) setLiveLocation(loc);
      }
    })();
  }, []);

  // Surface pressure — re-fetched whenever the selected room's center changes
  useEffect(() => {
    if (!roomCenter) return;
    (async () => {
      const pressResult = await getNearestBuildingSurfacePressure(roomCenter[0], roomCenter[1]);
      setSurfacePressure(pressResult.pressure_hpa);
      setSurfacePressureSource(
        pressResult.source === 'database' ? 'database'
        : pressResult.source === 'open_meteo_direct' ? 'open_meteo'
        : 'fallback'
      );
      console.log(`[GeoTest] Surface pressure: ${pressResult.pressure_hpa.toFixed(2)} hPa (${pressResult.source})`);
    })();
  }, [roomCenter]);

  // Keep roomCenterRef in sync (used inside runScan callback without re-creating it)
  useEffect(() => { roomCenterRef.current = roomCenter; }, [roomCenter]);

  // Load buildings for the user's university
  useEffect(() => {
    const universityId = userProfile?.university_id;
    if (!universityId) return;
    setBuildingsLoading(true);
    supabase
      .from('buildings')
      .select('id, name, code')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setBuildings((data || []) as BuildingOption[]);
        setBuildingsLoading(false);
      });
  }, [userProfile?.university_id]);

  // Load rooms whenever selected building changes
  useEffect(() => {
    if (!selectedBuilding) { setRooms([]); return; }
    setRoomsLoading(true);
    supabase
      .from('rooms')
      .select('id, room_number, room_name, floor_number, geofence_geojson, latitude, longitude')
      .eq('building_id', selectedBuilding.id)
      .eq('is_active', true)
      .order('room_number')
      .then(({ data }) => {
        setRooms((data || []) as RoomOption[]);
        setRoomsLoading(false);
      });
  }, [selectedBuilding?.id]);

  // Auto-load from the current ongoing or next upcoming lecture
  useEffect(() => {
    const universityId = userProfile?.university_id;
    if (!universityId) return;
    const now   = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    (async () => {
      let sessions: any[] = [];
      if (userProfile?.role === 'student' && enrollments && enrollments.length > 0) {
        const sectionIds = enrollments.map((e) => e.section_id);
        const { data } = await supabase
          .from('lecture_sessions')
          .select('id, session_date, start_time, end_time, scheduled_start_time, scheduled_end_time, room_id, courses(code, name)')
          .in('section_id', sectionIds)
          .eq('session_date', today)
          .eq('is_active', true)
          .eq('is_cancelled', false)
          .order('start_time', { ascending: true });
        sessions = data || [];
      } else if (instructor?.id) {
        const { data } = await supabase
          .from('lecture_sessions')
          .select('id, session_date, start_time, end_time, scheduled_start_time, scheduled_end_time, room_id, instructor_ids, courses(code, name)')
          .eq('university_id', universityId)
          .eq('session_date', today)
          .eq('is_active', true)
          .eq('is_cancelled', false)
          .order('start_time', { ascending: true });
        sessions = (data || []).filter((s: any) =>
          Array.isArray(s.instructor_ids) && s.instructor_ids.includes(instructor!.id)
        );
      }
      if (sessions.length === 0) return;

      const timeStr = now.toTimeString().substring(0, 8);
      let target = sessions.find((s: any) => {
        const st = s.scheduled_start_time || s.start_time;
        const et = s.scheduled_end_time   || s.end_time;
        return st && et && timeStr >= st && timeStr <= et;
      });
      if (!target) target = sessions.find((s: any) => {
        const st = s.scheduled_start_time || s.start_time;
        return st && timeStr < st;
      });
      if (!target?.room_id) return;

      const { data: roomRow } = await supabase
        .from('rooms')
        .select('id, room_number, room_name, floor_number, geofence_geojson, latitude, longitude, building_id, buildings(id, name, code)')
        .eq('id', target.room_id)
        .single();
      if (!roomRow?.buildings) return;

      const bld = roomRow.buildings as any;
      setSelectedBuilding({ id: bld.id, name: bld.name, code: bld.code });

      const { data: bldRooms } = await supabase
        .from('rooms')
        .select('id, room_number, room_name, floor_number, geofence_geojson, latitude, longitude')
        .eq('building_id', bld.id)
        .eq('is_active', true)
        .order('room_number');
      setRooms((bldRooms || []) as RoomOption[]);

      const selRoom: RoomOption = {
        id: roomRow.id, room_number: roomRow.room_number, room_name: roomRow.room_name,
        floor_number: roomRow.floor_number, geofence_geojson: roomRow.geofence_geojson,
        latitude: roomRow.latitude, longitude: roomRow.longitude,
      };
      setSelectedRoom(selRoom);

      const ring = extractPolygonRing(roomRow.geofence_geojson);
      if (ring && ring.length >= 3) {
        setRoomGeometry({ type: 'Polygon', coordinates: ring });
        setRoomCenter(polygonCenter(ring));
      } else if (roomRow.latitude && roomRow.longitude) {
        setRoomCenter([parseFloat(roomRow.latitude), parseFloat(roomRow.longitude)]);
      }

      const isOngoing = (() => {
        const st = target.scheduled_start_time || target.start_time;
        const et = target.scheduled_end_time   || target.end_time;
        return st && et && timeStr >= st && timeStr <= et;
      })();
      const courseCode = (target.courses as any)?.code || '';
      setAutoLoadLabel(`Auto · ${isOngoing ? 'Ongoing' : 'Upcoming'}${courseCode ? ': ' + courseCode : ''}`);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.role, userProfile?.university_id, enrollments?.length, instructor?.id]);

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
    if (!roomCenterRef.current) {
      // No room selected — nothing to scan against
      setScanStatus('fail'); setGpsStep('fail'); setBaroStep('skipped'); return;
    }
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
      const center = roomCenterRef.current!;
      const dist = calculateDistance([best.latitude, best.longitude], center);
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

  const resetScan = useCallback(() => {
    setScanStatus('idle'); setScanProgress(0); setScanResult(null);
    setGpsStep('idle'); setBaroStep('idle'); progressAnim.setValue(0);
  }, [progressAnim]);

  const handleRoomSelect = useCallback((room: RoomOption) => {
    setSelectedRoom(room);
    const ring = extractPolygonRing(room.geofence_geojson);
    if (ring && ring.length >= 3) {
      setRoomGeometry({ type: 'Polygon', coordinates: ring });
      setRoomCenter(polygonCenter(ring));
    } else if (room.latitude && room.longitude) {
      setRoomGeometry(null);
      setRoomCenter([parseFloat(String(room.latitude)), parseFloat(String(room.longitude))]);
    } else {
      setRoomGeometry(null);
      setRoomCenter(null);
    }
    setScanStatus('idle'); setScanProgress(0); setScanResult(null);
    setGpsStep('idle'); setBaroStep('idle'); progressAnim.setValue(0);
    setAutoLoadLabel(null);
    setRoomPickerOpen(false);
  }, [progressAnim]);

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

        {/* ── Room selector ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Room</Text>
          {autoLoadLabel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
              <MaterialIcons name="auto-awesome" size={13} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', flex: 1 }}>{autoLoadLabel}</Text>
            </View>
          )}
          {/* Building dropdown trigger */}
          <Pressable
            onPress={() => { if (!buildingsLoading) setBuildingPickerOpen(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: selectedBuilding ? colors.primary + '60' : colors.border, marginBottom: 10 }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <MaterialIcons name="business" size={16} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: selectedBuilding ? colors.textPrimary : colors.textTertiary, fontWeight: selectedBuilding ? '600' : '400' }}>
              {buildingsLoading ? 'Loading buildings…' : selectedBuilding ? selectedBuilding.name : 'Select Building'}
            </Text>
            {selectedBuilding?.code && <Text style={{ fontSize: 11, color: colors.textSecondary, marginRight: 6 }}>{selectedBuilding.code}</Text>}
            <MaterialIcons name="expand-more" size={20} color={colors.textSecondary} />
          </Pressable>
          {/* Room dropdown trigger */}
          <Pressable
            onPress={() => { if (selectedBuilding && !roomsLoading) setRoomPickerOpen(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: selectedRoom ? colors.primary + '60' : colors.border, opacity: selectedBuilding ? 1 : 0.45 }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: selectedRoom ? colors.primaryLight : colors.border + '60', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <MaterialIcons name="meeting-room" size={16} color={selectedRoom ? colors.primary : colors.textTertiary} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: selectedRoom ? colors.textPrimary : colors.textTertiary, fontWeight: selectedRoom ? '600' : '400' }}>
              {roomsLoading ? 'Loading rooms…' : selectedRoom
                ? `${selectedRoom.room_number}${selectedRoom.room_name ? ' · ' + selectedRoom.room_name : ''}`
                : selectedBuilding ? 'Select Room' : 'Select a building first'}
            </Text>
            {selectedRoom && <Text style={{ fontSize: 11, color: colors.textSecondary, marginRight: 6 }}>Floor {selectedRoom.floor_number}</Text>}
            <MaterialIcons name="expand-more" size={20} color={colors.textSecondary} />
          </Pressable>
          {!roomGeometry && selectedRoom && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.warning + '18' }}>
              <MaterialIcons name="warning" size={13} color={colors.warning} />
              <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600', flex: 1 }}>No polygon data — GPS distance to room centre only</Text>
            </View>
          )}
          {!selectedRoom && (
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 10, textAlign: 'center' }}>Select a room to enable the verification scan</Text>
          )}
        </View>

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
              style={[s.scanBtn, { backgroundColor: (permissionGranted && !!roomCenter) ? colors.primary : colors.textTertiary, shadowColor: (permissionGranted && !!roomCenter) ? colors.primary : 'transparent' }]}
              onPress={runScan}
              disabled={!permissionGranted || !roomCenter}
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
        {roomGeometry && (
        <View style={s.mapCard}>
          <View style={s.mapTitle}>
            <Text style={[s.cardTitle, { marginBottom: 0 }]}>Classroom Polygon</Text>
            {scanResult && (
              <Text style={{ fontSize: 12, marginTop: 2, color: scanResult.overall === 'pass' ? colors.success : '#FF3B30' }}>
                {scanResult.overall === 'pass' ? '✓ Inside classroom' : '✗ Outside classroom'}
              </Text>
            )}
          </View>
          <MapPolygonVisualization
            polygon={roomGeometry.coordinates as Array<[number, number]>}
            currentLocation={liveLocation || undefined}
            isInside={scanResult?.overall === 'pass' || false}
            title="Classroom Polygon"
            height={280}
            hideInfoPanel
          />
        </View>
        )}

        {/* ── Debug ── */}
        <View style={[s.card, { borderStyle: 'dashed' }]}>
          <Text style={s.cardTitle}>Debug Info</Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary, lineHeight: 18 }}>
            {`user.id      : ${user?.id?.substring(0, 16) ?? 'n/a'}…\n`}
            {`gps perm     : ${permissionGranted}\n`}
            {`building     : ${selectedBuilding?.name ?? 'none'}\n`}
            {`room         : ${selectedRoom ? selectedRoom.room_number + (selectedRoom.room_name ? ' · ' + selectedRoom.room_name : '') : 'none'}\n`}
            {`has polygon  : ${roomGeometry ? 'yes' : 'no'}\n`}
            {`baro source  : ${baroAvailable === true ? 'hardware' : baroAvailable === false ? 'mock' : 'detecting'}\n`}
            {`scan samples : ${SCAN_SAMPLES} × ${SCAN_INTERVAL_MS}ms\n`}
            {`gps thresh   : ${GPS_THRESHOLD_M} m\n`}
            {`baro thresh  : ±${BARO_TOLERANCE_M} m\n`}
            {`surface P    : ${surfacePressure.toFixed(2)} hPa (${surfacePressureSource})`}
          </Text>
        </View>

      </ScrollView>

      {/* ── Building picker modal ── */}
      <Modal visible={buildingPickerOpen} transparent animationType="fade" onRequestClose={() => setBuildingPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setBuildingPickerOpen(false)}>
          <Pressable style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 16, maxHeight: '70%' }} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.textPrimary }}>Select Building</Text>
              <Pressable onPress={() => setBuildingPickerOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {buildings.length === 0 ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <MaterialIcons name="business" size={32} color={colors.textTertiary} />
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>No buildings found</Text>
                </View>
              ) : buildings.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    if (selectedBuilding?.id !== b.id) {
                      setSelectedBuilding(b);
                      setSelectedRoom(null); setRoomGeometry(null); setRoomCenter(null);
                      setScanStatus('idle'); setScanProgress(0); setScanResult(null);
                      setGpsStep('idle'); setBaroStep('idle'); progressAnim.setValue(0);
                      setAutoLoadLabel(null);
                    }
                    setBuildingPickerOpen(false);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: selectedBuilding?.id === b.id ? colors.primary + '10' : 'transparent' }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <MaterialIcons name="business" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: selectedBuilding?.id === b.id ? colors.primary : colors.textPrimary }}>{b.name}</Text>
                    {b.code && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{b.code}</Text>}
                  </View>
                  {selectedBuilding?.id === b.id && <MaterialIcons name="check" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Room picker modal ── */}
      <Modal visible={roomPickerOpen} transparent animationType="fade" onRequestClose={() => setRoomPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setRoomPickerOpen(false)}>
          <Pressable style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 16, maxHeight: '72%' }} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.textPrimary }}>Select Room</Text>
              <Pressable onPress={() => setRoomPickerOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {rooms.length === 0 ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <MaterialIcons name="meeting-room" size={32} color={colors.textTertiary} />
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>No rooms found</Text>
                </View>
              ) : rooms.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => handleRoomSelect(r)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: selectedRoom?.id === r.id ? colors.primary + '10' : 'transparent' }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: r.geofence_geojson ? colors.primaryLight : colors.border + '60', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <MaterialIcons name="meeting-room" size={18} color={r.geofence_geojson ? colors.primary : colors.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: selectedRoom?.id === r.id ? colors.primary : colors.textPrimary }}>
                      {r.room_number}{r.room_name ? ` · ${r.room_name}` : ''}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      Floor {r.floor_number} · {r.geofence_geojson ? 'Polygon available' : 'No polygon'}
                    </Text>
                  </View>
                  {selectedRoom?.id === r.id && <MaterialIcons name="check" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

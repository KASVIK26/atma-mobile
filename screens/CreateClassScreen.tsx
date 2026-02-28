import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
    createSpecialClass,
    fetchBranches,
    fetchBuildings,
    fetchCoInstructors,
    fetchCourses,
    fetchInstructorTimetableForDate,
    fetchPrograms,
    fetchRooms,
    fetchSections,
    fetchSemesters,
    suggestTimeSlots
} from '@/lib/class-creation-service';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
      paddingBottom: 100,
    },
    formCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 14,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    required: {
      color: colors.danger,
    },
    dropdownButton: {
      backgroundColor: colors.input || colors.backgroundAlt,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    dropdownButtonFocus: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '05',
    },
    dropdownText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    dropdownPlaceholder: {
      color: colors.textSecondary,
    },
    dropdownDisabled: {
      backgroundColor: colors.backgroundAlt,
      opacity: 0.6,
    },
    dropdownListContainer: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      maxHeight: 250,
      overflow: 'hidden',
    },
    dropdownList: {
      paddingVertical: 0,
    },
    dropdownItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownItemText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    dropdownItemSelected: {
      backgroundColor: colors.primary + '10',
    },
    dropdownSelectedIndicator: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
      paddingVertical: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalList: {
      paddingVertical: 8,
    },
    modalItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalItemText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    modalItemSelected: {
      backgroundColor: colors.primary + '10',
    },
    selectedIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    input: {
      backgroundColor: colors.input || colors.backgroundAlt,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 44,
    },
    inputFocus: {
      borderColor: colors.primary,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
      paddingVertical: 12,
    },
    twoColumnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    twoColumnItem: {
      flex: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    toggleSwitch: {
      width: 50,
      height: 28,
      borderRadius: 14,
      padding: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.primary,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
    },
    chipText: {
      color: '#ffffff',
      fontWeight: '500',
      fontSize: 12,
    },
    chipClose: {
      padding: 2,
    },
    suggestedTimesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    suggestedTime: {
      backgroundColor: colors.primary + '15',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 4,
    },
    suggestedTimeSelected: {
      backgroundColor: colors.primary,
    },
    suggestedTimeText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    suggestedTimeSelectedText: {
      color: '#ffffff',
    },
    infoBox: {
      backgroundColor: colors.primary + '10',
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    createButton: {
      backgroundColor: colors.primary,
    },
    createButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
    cancelButton: {
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      height: 200,
    },
    calendarModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      zIndex: 1000,
    },
    calendarModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      maxWidth: 350,
      width: '100%',
      maxHeight: '80%',
    },
    calendarTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    calendarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    calendarCloseButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
    },
    calendarHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    calendarHeaderText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    calendarNavButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary + '15',
    },
    calendarWeekRow: {
      flexDirection: 'row',
      marginBottom: 6,
      gap: 2,
    },
    calendarDay: {
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 2,
    },
    calendarDayText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    calendarDateButton: {
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 2,
      borderRadius: 6,
      backgroundColor: colors.backgroundAlt,
    },
    calendarDateButtonText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    calendarDateSelected: {
      backgroundColor: colors.primary,
    },
    calendarDateSelectedText: {
      color: '#ffffff',
    },
    calendarDateDisabled: {
      opacity: 0.4,
    },
    calendarDateOutOfRange: {
      opacity: 0.3,
    },
  });

export const CreateClassScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { userProfile, instructor } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Loading and modal states
  const [isCreating, setIsCreating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Data loading states
  const [programs, setPrograms] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [coInstructorsList, setCoInstructorsList] = useState<any[]>([]);
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);
  const [semesterDates, setSemesterDates] = useState<{ start_date: string; end_date: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    program: null as any,
    branch: null as any,
    semester: null as any,
    section: null as any,
    course: null as any,
    date: '',
    startTime: '',
    endTime: '',
    building: null as any,
    room: null as any,
    coInstructors: [] as any[],
    totpRequired: true,
  });

  // Initialize programs on mount
  React.useEffect(() => {
    if (userProfile?.university_id) {
      loadPrograms();
    }
  }, [userProfile?.university_id]);

  // Load programs
  const loadPrograms = async () => {
    if (!userProfile?.university_id) return;
    const data = await fetchPrograms(userProfile.university_id);
    setPrograms(data);
  };

  // Load branches when program changes
  React.useEffect(() => {
    if (formData.program?.id) {
      loadBranches();
    } else {
      setBranches([]);
    }
  }, [formData.program]);

  const loadBranches = async () => {
    if (!formData.program?.id) return;
    const data = await fetchBranches(formData.program.id);
    setBranches(data);
    setFormData((prev) => ({ ...prev, branch: null, semester: null }));
  };

  // Load semesters when program changes
  React.useEffect(() => {
    if (formData.program?.id) {
      loadSemesters();
    }
  }, [formData.program]);

  const loadSemesters = async () => {
    if (!formData.program?.id) return;
    const data = await fetchSemesters(formData.program.id);
    setSemesters(data);
  };

  // Load sections when semester changes
  React.useEffect(() => {
    if (formData.semester?.id) {
      loadSections();
      // Also get the semester dates for calendar validation
      setSemesterDates({
        start_date: formData.semester.start_date,
        end_date: formData.semester.end_date,
      });
    } else {
      setSections([]);
      setSemesterDates(null);
    }
  }, [formData.semester]);

  const loadSections = async () => {
    if (!formData.semester?.id) return;
    const data = await fetchSections(formData.semester.id);
    setSections(data);
    setFormData((prev) => ({ ...prev, section: null, course: null }));
  };

  // Load courses when section/branch changes
  React.useEffect(() => {
    if (formData.section?.id && formData.program?.id && formData.branch?.id && formData.semester?.id) {
      loadCourses();
    }
  }, [formData.section, formData.branch, formData.program, formData.semester]);

  const loadCourses = async () => {
    if (!formData.section?.id || !formData.program?.id || !formData.branch?.id || !formData.semester?.id) return;
    const data = await fetchCourses(formData.program.id, formData.branch.id, formData.semester.id);
    setCourses(data);
    setFormData((prev) => ({ ...prev, course: null }));
  };

  // Load buildings on mount
  React.useEffect(() => {
    if (userProfile?.university_id) {
      loadBuildings();
    }
  }, [userProfile?.university_id]);

  const loadBuildings = async () => {
    if (!userProfile?.university_id) return;
    const data = await fetchBuildings(userProfile.university_id);
    setBuildings(data);
  };

  // Load rooms when building changes
  React.useEffect(() => {
    if (formData.building?.id) {
      loadRooms();
    } else {
      setRooms([]);
    }
  }, [formData.building]);

  const loadRooms = async () => {
    if (!formData.building?.id) return;
    const data = await fetchRooms(formData.building.id);
    setRooms(data);
    setFormData((prev) => ({ ...prev, room: null }));
  };

  // Load co-instructors on mount
  React.useEffect(() => {
    if (userProfile?.university_id && instructor?.id) {
      loadCoInstructors();
    }
  }, [userProfile?.university_id, instructor?.id]);

  const loadCoInstructors = async () => {
    if (!userProfile?.university_id || !instructor?.id) return;
    const data = await fetchCoInstructors(userProfile.university_id, instructor.id);
    setCoInstructorsList(data);
  };

  // Suggest times when date changes
  React.useEffect(() => {
    if (formData.date && instructor?.id) {
      suggestTimesForDate();
    }
  }, [formData.date]);

  const suggestTimesForDate = async () => {
    if (!formData.date || !instructor?.id) return;

    try {
      const timetable = await fetchInstructorTimetableForDate(instructor.id, formData.date);
      const suggested = suggestTimeSlots(timetable);
      setSuggestedTimes(suggested);
    } catch (error) {
      console.error('Error suggesting times:', error);
    }
  };

  // Handle suggested time selection
  const handleSuggestedTime = (slot: any) => {
    setFormData((prev) => ({
      ...prev,
      startTime: slot.start,
      endTime: slot.end,
    }));
    setSuggestedTimes([]); // Clear suggestions after selection
  };

  // Dropdown item selection
  const handleSelectItem = (field: string, item: any) => {
    setFormData((prev) => ({ ...prev, [field]: item }));
    setActiveDropdown(null);
  };

  // Add/remove co-instructor
  const handleAddCoInstructor = (instructor: any) => {
    if (!formData.coInstructors.some((ci) => ci.id === instructor.id)) {
      setFormData((prev) => ({
        ...prev,
        coInstructors: [...prev.coInstructors, instructor],
      }));
    }
    setActiveDropdown(null);
  };

  const handleRemoveCoInstructor = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      coInstructors: prev.coInstructors.filter((ci) => ci.id !== id),
    }));
  };

  // Create class
  const handleCreateClass = async () => {
    // Validation
    if (!formData.course?.id || !formData.section?.id || !formData.date || !formData.startTime || !formData.endTime || !formData.room?.id) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setIsCreating(true);

    try {
      const instructorIds = [instructor?.id || '', ...formData.coInstructors.map((ci) => ci.id)].filter(Boolean);

      const result = await createSpecialClass({
        universityId: userProfile?.university_id || '',
        courseId: formData.course.id,
        sectionId: formData.section.id,
        roomId: formData.room.id,
        instructorIds,
        sessionDate: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        totpRequired: formData.totpRequired,
      });

      if (result.success) {
        Alert.alert('Success', 'Class created successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create class. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Close calendar when clicking outside
  const handleCalendarOverlayPress = () => {
    setCalendarVisible(false);
  };

  // Calendar functions
  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const weeks: React.ReactElement[] = [];
    let currentWeek: React.ReactElement[] = [];

    // Helper to check if date is in semester range
    const inRangeCheck = (date: Date): boolean => {
      if (!semesterDates) return true;
      const start = new Date(semesterDates.start_date);
      const end = new Date(semesterDates.end_date);
      return date >= start && date <= end;
    };

    // Helper to check if date is selected
    const isSelectedCheck = (date: Date): boolean => {
      if (!formData.date) return false;
      const selectedDate = new Date(formData.date);
      return (
        date.getFullYear() === selectedDate.getFullYear() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getDate() === selectedDate.getDate()
      );
    };

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text></Text>
        </View>
      );
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const inRange = inRangeCheck(date);
      const isSelected = isSelectedCheck(date);

      currentWeek.push(
        <Pressable
          key={`day-${day}`}
          onPress={() => {
            if (inRange) {
              // Format date as YYYY-MM-DD without timezone issues
              const year = calendarMonth.getFullYear();
              const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
              const date = String(day).padStart(2, '0');
              const formattedDate = `${year}-${month}-${date}`;
              setFormData((prev) => ({ ...prev, date: formattedDate }));
              setCalendarVisible(false);
            }
          }}
          disabled={!inRange}
          style={[
            styles.calendarDateButton,
            !inRange && styles.calendarDateDisabled,
            isSelected && styles.calendarDateSelected,
          ]}
        >
          <Text style={[styles.calendarDateButtonText, isSelected && styles.calendarDateSelectedText]}>
            {day}
          </Text>
        </Pressable>
      );

      // When we have 7 items, push the week
      if (currentWeek.length === 7) {
        weeks.push(
          <View key={`week-${weeks.length}`} style={styles.calendarWeekRow}>
            {currentWeek}
          </View>
        );
        currentWeek = [];
      }
    }

    // Add any remaining days as final week
    if (currentWeek.length > 0) {
      // Pad with empty cells to complete the week
      while (currentWeek.length < 7) {
        currentWeek.push(
          <View key={`empty-end-${currentWeek.length}`} style={styles.calendarDay}>
            <Text></Text>
          </View>
        );
      }
      weeks.push(
        <View key={`week-${weeks.length}`} style={styles.calendarWeekRow}>
          {currentWeek}
        </View>
      );
    }

    return <>{weeks}</>;
  }, [calendarMonth, formData.date, semesterDates, styles]);

  // Dropdown component with in-place list
  const DropdownField = ({
    label,
    value,
    items,
    field,
    loading,
    disabled,
  }: {
    label: string;
    value: any;
    items: any[];
    field: string;
    loading?: boolean;
    disabled?: boolean;
  }) => {
    const isOpen = activeDropdown === field;

    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {label} <Text style={styles.required}>*</Text>
        </Text>
        <Pressable
          onPress={() => !disabled && !loading && setActiveDropdown(isOpen ? null : field)}
          disabled={disabled || loading}
          style={[
            styles.dropdownButton,
            isOpen && styles.dropdownButtonFocus,
            disabled && styles.dropdownDisabled,
            isOpen && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
                {value?.name || value?.room_name || `Select ${label}`}
              </Text>
              <MaterialIcons
                name={isOpen ? "expand-less" : "expand-more"}
                size={20}
                color={colors.textSecondary}
              />
            </>
          )}
        </Pressable>

        {/* In-place Dropdown List */}
        {isOpen && (
          <View style={styles.dropdownListContainer}>
            <ScrollView
              style={styles.dropdownList}
              scrollEnabled={items.length > 8}
              nestedScrollEnabled={true}
            >
              {items.length > 0 ? (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectItem(field, item)}
                    style={[
                      styles.dropdownItem,
                      formData[field as keyof typeof formData]?.id === item.id && styles.dropdownItemSelected,
                    ]}
                  >
                    <Text style={styles.dropdownItemText}>
                      {item.name || item.room_name} {item.code && `(${item.code})`}
                    </Text>
                    {formData[field as keyof typeof formData]?.id === item.id && (
                      <View style={styles.dropdownSelectedIndicator}>
                        <MaterialIcons name="check" size={10} color="#ffffff" />
                      </View>
                    )}
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No items available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0)} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleCancel} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Special Class</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      {/* Form Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📋 Select course structure, date/time, and location to create a new class.</Text>
          </View>
        </Animated.View>

        {/* Academic Structure */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Academic Structure</Text>

            <DropdownField label="Program" value={formData.program} items={programs} field="program" />
            <DropdownField label="Branch" value={formData.branch} items={branches} field="branch" disabled={!formData.program?.id} loading={formData.program?.id && branches.length === 0} />
            <DropdownField label="Semester" value={formData.semester} items={semesters} field="semester" disabled={!formData.program?.id} loading={formData.program?.id && semesters.length === 0} />
            <DropdownField label="Section" value={formData.section} items={sections} field="section" disabled={!formData.semester?.id} loading={formData.semester?.id && sections.length === 0} />
            <DropdownField label="Course" value={formData.course} items={courses} field="course" disabled={!formData.section?.id} loading={formData.section?.id && courses.length === 0} />
          </View>
        </Animated.View>

        {/* Date & Time */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setCalendarVisible(true)}
                style={[styles.dropdownButton, focusedField === 'date' && styles.dropdownButtonFocus]}
              >
                <Text style={[styles.dropdownText, !formData.date && styles.dropdownPlaceholder]}>
                  {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Suggested Times */}
            {suggestedTimes.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>📅 Suggested Available Times</Text>
                <View style={styles.suggestedTimesContainer}>
                  {suggestedTimes.map((slot) => (
                    <Pressable
                      key={slot.start}
                      onPress={() => handleSuggestedTime(slot)}
                      style={[
                        styles.suggestedTime,
                        formData.startTime === slot.start && styles.suggestedTimeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestedTimeText,
                          formData.startTime === slot.start && styles.suggestedTimeSelectedText,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Custom Time */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.formGroup, styles.twoColumnItem]}>
                <Text style={styles.label}>
                  Start Time <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, focusedField === 'startTime' && styles.inputFocus]}
                  placeholder="HH:mm"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.startTime}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, startTime: text }))}
                  onFocus={() => setFocusedField('startTime')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={[styles.formGroup, styles.twoColumnItem]}>
                <Text style={styles.label}>
                  End Time <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, focusedField === 'endTime' && styles.inputFocus]}
                  placeholder="HH:mm"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.endTime}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, endTime: text }))}
                  onFocus={() => setFocusedField('endTime')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Location</Text>

            <DropdownField label="Building" value={formData.building} items={buildings} field="building" />
            <DropdownField label="Room" value={formData.room} items={rooms} field="room" disabled={!formData.building?.id} />
          </View>
        </Animated.View>

        {/* Instructors */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Co-Instructors</Text>

            <View style={styles.formGroup}>
              <Pressable
                onPress={() => setActiveDropdown(activeDropdown === 'coInstructors' ? null : 'coInstructors')}
                style={[
                  styles.dropdownButton,
                  focusedField === 'coInstructors' && styles.dropdownButtonFocus,
                  activeDropdown === 'coInstructors' && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
                ]}
              >
                <Text style={styles.dropdownText}>+ Add Co-Instructors</Text>
                <MaterialIcons 
                  name={activeDropdown === 'coInstructors' ? "expand-less" : "expand-more"} 
                  size={20} 
                  color={colors.primary} 
                />
              </Pressable>

              {/* In-place Co-Instructors Dropdown */}
              {activeDropdown === 'coInstructors' && (
                <View style={styles.dropdownListContainer}>
                  <ScrollView 
                    style={styles.dropdownList}
                    scrollEnabled={coInstructorsList.length > 8}
                    nestedScrollEnabled={true}
                  >
                    {coInstructorsList.length > 0 ? (
                      coInstructorsList.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => handleAddCoInstructor(item)}
                          style={[
                            styles.dropdownItem,
                            formData.coInstructors.some((ci) => ci.id === item.id) && styles.dropdownItemSelected,
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownItemText}>{item.name}</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.email}</Text>
                          </View>
                          {formData.coInstructors.some((ci) => ci.id === item.id) && (
                            <View style={styles.dropdownSelectedIndicator}>
                              <MaterialIcons name="check" size={10} color="#ffffff" />
                            </View>
                          )}
                        </Pressable>
                      ))
                    ) : (
                      <View style={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No instructors available</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {formData.coInstructors.length > 0 && (
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {formData.coInstructors.map((ci) => (
                    <View key={ci.id} style={styles.chip}>
                      <Text style={styles.chipText}>{ci.name}</Text>
                      <Pressable onPress={() => handleRemoveCoInstructor(ci.id)} style={styles.chipClose}>
                        <MaterialIcons name="close" size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Class Settings</Text>

            <View style={styles.formGroup}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>TOTP Required</Text>
                <Pressable
                  onPress={() => setFormData((prev) => ({ ...prev, totpRequired: !prev.totpRequired }))}
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: formData.totpRequired ? colors.success : colors.backgroundAlt,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      {
                        transform: [{ translateX: formData.totpRequired ? 12 : -12 }],
                      },
                    ]}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable onPress={handleCancel} style={[styles.button, styles.cancelButton]} disabled={isCreating}>
          <MaterialIcons name="close" size={18} color={colors.textPrimary} />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleCreateClass}
          style={[styles.button, styles.createButton]}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={18} color="#ffffff" />
              <Text style={styles.createButtonText}>Create Class</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Calendar Picker Modal */}
      {calendarVisible && (
        <Pressable
          style={styles.calendarModalOverlay}
          onPress={() => setCalendarVisible(false)}
          activeOpacity={1}
        >
          <View
            style={styles.calendarModalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Header with Close Button */}
            <View style={styles.calendarTitleRow}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <Pressable onPress={() => setCalendarVisible(false)} style={styles.calendarCloseButton}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Calendar Header with Month/Year Navigation */}
            <View style={styles.calendarHeaderRow}>
              <Pressable onPress={handlePrevMonth} style={styles.calendarNavButton}>
                <MaterialIcons name="chevron-left" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.calendarHeaderText}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable onPress={handleNextMonth} style={styles.calendarNavButton}>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
              </Pressable>
            </View>

            {/* Day Names Header */}
            <View style={styles.calendarWeekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <View key={`dayname-${day}`} style={styles.calendarDay}>
                  <Text style={styles.calendarDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Days */}
            {renderCalendarDays}
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
};

export default CreateClassScreen;

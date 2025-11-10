import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
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
      flex: 1,
      textAlign: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    viewToggle: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 20,
      padding: 6,
      gap: 0,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    dateNavigationContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    dateNavigationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    dateButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    datesContainer: {
      flexGrow: 0,
      paddingHorizontal: 0,
    },
    dateItem: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      minWidth: 60,
    },
    dateItemToday: {
      backgroundColor: colors.success + '15',
    },
    dateLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    dateNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      textAlignVertical: 'center',
      textAlign: 'center',
    },
    dateNumberActive: {
      backgroundColor: colors.primary,
      color: '#FFFFFF',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    dateNumberToday: {
      backgroundColor: colors.success,
      color: '#FFFFFF',
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 120,
      paddingTop: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
      color: colors.textSecondary,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    classCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginVertical: 10,
      marginHorizontal: 0,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      borderLeftWidth: 4,
    },
    classCardUpcoming: {
      borderLeftColor: colors.warning,
    },
    classCardOngoing: {
      borderLeftColor: colors.success,
    },
    classCardCompleted: {
      borderLeftColor: colors.textSecondary,
    },
    classHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    classTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusBadgeUpcoming: {
      backgroundColor: colors.warning + '15',
    },
    statusBadgeOngoing: {
      backgroundColor: colors.success + '15',
    },
    statusBadgeCompleted: {
      backgroundColor: colors.textTertiary + '15',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTextUpcoming: {
      color: colors.warning,
    },
    statusTextOngoing: {
      color: colors.success,
    },
    statusTextCompleted: {
      color: colors.textSecondary,
    },
    classDetails: {
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 14,
      color: colors.primary,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    courseCode: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    weeklyContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    weekHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    dayColumn: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayHeader: {
      backgroundColor: colors.primaryLight,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    dayHeaderToday: {
      backgroundColor: colors.success + '20',
    },
    dayName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
    },
    dayNameToday: {
      color: colors.success,
    },
    dayDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dayClasses: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dayClassItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayClassItemLast: {
      borderBottomWidth: 0,
    },
    dayClassTime: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    dayClassName: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      marginHorizontal: 8,
    },
    dayClassStatus: {
      fontSize: 10,
      fontWeight: '600',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    dayClassStatusUpcoming: {
      backgroundColor: colors.warning + '20',
      color: colors.warning,
    },
    dayClassStatusOngoing: {
      backgroundColor: colors.success + '20',
      color: colors.success,
    },
    noDayClasses: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 60,
    },
    noDayClassesText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });

interface ScheduleClass {
  id: string;
  title: string;
  courseCode: string;
  time: string;
  duration: number;
  location: string;
  instructor: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  date: Date;
}

const generateScheduleData = (): ScheduleClass[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const classes: ScheduleClass[] = [
    {
      id: '1',
      title: 'Introduction to Psychology',
      courseCode: 'PSY101',
      time: '09:00 AM',
      duration: 90,
      location: 'Room 301, Building A',
      instructor: 'Dr. Eleanor Vance',
      status: 'upcoming',
      date: new Date(today),
    },
    {
      id: '2',
      title: 'Calculus II',
      courseCode: 'MAT202',
      time: '11:00 AM',
      duration: 90,
      location: 'Room 105, Building C',
      instructor: 'Prof. Alan Turing',
      status: 'upcoming',
      date: new Date(today),
    },
    {
      id: '3',
      title: 'Advanced Programming',
      courseCode: 'CS301',
      time: '02:00 PM',
      duration: 120,
      location: 'Lab 4B, Tech Center',
      instructor: 'Dr. Ada Lovelace',
      status: 'upcoming',
      date: new Date(today),
    },
    {
      id: '4',
      title: 'Physics Lab',
      courseCode: 'PHY151',
      time: '04:00 PM',
      duration: 120,
      location: 'Lab 2A, Science Building',
      instructor: 'Prof. Marie Curie',
      status: 'ongoing',
      date: new Date(today),
    },
    {
      id: '5',
      title: 'Data Structures',
      courseCode: 'CS201',
      time: '10:00 AM',
      duration: 90,
      location: 'Room 201, Building B',
      instructor: 'Dr. Donald Knuth',
      status: 'upcoming',
      date: new Date(today.getTime() + 86400000),
    },
    {
      id: '6',
      title: 'Linear Algebra',
      courseCode: 'MAT301',
      time: '01:00 PM',
      duration: 90,
      location: 'Room 305, Building A',
      instructor: 'Prof. Emmy Noether',
      status: 'upcoming',
      date: new Date(today.getTime() + 86400000),
    },
  ];

  return classes;
};

const getDatesBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
};

export const ViewScheduleScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const allClasses = generateScheduleData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get 7 dates around today (3 before, today, 3 after) - for better visibility
  const dates = getDatesBetween(
    new Date(today.getTime() - 3 * 86400000),
    new Date(today.getTime() + 3 * 86400000)
  );

  const selectedDateClasses = allClasses.filter((cls) => {
    const clsDate = new Date(cls.date);
    clsDate.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    return clsDate.getTime() === selDate.getTime();
  });

  const isDateToday = (date: Date): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const groupedByDay = allClasses.reduce(
    (acc, cls) => {
      const clsDate = new Date(cls.date);
      clsDate.setHours(0, 0, 0, 0);
      const key = clsDate.toISOString();

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cls);
      return acc;
    },
    {} as Record<string, ScheduleClass[]>
  );

  const handleBackPress = () => {
    router.back();
  };

  const handlePreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const renderClassCard = (
    item: ScheduleClass,
    index: number,
    isWeekly: boolean = false
  ) => {
    const statusConfig = {
      upcoming: {
        badge: 'statusBadgeUpcoming',
        text: 'statusTextUpcoming',
        card: 'classCardUpcoming',
      },
      ongoing: {
        badge: 'statusBadgeOngoing',
        text: 'statusTextOngoing',
        card: 'classCardOngoing',
      },
      completed: {
        badge: 'statusBadgeCompleted',
        text: 'statusTextCompleted',
        card: 'classCardCompleted',
      },
    };

    const config = statusConfig[item.status];

    if (isWeekly) {
      return (
        <View
          key={item.id}
          style={[
            styles.dayClassItem,
            index === item.id.length - 1 && styles.dayClassItemLast,
          ]}
        >
          <Text style={styles.dayClassTime}>{item.time}</Text>
          <Text
            style={styles.dayClassName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.dayClassStatus,
              styles[config.badge as keyof typeof styles],
              styles[config.text as keyof typeof styles],
            ]}
          >
            {item.status.charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    }

    return (
      <Animated.View
        key={item.id}
        entering={FadeInUp.delay(index * 100)}
        layout={Layout.springify()}
        style={[
          styles.classCard,
          config.card === 'classCardUpcoming' && styles.classCardUpcoming,
          config.card === 'classCardOngoing' && styles.classCardOngoing,
          config.card === 'classCardCompleted' && styles.classCardCompleted,
        ]}
      >
        <View style={styles.classHeader}>
          <Text style={styles.classTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              config.badge === 'statusBadgeUpcoming' && styles.statusBadgeUpcoming,
              config.badge === 'statusBadgeOngoing' && styles.statusBadgeOngoing,
              config.badge === 'statusBadgeCompleted' && styles.statusBadgeCompleted,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    item.status === 'upcoming'
                      ? colors.warning
                      : item.status === 'ongoing'
                        ? colors.success
                        : colors.textSecondary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                config.text === 'statusTextUpcoming' && styles.statusTextUpcoming,
                config.text === 'statusTextOngoing' && styles.statusTextOngoing,
                config.text === 'statusTextCompleted' && styles.statusTextCompleted,
              ]}
            >
              {item.status === 'upcoming'
                ? 'Upcoming'
                : item.status === 'ongoing'
                  ? 'Ongoing'
                  : 'Completed'}
            </Text>
          </View>
        </View>

        <View style={styles.classDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="schedule"
              size={18}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <Text style={styles.detailText}>
              {item.time} - {item.duration} mins
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="location-on"
              size={18}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="person"
              size={18}
              color={colors.primary}
              style={styles.detailIcon}
            />
            <Text style={styles.detailText}>{item.instructor}</Text>
          </View>
          <Text style={styles.courseCode}>Course Code: {item.courseCode}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderDailyView = () => {
    if (selectedDateClasses.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="event-busy"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText}>
            No classes scheduled for{'\n'}
            {formatDate(selectedDate)}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedDateClasses.map((item, index) =>
          renderClassCard(item, index, false)
        )}
      </ScrollView>
    );
  };

  const renderWeeklyView = () => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekDates = getDatesBetween(weekStart, weekEnd);

    return (
      <ScrollView
        contentContainerStyle={styles.weeklyContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.weekHeader}>This Week</Text>

        {weekDates.map((date, dayIndex) => {
          const dayKey = new Date(date);
          dayKey.setHours(0, 0, 0, 0);
          const dayClasses = groupedByDay[dayKey.toISOString()] || [];
          const isDayToday = isDateToday(date);

          return (
            <Animated.View
              key={date.toISOString()}
              entering={FadeInDown.delay(dayIndex * 50)}
              style={styles.dayColumn}
            >
              <View
                style={[
                  styles.dayHeader,
                  isDayToday && styles.dayHeaderToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    isDayToday && styles.dayNameToday,
                  ]}
                >
                  {getDayName(date)}
                </Text>
                <Text style={styles.dayDate}>{formatDate(date)}</Text>
              </View>

              <View style={styles.dayClasses}>
                {dayClasses.length > 0 ? (
                  dayClasses.map((cls, idx) =>
                    renderClassCard(cls, idx, true)
                  )
                ) : (
                  <View style={styles.noDayClasses}>
                    <Text style={styles.noDayClassesText}>No classes</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.cardBackground}
        translucent={false}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.iconButton}
            onPress={handleBackPress}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>

          <Text style={styles.headerTitle}>My Schedule</Text>

          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(main)/profile' as any)}>
              <Image
                source={
                  theme === 'light'
                    ? require('@/assets/images/profile-icon4.png')
                    : require('@/assets/images/profile-icon3.png')
                }
                style={styles.profileIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* View Toggle */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={styles.viewToggle}
      >
        {['daily', 'weekly'].map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.toggleButton,
              viewMode === mode && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode(mode as 'daily' | 'weekly')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === mode && styles.toggleTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Date Navigation - Only show in Daily mode */}
      {viewMode === 'daily' && (
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.dateNavigationContainer}
        >
          <View style={styles.dateNavigationContent}>
            <Pressable
              style={styles.dateButton}
              onPress={handlePreviousDay}
            >
              <MaterialIcons
                name="chevron-left"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.datesContainer}
              contentContainerStyle={{ gap: 12 }}
              scrollIndicatorInsets={{ right: 1 }}
            >
              {dates.map((date) => {
                const isSelected =
                  new Date(date).toDateString() ===
                  new Date(selectedDate).toDateString();
                const isToday = isDateToday(date);

                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[
                      styles.dateItem,
                      isToday && styles.dateItemToday,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={styles.dateLabel}>
                      {date
                        .toLocaleDateString('en-US', { weekday: 'short' })
                        .toUpperCase()}
                    </Text>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isSelected
                          ? isToday
                            ? colors.success
                            : colors.primary
                          : 'transparent',
                        shadowColor: isSelected ? (isToday ? colors.success : colors.primary) : 'transparent',
                        shadowOffset: isSelected ? { width: 0, height: 4 } : { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.35 : 0,
                        shadowRadius: isSelected ? 8 : 0,
                        elevation: isSelected ? 6 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: isSelected
                            ? '#FFFFFF'
                            : colors.textPrimary,
                        }}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.dateButton}
              onPress={handleNextDay}
            >
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {viewMode === 'daily'
          ? renderDailyView()
          : renderWeeklyView()}
      </View>
    </View>
  );
};

export default ViewScheduleScreen;

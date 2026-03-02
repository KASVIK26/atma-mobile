import { useAuth } from '@/context/AuthContext';
import { StudentDashboard } from '@/screens/dashboards/StudentDashboard';
import { TeacherDashboard } from '@/screens/dashboards/TeacherDashboard';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, View } from 'react-native';

export default function Home() {
  const { isTeacher, isStudent, isLoading } = useAuth();

  // Android hardware back button — show exit confirmation ONLY when this screen is focused.
  // useFocusEffect adds/removes the handler as the screen gains/loses focus, so sub-screens
  // (e.g. StartAttendance) don't accidentally trigger the exit dialog when the user presses back.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Exit ATMA',
          'Are you sure you want to exit the app?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true }
        );
        // Return true to prevent the default back action (which would go to recents)
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // While the auth system is initialising show a full-screen spinner so that
  // we never briefly flash placeholder/default values at the user.
  // NOTE: do NOT block on (session && !userProfile) here — that combination is
  // handled by the routing effect in AuthContext which redirects to the welcome
  // screen when the profile can't be loaded.  Blocking on it in the UI creates
  // an infinite spinner if network is down.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Route to the correct dashboard based on persisted role.
  if (isTeacher) {
    return <TeacherDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  // Fallback spinner if session exists but profile is still being resolved.
  // AuthContext routing will redirect to welcome if the profile never loads.
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

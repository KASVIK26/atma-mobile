import { BottomTabBar } from '@/components/BottomTabBar';
import { useTheme } from '@/context/ThemeContext';
import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

export default function MainLayout() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const styles = StyleSheet.create(createStyles(colors));

  // Hide tab bar for view-schedule screen
  const showTabBar = !pathname.includes('view-schedule');

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="home"
          options={{
            title: 'Home',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="classes"
          options={{
            title: 'Classes',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            title: 'History',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Stack.Screen
          name="view-schedule"
          options={{
            title: 'View Schedule',
          }}
        />
      </Stack>

      {showTabBar && <BottomTabBar />}
    </View>
  );
}

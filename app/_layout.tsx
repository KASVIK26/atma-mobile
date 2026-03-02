import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/authStore';

// ── Sentry error monitoring ────────────────────────────────────────────────────
// DSN is loaded from EXPO_PUBLIC_SENTRY_DSN in your .env file.
// Only initialize if a valid DSN is provided (not empty, not placeholder).
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const isValidSentryDsn =
  sentryDsn &&
  sentryDsn.length > 0 &&
  !sentryDsn.includes('your_sentry_dsn_here');

if (isValidSentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // Capture 20 % of traces in production; 100 % in dev for easier debugging.
    tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    enabled: true,
  });
}

// ── Keep the splash screen visible until auth hydration completes ─────────────
// Using preventAutoHideAsync at module level ensures it's called synchronously
// before ANY rendering happens — the native splash persists until we call hideAsync.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. fast reload in Expo Go) — safe to ignore.
});

/**
 * Splash-screen controller.
 * Hides the native splash screen once auth hydration (`isLoading`) is complete.
 * Lives inside AuthProvider so it can access the Zustand store.
 */
function SplashController() {
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      // Short delay so the first meaningful screen frame has painted
      const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 150);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // ErrorBoundary wraps everything so uncaught render errors show a recovery
    // screen instead of a white crash.
    <ErrorBoundary>
      <SafeAreaProvider>
        {/*
          QueryClientProvider must wrap the entire tree so every screen can call
          useQuery / useMutation and share the same cache.
        */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* Hide splash after auth hydration — must be inside AuthProvider */}
            <SplashController />
            <CustomThemeProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="(main)" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  <Stack.Screen name="student-dashboard" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="teacher-dashboard" options={{ headerShown: false, gestureEnabled: false }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </CustomThemeProvider>
            {/*
              Toast must render INSIDE the provider tree (for theme access) but
              OUTSIDE the Stack so it floats above all screens.
            */}
            <Toast />
          </AuthProvider>
        </QueryClientProvider>
        {/* Global offline indicator — floats above all screens */}
        <NetworkStatusBanner />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}


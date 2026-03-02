/**
 * NetworkStatusBanner
 *
 * Shows a slim animated banner at the top of the screen whenever the device
 * loses internet connectivity, and hides it automatically when connectivity
 * is restored.
 *
 * Mount this once near the root of your app (inside _layout.tsx) so it
 * appears on every screen without any per-screen wiring.
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NetworkStatusBanner() {
  const isOnline = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Animate the banner in/out smoothly
  const translateY = useRef(new Animated.Value(-60)).current;
  const prevOnline = useRef(true);

  useEffect(() => {
    if (!isOnline && prevOnline.current) {
      // Going offline — slide the banner down into view
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }).start();
    } else if (isOnline && !prevOnline.current) {
      // Coming back online — slide it back up after a short delay
      setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -60,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }, 1500);
    }
    prevOnline.current = isOnline;
  }, [isOnline, translateY]);

  // Don't render the DOM node at all while definitely online on first load
  if (isOnline && prevOnline.current) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.text}>
          {isOnline ? 'Back online' : 'No internet connection'}
        </Text>
      </View>
    </Animated.View>
  );
}

export default NetworkStatusBanner;

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOffline: {
    backgroundColor: '#F87171',
  },
  dotOnline: {
    backgroundColor: '#34D399',
  },
  text: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '500',
  },
});

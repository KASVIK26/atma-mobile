import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 5,
    },
    content: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
    },
    icon: {
      fontSize: 24,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

interface TabItem {
  name: string;
  icon: string;
  label: string;
  route: string;
}

const tabs: TabItem[] = [
  { name: 'home', icon: 'home', label: 'Home', route: '/(main)/home' },
  { name: 'classes', icon: 'calendar-month', label: 'Classes', route: '/(main)/classes' },
  { name: 'history', icon: 'history', label: 'History', route: '/(main)/history' },
  { name: 'profile', icon: 'person', label: 'Profile', route: '/(main)/profile' },
];

export const BottomTabBar = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isActive = (route: string) => {
    return pathname === route;
  };

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <Pressable
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.route)}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={24}
                color={active ? colors.primary : colors.textSecondary}
                style={styles.icon}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

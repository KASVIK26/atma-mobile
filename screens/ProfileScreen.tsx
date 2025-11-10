import { ProfileCard } from '@/components/ProfileCard';
import { ProfileMenuItem } from '@/components/ProfileMenuItem';
import { SettingsMenuItem } from '@/components/SettingsMenuItem';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 24,
      paddingHorizontal: 4,
    },
    sectionContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 16,
    },
    logoutButton: {
      backgroundColor: colors.danger,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 32,
      marginBottom: 24,
      shadowColor: colors.danger,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export const ProfileScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: () => {
          // Navigate to welcome screen
          router.replace('/(auth)/welcome' as any);
        },
        style: 'destructive',
      },
    ]);
  };

  const accountMenuItems = [
    { icon: 'add-a-photo', label: 'Change Avatar' },
    { icon: 'badge', label: 'Update Name' },
    { icon: 'lock-reset', label: 'Change Password' },
    { icon: 'link', label: 'Link University' },
  ];

  const settingsMenuItems = [
    { icon: 'dark-mode', label: 'App Theme' },
    { icon: 'notifications', label: 'Notifications' },
    { icon: 'privacy-tip', label: 'Privacy Policy' },
    { icon: 'help', label: 'Help & Support' },
  ];

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
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="school" size={24} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Atma Mobile</Text>
          </View>
          <View style={styles.profileButton}>
            <Image
              source={
                theme === 'light'
                  ? require('@/assets/images/profile-icon4.png')
                  : require('@/assets/images/profile-icon3.png')
              }
              style={styles.profileIcon}
              resizeMode="contain"
            />
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <ProfileCard
            name="Jordan Smith"
            email="j.smith@university.edu"
            university="Quantum University"
            role="Student"
            avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuC4yhDmcoWBfJZjre92INShL3L5yJMy4kKLZouyHkSLzHzZeKXJz0XbbpqcAprY-urIPDR8Q93fFgmTZHI6ItWhBwTkFpHRkR4rnK8RaOL6GNHTdb5TkfaR4sduvKvrg5GC2wwqUn7aAfQeaCS5pnb79Xo4jMR45kCYdh4pajArRmNIFaliVZIUXTdnHTnudnTN-aa4ZoOkt46ocBzhgRCI5QdPdr31gIgwfnC2DaVUT6xEymB0W9fpNIU5rNtN-cApOR7HIAmeMrmW"
            colors={colors}
          />
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContainer}>
            {accountMenuItems.map((item, index) => (
              <ProfileMenuItem
                key={index}
                icon={item.icon}
                label={item.label}
                onPress={() => {}}
                colors={colors}
                showBorder={index < accountMenuItems.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        {/* Settings Section */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.sectionContainer}>
            <SettingsMenuItem
              icon="dark-mode"
              label="App Theme"
              colors={colors}
              hasToggle={true}
              toggleValue={theme === 'dark'}
              onToggle={toggleTheme}
              showBorder={true}
            />
            <ProfileMenuItem
              icon="notifications"
              label="Notifications"
              onPress={() => {}}
              colors={colors}
              showBorder={true}
            />
            <ProfileMenuItem
              icon="privacy-tip"
              label="Privacy Policy"
              onPress={() => {}}
              colors={colors}
              showBorder={true}
            />
            <ProfileMenuItem
              icon="help"
              label="Help & Support"
              onPress={() => {}}
              colors={colors}
              showBorder={false}
            />
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.delay(400)}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

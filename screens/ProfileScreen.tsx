import { ProfileCard } from '@/components/ProfileCard';
import { ProfileMenuItem } from '@/components/ProfileMenuItem';
import { SettingsMenuItem } from '@/components/SettingsMenuItem';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { pickAndUploadImage } from '@/lib/image-upload';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  const { signOut, user, userProfile, updateUserProfile } = useAuth();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const handlePhotoUpload = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    setIsUploadingImage(true);
    try {
      const { url, error } = await pickAndUploadImage(user.id);

      if (error) {
        console.error('[handlePhotoUpload] Error:', error);
        Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
        return;
      }

      if (url) {
        // Update user profile with new image URL
        const { error: updateError } = await updateUserProfile({
          profile_picture_url: url,
        } as any);

        if (updateError) {
          Alert.alert('Error', 'Failed to update profile picture');
          return;
        }

        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (error) {
      console.error('[handlePhotoUpload] Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            // Clear auth state
            await signOut();
            
            // Explicitly navigate to login screen
            // Use setTimeout to ensure state updates complete before navigation
            setTimeout(() => {
              router.replace('/(auth)/welcome' as any);
            }, 100);
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const accountMenuItems = [
    { icon: 'edit', label: 'Change Profile' },
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
              <Image
                source={require('@/assets/images/ATMA-LOGO.png')}
                style={{ width: 40, height: 40, borderRadius: 10 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>ATMA</Text>
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
            name={userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'User'}
            email={userProfile?.email || 'No email'}
            university={userProfile?.university_name || 'No university'}
            role={userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'User'}
            avatarUrl={userProfile?.profile_picture_url}
            colors={colors}
            instructorCode={userProfile?.role?.toLowerCase() === 'teacher' ? userProfile?.instructor_code : undefined}
            department={userProfile?.role?.toLowerCase() === 'teacher' ? userProfile?.department : undefined}
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
                onPress={() => {
                  if (item.label === 'Change Profile') {
                    handlePhotoUpload();
                  }
                }}
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

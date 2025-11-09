import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Platform.OS === 'android' ? 8 : 0,
    },
    header: {
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 16 : 12,
      paddingBottom: 12,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBg: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBrand: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    mainContent: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    headlineSection: {
      marginBottom: 24,
    },
    headline: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 28,
    },
    avatarBox: {
      position: 'relative',
      width: 100,
      height: 100,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    formCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formGroup: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 10,
    },
    inputWrapperFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    inputWrapperError: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerLight,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    errorMessage: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 8,
    },
    signupButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    signupButtonPressed: {
      opacity: 0.8,
    },
    buttonLoading: {
      opacity: 0.7,
    },
    signupButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    dividerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    socialSection: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 8,
    },
    socialButtonPressed: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.primary,
    },
    socialIcon: {
      width: 20,
      height: 20,
    },
    socialButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    signinSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
    },
    signinText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    signinLink: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default function StudentSignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (confirmPassword && text !== confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (password && text !== password) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  };

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid', 'Please enter a valid email');
      return;
    }

    if (!university.trim()) {
      Alert.alert('Required', 'Please select your university');
      return;
    }

    if (!enrollmentNumber.trim()) {
      Alert.alert('Required', 'Please enter your enrollment number');
      return;
    }

    if (!password) {
      Alert.alert('Required', 'Please enter a password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Required', 'Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Invalid', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/student-dashboard');
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoSection}>
              <Image
                source={require('@/assets/images/ATMA-LOGO.png')}
                style={styles.logoBg}
                resizeMode="contain"
              />
              <Text style={styles.headerBrand}>ATMA</Text>
            </View>
            <Pressable style={styles.profileButton}>
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
          <View style={styles.headerDivider} />
        </Animated.View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Headline */}
            <Animated.View entering={FadeInUp.delay(100)} style={styles.headlineSection}>
              <Text style={styles.headline}>Create Student Account</Text>
              <Text style={styles.subtitle}>Get started with Atma Mobile</Text>
            </Animated.View>

            {/* Avatar Section */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.avatarSection}>
              <View style={styles.avatarBox}>
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={56} color="#D1D5DB" />
                </View>
                <Pressable style={styles.cameraButton} disabled={isLoading}>
                  <MaterialIcons name="camera-alt" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </Animated.View>

            {/* Form Card */}
            <Animated.View entering={FadeInUp.delay(300)} style={styles.formCard}>
              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'fullName' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="person" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#D1D5DB"
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="email" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* University */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>University</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'university' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="school" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Search or select university"
                    placeholderTextColor="#D1D5DB"
                    value={university}
                    onChangeText={setUniversity}
                    onFocus={() => setFocusedField('university')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                  <MaterialIcons name="search" size={20} color="#9CA3AF" />
                </View>
              </View>

              {/* Enrollment */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Enrollment Number</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'enrollment' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="badge" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter enrollment number"
                    placeholderTextColor="#D1D5DB"
                    value={enrollmentNumber}
                    onChangeText={setEnrollmentNumber}
                    onFocus={() => setFocusedField('enrollment')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="lock" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Create a password"
                    placeholderTextColor="#D1D5DB"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                  passwordMismatch && styles.inputWrapperError,
                ]}>
                  <MaterialIcons name="lock" size={20} color={passwordMismatch ? '#EF4444' : '#9CA3AF'} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your password"
                    placeholderTextColor="#D1D5DB"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}>
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={passwordMismatch ? '#EF4444' : '#9CA3AF'}
                    />
                  </Pressable>
                </View>
                {passwordMismatch && (
                  <Text style={styles.errorMessage}>Passwords do not match</Text>
                )}
              </View>

              {/* Sign Up Button */}
              <Animated.View entering={FadeInUp.delay(400)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.signupButton,
                    pressed && styles.signupButtonPressed,
                    isLoading && styles.buttonLoading,
                  ]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                >
                  <Text style={styles.signupButtonText}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.dividerSection}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Social Auth */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.socialSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                disabled={isLoading}
              >
                <Image
                  source={require('@/assets/images/google-logo.png')}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>Google</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                disabled={isLoading}
              >
                <Image
                  source={require('@/assets/images/apple-logo.png')}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>Apple</Text>
              </Pressable>
            </Animated.View>

            {/* Sign In Link */}
            <Animated.View entering={FadeInUp.delay(700)} style={styles.signinSection}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.signinLink}>Sign In</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

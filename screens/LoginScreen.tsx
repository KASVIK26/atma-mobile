import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingTop: 12,
    paddingBottom: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBg: {
    width: 48,
    height: 48,
    borderRadius: 8,
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
    paddingVertical: 32,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    marginBottom: 24,
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
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loginButton: {
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
  loginButtonPressed: {
    opacity: 0.8,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  loginButtonText: {
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
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  signupText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text && !validateEmail(text)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError('');
    }
  };

  const handleLogin = async () => {
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Invalid email format');
      return;
    }

    if (!password) {
      alert('Please enter your password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/(tabs)');
    }, 1000);
  };

  const handleForgotPassword = () => {
    alert('Forgot password functionality coming soon');
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
        {/* Header Section */}
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
                    ? require('@/assets/images/profile-icon1.png')
                    : require('@/assets/images/profile-icon2.png')
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
            {/* Welcome Text */}
            <Animated.View entering={FadeInUp.delay(100)} style={styles.welcomeSection}>
              <Text style={styles.headline}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.formCard}>
              {/* Email Field */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                  emailError && styles.inputWrapperError,
                ]}>
                  <MaterialIcons name="email" size={20} color={emailError ? colors.danger : colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your university email"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                </View>
                {emailError && (
                  <Text style={styles.errorMessage}>{emailError}</Text>
                )}
              </View>

              {/* Password Field */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}>
                  <MaterialIcons name="lock" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Animated.View entering={FadeInUp.delay(300)} style={styles.forgotContainer}>
                <Pressable onPress={handleForgotPassword} disabled={isLoading}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </Pressable>
              </Animated.View>

              {/* Login Button */}
              <Animated.View entering={FadeInUp.delay(400)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.loginButtonPressed,
                    isLoading && styles.buttonLoading,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
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

            {/* Sign Up Link */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.signupSection}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/role-selection')}>
                <Text style={styles.signupLink}>Create Account</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

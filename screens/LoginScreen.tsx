import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
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
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  mainContent: {
    flex: 1,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    fontFamily: 'Lexend',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Lexend',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
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
    fontFamily: 'Lexend',
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
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
    fontFamily: 'Lexend',
  },
  errorMessage: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 8,
    fontFamily: 'Lexend',
  },
  button: {
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
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Lexend',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'Lexend',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginVertical: 24,
  },
  otpBox: {
    width: 40,
    height: 60,
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Lexend',
  },
  timerText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    fontFamily: 'Lexend',
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
    fontFamily: 'Lexend',
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
    fontFamily: 'Lexend',
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Lexend',
  },
});

// ============================================================================
// OTP INPUT COMPONENT
// ============================================================================

const OTPInput = ({
  value,
  onChangeText,
  colors,
  length = 8,
}: {
  value: string;
  onChangeText: (text: string) => void;
  colors: any;
  length?: number;
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const limited = cleaned.slice(0, length);
    onChangeText(limited);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <Pressable onPress={handleContainerPress}>
        <View style={styles.otpContainer}>
          {Array.from({ length }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                {
                  borderColor:
                    value.length > index ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.otpBoxText}>{value[index] || ''}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        style={{
          position: 'absolute',
          left: -1000,
          width: 50,
          height: 50,
          backgroundColor: 'transparent',
          color: 'transparent',
          fontSize: 1,
        }}
        caretHidden={true}
        autoFocus
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type LoginStep = 'email' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Flow state
  const [currentStep, setCurrentStep] = useState<LoginStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email step
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

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

  const sendOTP = async () => {
    try {
      if (!email.trim()) {
        setEmailError('Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setEmailError('Invalid email format');
        return;
      }

      console.log('[Login OTP] Initiating OTP send...', {
        email: email.substring(0, 5) + '***',
      });

      setLoading(true);
      setError('');

      // Send OTP - user must already exist for login
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create user for login - account must exist
          emailRedirectTo: undefined,
        },
      });

      if (otpError) {
        console.error('[Login OTP] Supabase error:', {
          code: otpError.code,
          message: otpError.message,
          status: otpError.status,
        });

        // Handle specific error cases
        if (otpError.message?.includes('Email not confirmed')) {
          setError('Email not registered. Please create an account.');
        } else if (otpError.message?.includes('Invalid')) {
          setError('Email not found. Please check and try again.');
        } else {
          setError(otpError.message || 'Failed to send OTP. Please try again.');
        }
        return;
      }

      console.log('[Login OTP] ✅ OTP sent successfully');
      setOtpTimer(600); // 10 minutes
      setOtpSent(true);
      setOtpAttempts(0);
      setCurrentStep('otp');

      // Start countdown timer
      const timerId = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            console.log('[Login OTP] ⏰ Timer expired');
            setOtpSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      Alert.alert('OTP Sent', `Verification code sent to ${email}. Valid for 10 minutes.`);
    } catch (err: any) {
      console.error('[Login OTP] Exception caught:', {
        message: err.message,
        code: err.code,
      });
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      if (!otp || otp.length < 8) {
        setError('Please enter the complete 8-digit code');
        return;
      }

      console.log('[Login Verify] Starting OTP verification...', {
        otpLength: otp.length,
        attempts: otpAttempts,
      });

      setLoading(true);
      setError('');
      setOtpAttempts(otpAttempts + 1);

      // Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (verifyError) {
        console.error('[Login Verify] OTP verification failed:', {
          code: verifyError.code,
          message: verifyError.message,
        });

        if (verifyError.message?.includes('Invalid')) {
          setError('Invalid OTP. Please check and try again.');
        } else if (verifyError.message?.includes('expired')) {
          setError('OTP has expired. Please request a new one.');
        } else {
          setError(verifyError.message || 'Verification failed. Please try again.');
        }
        return;
      }

      console.log('[Login Verify] ✅ OTP verified successfully!');

      // Redirect to home
      console.log('[Login] Redirecting to home...');
      router.replace('/(main)/home');
    } catch (err: any) {
      console.error('[Login Verify] Exception caught:', {
        message: err.message,
        code: err.code,
      });
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    console.log('[Login Resend] Resending OTP...');
    setOtp('');
    setOtpAttempts(0);
    await sendOTP();
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Welcome Text */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.welcomeSection}>
            <Text style={styles.headline}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account with email and verification code</Text>
          </Animated.View>

          {/* Email Step */}
          {currentStep === 'email' && (
            <Animated.View entering={FadeInUp.delay(200)} style={styles.formCard}>
              {error && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.errorMessage, { marginTop: 0 }]}>{error}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputWrapperFocused,
                    emailError && styles.inputWrapperError,
                  ]}
                >
                  <MaterialIcons
                    name="email"
                    size={20}
                    color={emailError ? colors.danger : colors.textTertiary}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your university email"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    editable={!loading}
                  />
                </View>
                {emailError && <Text style={styles.errorMessage}>{emailError}</Text>}
              </View>

              <Animated.View entering={FadeInUp.delay(300)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={sendOTP}
                  disabled={loading || !!emailError}
                >
                  <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}

          {/* OTP Step */}
          {currentStep === 'otp' && (
            <Animated.View entering={FadeInUp.delay(200)} style={styles.formCard}>
              {error && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.errorMessage, { marginTop: 0 }]}>{error}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Verification Code</Text>
                <Text style={[styles.subtitle, { marginBottom: 16 }]}>
                  Enter the 8-digit code sent to {email}
                </Text>

                <OTPInput value={otp} onChangeText={setOtp} colors={colors} length={8} />
              </View>

              {otpTimer > 0 && (
                <Text style={styles.timerText}>Code expires in {formatTimer(otpTimer)}</Text>
              )}

              <Animated.View entering={FadeInUp.delay(300)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={verifyOTP}
                  disabled={loading || otp.length < 8}
                >
                  <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify & Sign In'}</Text>
                </Pressable>

                {otpTimer > 0 && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleResendOTP}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>Resend Code</Text>
                  </Pressable>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    setCurrentStep('email');
                    setOtp('');
                    setError('');
                    setOtpSent(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Back to Email</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

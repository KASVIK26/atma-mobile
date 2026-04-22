import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import supabase from '@/lib/supabase';
import { checkInstructorSignupEligibility, lookupInstructor } from '@/lib/teacher-lookup';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');


// ============================================================================
// STYLES
// ============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 60,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
      fontFamily: 'Lexend',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: 'Lexend',
    },
    progressContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 28,
    },
    progressBar: {
      flex: 1,
      height: 8,
      borderRadius: 4,
    },
    errorContainer: {
      backgroundColor: colors.dangerLight || '#FEF2F2',
      borderLeftWidth: 4,
      borderLeftColor: colors.danger || '#EF4444',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 24,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      color: colors.danger || '#EF4444',
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
      fontFamily: 'Lexend',
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: 'Lexend',
    },
    sectionSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 28,
      fontFamily: 'Lexend',
      lineHeight: 22,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.textPrimary,
      marginBottom: 16,
      fontSize: 15,
      fontFamily: 'Lexend',
      backgroundColor: colors.inputBackground,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    dropdownButton: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 18,
      backgroundColor: colors.inputBackground,
      marginBottom: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownButtonFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    dropdownText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontFamily: 'Lexend',
      fontWeight: '500',
    },
    dropdownPlaceholder: {
      color: colors.textTertiary,
      fontFamily: 'Lexend',
    },
    dropdownList: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      backgroundColor: colors.cardBackground,
      maxHeight: 300,
      marginBottom: 16,
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight || colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dropdownItemText: {
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
      fontFamily: 'Lexend',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
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
    resendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    resendText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: 'Lexend',
    },
    resendButton: {
      padding: 4,
    },
    resendButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      fontFamily: 'Lexend',
    },
    timerText: {
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      fontFamily: 'Lexend',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: 'Lexend',
    },
    secondaryButton: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.primary,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Lexend',
    },
  });

interface University {
  id: string;
  name: string;
  short_code: string;
}

type CurrentStep = 'university' | 'lookup' | 'otp' | 'verifying';

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
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus keyboard when component mounts
  useEffect(() => {
    // Try immediate focus first
    inputRef.current?.focus();
    
    // Also try after a short delay as backup
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const limited = cleaned.slice(0, length);
    onChangeText(limited);
  };

  return (
    <View style={{ position: 'relative', width: '100%' }}>
      <View style={styles.otpContainer}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.otpBox,
              {
                borderColor:
                  value.length > index ? colors.primary : colors.border,
                borderWidth: isFocused && value.length === index ? 2 : 1.5,
              },
            ]}
          >
            <Text style={styles.otpBoxText}>{value[index] || ''}</Text>
          </View>
        ))}
      </View>
      
      {/* TextInput overlays the entire OTP container - any tap here focuses the input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          color: 'transparent',
          backgroundColor: 'transparent',
          fontSize: 1,
          padding: 0,
          margin: 0,
        }}
        caretHidden={true}
        autoFocus={true}
        selectTextOnFocus={true}
      />
    </View>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function TeacherSignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshUserProfile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // State: University Selection
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);

  // State: Instructor Lookup
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [instructorData, setInstructorData] = useState<any>(null);

  // State: OTP Verification
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // State: UI Control
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [universityError, setUniversityError] = useState('');
  const [currentStep, setCurrentStep] = useState<CurrentStep>('university');

  // Fetch universities on mount
  React.useEffect(() => {
    console.log('[TeacherSignup] Component mounted');
    fetchUniversities();
  }, []);

  // OTP Timer
  React.useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const fetchUniversities = async () => {
    try {
      console.log('[Fetch Universities] Starting fetch...');
      setLoading(true);
      setUniversityError('');

      const { data, error: err } = await supabase
        .from('universities')
        .select('id, name, short_code')
        .eq('is_active', true)
        .order('name');

      if (err) throw err;

      console.log('[Fetch Universities] ✅ Success! Fetched:', data?.length || 0, 'universities');
      setUniversities(data || []);
    } catch (err: any) {
      console.error('[Fetch Universities] ❌ Error:', err.message);
      setUniversityError('Error loading universities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUniversitySelect = (university: University) => {
    console.log('[University Selection] Selected:', university.name);
    setSelectedUniversity(university);
    setShowUniversityDropdown(false);
    setError('');
    setCurrentStep('lookup');
  };

  const validateInputs = () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleInstructorLookup = async () => {
    try {
      if (!validateInputs() || !selectedUniversity) return;

      console.log('[Instructor Lookup] Starting lookup...', {
        university: selectedUniversity.name,
        name,
        email,
      });

      setLoading(true);
      setError('');

      // Lookup instructor in database
      const lookupResult = await lookupInstructor(selectedUniversity.id, name, email);
      console.log('[Instructor Lookup] Result:', lookupResult);

      // Check eligibility
      const { eligible, message } = checkInstructorSignupEligibility(lookupResult);

      if (!eligible) {
        console.warn('[Instructor Lookup] Not eligible:', message);
        setError(message || 'Unable to proceed with signup');
        return;
      }

      console.log('[Instructor Lookup] ✅ Eligible! Storing instructor data...');
      setInstructorData(lookupResult.instructor);
      console.log('[Instructor Lookup] ✅ Proceeding to OTP...');
      setCurrentStep('otp');
    } catch (err: any) {
      console.error('[Instructor Lookup] ❌ Error:', err.message);
      setError(err.message || 'Lookup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      // Use instructor's email from lookup to ensure it matches exactly
      const otpEmail = instructorData?.email || email;
      console.log('[Send OTP] Sending magic link to:', otpEmail);
      setLoading(true);
      setError('');

      // Send magic link via Supabase (no OTP form needed, we'll use email flow)
      const { error: err } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (err) throw err;

      console.log('[Send OTP] ✅ Magic link sent! Check your email');
      setOtpSent(true);
      setOtpTimer(300); // 5 minute timer
      setOtpAttempts(0);
    } catch (err: any) {
      console.error('[Send OTP] ❌ Error:', err.message);
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!otp.trim()) {
        setError('Please enter the verification code from your email');
        return;
      }

      console.log('[Verify OTP] Verifying code...');
      setLoading(true);
      setError('');

      // Verify the token from magic link
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      console.log('[Verify OTP] ✅ OTP verified! Creating user profile...');
      setCurrentStep('verifying');

      // Get the authenticated session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) throw new Error('Failed to get session');

      // Create user profile with teacher role
      // Use email from instructor lookup (most reliable source)
      const userEmail = instructorData?.email || session.user.email || email;
      console.log('[Create User Profile] Creating with role=teacher...');
      const userPayload: any = {
        id: session.user.id,
        email: userEmail,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '',
        university_id: selectedUniversity?.id,
        role: 'teacher',
        is_active: true,
      };

      // Add instructor-specific fields if available
      if (instructorData?.code) {
        userPayload.instructor_code = instructorData.code;
      }
      if (instructorData?.department) {
        userPayload.department = instructorData.department;
      }

      console.log('[Create User Profile] Payload:', {
        id: userPayload.id.substring(0, 8) + '***',
        email,
        role: userPayload.role,
        instructor_code: userPayload.instructor_code,
        department: userPayload.department,
      });

      const { error: profileError } = await supabase.from('users').insert(userPayload);

      if (profileError) throw profileError;

      console.log('[Create User Profile] ✅ Profile created!');

      // Refresh profile in AuthContext to populate state
      await refreshUserProfile(session.user.id);
      console.log('[Create User Profile] ✅ Profile refreshed in context!');

      // Manually activate instructor record to ensure it's done
      if (instructorData?.id) {
        console.log('[Activate Instructor] Manually activating instructor record...');
        const { error: updateError, data: updateData } = await supabase
          .from('instructors')
          .update({ 
            is_active: true, 
            user_id: session.user.id, 
            updated_at: new Date().toISOString()
          })
          .eq('id', instructorData.id);

        if (updateError) {
          console.warn('[Activate Instructor] ⚠️ Error:', updateError.message, updateError);
        } else {
          console.log('[Activate Instructor] ✅ Instructor record activated! Data:', updateData);
        }
      }

      console.log('[Teacher Signup] ✅ Registration complete!');

      // Brief delay before navigation
      setTimeout(() => {
        const fullName = name;
        const currentHour = new Date().getHours();
        let greeting = 'Good morning';
        if (currentHour >= 12 && currentHour < 18) greeting = 'Good afternoon';
        else if (currentHour >= 18) greeting = 'Good evening';

        Alert.alert(`${greeting}, ${fullName.split(' ')[0]}! 👋`, 'Your instructor account has been activated. Welcome to ATMA!', [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/teacher-dashboard');
            },
          },
        ]);
      }, 500);
    } catch (err: any) {
      console.error('[Verify OTP] ❌ Error:', err.message);
      setOtpAttempts(otpAttempts + 1);
      if (otpAttempts >= 2) {
        setError('Too many attempts. Please request a new code.');
        setOtpSent(false);
        setOtp('');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } finally {
      setLoading(false);
      setCurrentStep('otp');
    }
  };

  const progressSteps = ['university', 'lookup', 'otp'];
  const currentStepIndex = progressSteps.indexOf(currentStep);
  const progressPercentage = (currentStepIndex + 1) / progressSteps.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Header */}
        <Animated.View style={styles.header} entering={FadeInDown.delay(0)}>
          <Text style={styles.title}>Teacher Sign Up</Text>
          <Text style={styles.subtitle}>Join as an instructor</Text>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View style={styles.progressContainer} entering={FadeInDown.delay(100)}>
          {progressSteps.map((step, index) => (
            <View
              key={step}
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    index < currentStepIndex + 1 ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Error Alert */}
        {error ? (
          <Animated.View style={styles.errorContainer} entering={FadeInUp}>
            <MaterialIcons name="error-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* University Selection Step */}
        {currentStep === 'university' && (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>Select Your University</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the university where you're registered as an instructor
            </Text>

            {universityError ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.danger} />
                <Text style={styles.errorText}>{universityError}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
                  Loading universities...
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.dropdownButton,
                    showUniversityDropdown && styles.dropdownButtonFocused,
                  ]}
                  onPress={() => setShowUniversityDropdown(!showUniversityDropdown)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !selectedUniversity && styles.dropdownPlaceholder,
                    ]}
                  >
                    {selectedUniversity?.name || 'Select university'}
                  </Text>
                  <MaterialIcons
                    name={showUniversityDropdown ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.textPrimary}
                  />
                </Pressable>

                {showUniversityDropdown && (
                  <Animated.View
                    style={styles.dropdownList}
                    entering={FadeInUp.delay(100)}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {universities.map((uni) => (
                        <Pressable
                          key={uni.id}
                          style={styles.dropdownItem}
                          onPress={() => handleUniversitySelect(uni)}
                        >
                          <MaterialIcons
                            name="school"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.dropdownItemText}>{uni.name}</Text>
                          {selectedUniversity?.id === uni.id && (
                            <MaterialIcons
                              name="check"
                              size={20}
                              color={colors.primary}
                            />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}

                {selectedUniversity && (
                  <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={() => setCurrentStep('lookup')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Next</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* Instructor Lookup Step */}
        {currentStep === 'lookup' && (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>Verify Your Identity</Text>
            <Text style={styles.sectionSubtitle}>
              Enter your name and email as registered in the system
            </Text>

            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="Full Name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="Email Address"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleInstructorLookup}
              disabled={loading || !name || !email}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </Pressable>

            <Pressable
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => {
                setCurrentStep('university');
                setError('');
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Change University
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* OTP Verification Step */}
        {(currentStep === 'otp' || currentStep === 'verifying') && (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>Verify Your Email</Text>
            <Text style={styles.sectionSubtitle}>
              Check your email for the 8-digit verification code
            </Text>

            {!otpSent ? (
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </Pressable>
            ) : (
              <>
                <Text style={[styles.label, { marginTop: 24, marginBottom: 16 }]}>
                  8-Digit Code <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                <OTPInput
                  value={otp}
                  onChangeText={setOtp}
                  colors={colors}
                  length={8}
                />

                <Text style={styles.timerText}>
                  {otpTimer > 0 ? (
                    <>OTP expires in: <Text style={{ fontWeight: '600' }}>{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</Text></>
                  ) : (
                    <>Didn&apos;t receive code? </>
                  )}
                </Text>

                {otpTimer === 0 && (
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={{
                      marginBottom: 16,
                    }}
                  >
                    <Text style={[styles.buttonText, { color: colors.primary }]}>Resend OTP</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.button,
                    {
                      backgroundColor: otp.length >= 8 && !loading ? colors.primary : colors.borderLight,
                    },
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.length < 8 || otpAttempts >= 3}
                >
                  {currentStep === 'verifying' ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: otp.length >= 8 && !loading ? 'white' : colors.textTertiary,
                        },
                      ]}
                    >
                      Verify & Create Account
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setCurrentStep('lookup');
                    setOtp('');
                    setError('');
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Back to Email</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}

        {/* Sign In Button */}
        {currentStep === 'university' && (
          <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 32 }}>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Already registered? Sign In
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

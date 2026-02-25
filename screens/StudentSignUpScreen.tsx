import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
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
    enrollmentInfo: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    enrollmentLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      fontFamily: 'Lexend',
    },
    enrollmentValue: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
      marginBottom: 6,
      fontFamily: 'Lexend',
    },
    readOnlySection: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.primary + '30', // Primary color with 30% opacity
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    readOnlyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 12,
      fontFamily: 'Lexend',
    },
    readOnlyField: {
      marginBottom: 12,
    },
    readOnlyLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: 'Lexend',
    },
    readOnlyValue: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      fontFamily: 'Lexend',
    },
    button: {
      paddingVertical: 18,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      fontFamily: 'Lexend',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    secondaryButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
      textAlign: 'center',
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
    linkText: {
      color: colors.primary,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Lexend',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: 'Lexend',
    },
    requiredMark: {
      color: colors.danger,
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

type SignupStep = 'university' | 'email' | 'otp' | 'details';

interface University {
  id: string;
  name: string;
  short_code: string;
}

interface EnrollmentData {
  id: string;
  enrollment_id: string;
  semester_name: string;
  branch_name: string;
  program_name: string;
  program_id?: string;
  branch_id?: string;
  semester_id?: string;
}

export function StudentSignUpScreen() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Step tracking
  const [currentStep, setCurrentStep] = useState<SignupStep>('university');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: University selection
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universityError, setUniversityError] = useState('');

  // Step 2: Email verification
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);

  // Step 3: OTP verification
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // Step 4: Detail fill
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Fetch universities on mount
  React.useEffect(() => {
    console.log('[StudentSignup] Component mounted, fetching universities...');
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      console.log('[Fetch Universities] Starting fetch...');
      setLoading(true);
      setUniversityError('');

      const { data, error } = await supabase
        .from('universities')
        .select('id, name, short_code')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('[Fetch Universities] Query error:', error.message);
        throw error;
      }

      console.log('[Fetch Universities] ✅ Success! Fetched:', data?.length || 0, 'universities');
      setUniversities(data || []);
    } catch (err: any) {
      console.error('[Fetch Universities] Error:', err.message);
      setUniversityError('Error loading universities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUniversitySelect = (university: University) => {
    console.log('[University Selection] Selected:', {
      id: university.id,
      name: university.name,
      shortCode: university.short_code,
    });
    setSelectedUniversity(university);
    setShowUniversityDropdown(false);
    setError('');
    setCurrentStep('email');
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const verifyEmailEnrollment = async () => {
    try {
      console.log('[Email Verification] Starting verification...', {
        email: email.substring(0, 5) + '***', // Masked
        universityId: selectedUniversity?.id,
      });

      if (!validateEmail(email)) {
        console.warn('[Email Verification] Invalid email format:', email);
        setError('Please enter a valid email address');
        return;
      }

      setLoading(true);
      setError('');

      // Query student_enrollments (has email + enrollment_no fields)
      // Filter: university_id, is_active = false, AND email matches
      console.log('[Email Verification] Querying enrollments for email match...');
      const { data: enrollments, error: queryError } = await supabase
        .from('student_enrollments')
        .select(
          `
          id,
          email,
          enrollment_no,
          first_name,
          last_name,
          is_active,
          section_id
        `
        )
        .eq('university_id', selectedUniversity?.id)
        .eq('is_active', false)
        .ilike('email', email); // Case-insensitive email filter

      if (queryError) {
        console.error('[Email Verification] Query error:', {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
        });
        throw queryError;
      }

      console.log('[Email Verification] Query results:', {
        count: enrollments?.length || 0,
        foundEmails: enrollments?.map((e: any) => ({
          email: e.email?.substring(0, 10) + '...',
          isActive: e.is_active,
        })) || [],
      });

      if (!enrollments || enrollments.length === 0) {
        console.warn('[Email Verification] No unclaimed enrollments found for this email + university');
        setError('Email not found in enrollment records. Please contact your administrator.');
        return;
      }

      // Email should match now due to ilike filter, but double-check
      console.log('[Email Verification] Double-checking email match...');
      const matchingEnrollment = enrollments.find(
        (enrollment: any) => enrollment.email?.toLowerCase() === email.toLowerCase()
      );

      if (!matchingEnrollment) {
        console.error('[Email Verification] No matching enrollment found for email:', email.substring(0, 5) + '***');
        console.log('[Email Verification] Available emails in database:', 
          enrollments.map((e: any) => e.email?.substring(0, 5) + '***')
        );
        setError(
          'Email not found in enrollment records. Please contact your university administrator.'
        );
        return;
      }

      console.log('[Email Verification] Email match found!', {
        enrollmentNo: (matchingEnrollment as any).enrollment_no,
      });

      // Get section ID and fetch program/branch/semester names
      const sectionId = (matchingEnrollment as any).section_id;
      let program_name = 'Unknown';
      let branch_name = 'Unknown';
      let semester_name = 'Unknown';
      let program_id = undefined;
      let branch_id = undefined;
      let semester_id = undefined;

      console.log('[Email Verification] Section ID to fetch:', sectionId);

      if (sectionId) {
        // Get ALL section details with joined program/branch/semester names
        // Use string literals for FK relationship names
        const { data: fullSectionData, error: sectionError } = await supabase
          .from('sections')
          .select(`
            id,
            program_id,
            branch_id,
            semester_id
          `)
          .eq('id', sectionId)
          .single();

        console.log('[Email Verification] Section query result:', {
          sectionId,
          found: !!fullSectionData,
          error: sectionError?.message,
          data: fullSectionData,
        });

        if (fullSectionData && !sectionError) {
          ({ program_id, branch_id, semester_id } = fullSectionData);

          console.log('[Email Verification] IDs from section:', {
            program_id,
            branch_id,
            semester_id,
          });

          // Fetch in parallel without .single() - returns array
          const [programRes, branchRes, semesterRes] = await Promise.all([
            program_id ? supabase.from('programs').select('name').eq('id', program_id) : Promise.resolve({ data: [], error: null }),
            branch_id ? supabase.from('branches').select('name').eq('id', branch_id) : Promise.resolve({ data: [], error: null }),
            semester_id ? supabase.from('semesters').select('name').eq('id', semester_id) : Promise.resolve({ data: [], error: null }),
          ]);

          console.log('[Email Verification] Parallel query raw results:', {
            program: { dataLength: programRes?.data?.length, error: programRes?.error?.message, firstItem: programRes?.data?.[0] },
            branch: { dataLength: branchRes?.data?.length, error: branchRes?.error?.message, firstItem: branchRes?.data?.[0] },
            semester: { dataLength: semesterRes?.data?.length, error: semesterRes?.error?.message, firstItem: semesterRes?.data?.[0] },
          });

          // Extract names - handle both single object and array cases
          program_name = programRes?.data?.[0]?.name || 'Unknown';
          branch_name = branchRes?.data?.[0]?.name || 'Unknown';
          semester_name = semesterRes?.data?.[0]?.name || 'Unknown';

          console.log('[Email Verification] Extracted academic details:', {
            program_name,
            branch_name,
            semester_name,
            debugInfo: {
              programData: programRes?.data,
              branchData: branchRes?.data,
              semesterData: semesterRes?.data,
            },
          });
        } else {
          console.warn('[Email Verification] Failed to fetch section:', {
            sectionId,
            resultIsNull: !fullSectionData,
            error: sectionError?.message,
          });
        }
      } else {
        console.warn('[Email Verification] Section ID is missing in enrollment data');
      }

      const enrollmentInfo: EnrollmentData = {
        id: (matchingEnrollment as any).id,
        enrollment_id: (matchingEnrollment as any).enrollment_no,
        semester_name,
        branch_name,
        program_name,
        program_id,
        branch_id,
        semester_id,
      };

      console.log('[Email Verification] Enrollment data extracted:', enrollmentInfo);
      setEnrollmentData(enrollmentInfo);

      // Send OTP
      console.log('[Email Verification] Sending OTP...');
      await sendOTP();
      setCurrentStep('otp');
    } catch (err: any) {
      console.error('[Email Verification] Exception caught:', {
        message: err.message,
        code: err.code,
        details: err,
      });
      setError('Error verifying email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    try {
      console.log('[Send OTP] Initiating OTP send...');
      console.log('[Send OTP] Email:', email.substring(0, 5) + '***');
      setOtpTimer(600); // 10 minutes
      setOtpSent(true);
      setOtpAttempts(0);

      // Allow user creation since this is a signup flow
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true, // Allow signup - user doesn't exist yet in auth
          emailRedirectTo: undefined, // No redirect for mobile
        },
      });

      if (error) {
        console.error('[Send OTP] Supabase error:', {
          code: error.code,
          message: error.message,
          status: error.status,
        });
        throw error;
      }

      console.log('[Send OTP] ✅ OTP sent successfully');

      // Start countdown timer
      const timerId = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            console.log('[Send OTP] ⏰ Timer expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      Alert.alert('OTP Sent', `Verification code sent to ${email}. Valid for 10 minutes.`);
    } catch (err: any) {
      console.error('[Send OTP] Exception caught:', {
        message: err.message,
        code: err.code,
      });
      setError('Failed to send OTP. Please try again.');
      setOtpSent(false);
    }
  };

  const verifyOTP = async () => {
    try {
      console.log('[Verify OTP] Starting OTP verification...', {
        otpLength: otp.length,
        attempts: otpAttempts,
      });

      if (otp.length < 6) {
        setError('Please enter at least 6 digits');
        return;
      }

      if (otpAttempts >= 5) {
        console.warn('[Verify OTP] Max attempts reached');
        setError('Too many failed attempts. Please request a new OTP.');
        setOtpSent(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });

      if (error) {
        console.error('[Verify OTP] Verification failed:', error);
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        setError(`Invalid OTP. ${5 - newAttempts} attempts remaining.`);
        setOtp('');
        return;
      }

      console.log('[Verify OTP] OTP verified successfully!');
      
      // Auto-populate first name and last name from enrollment data
      if (enrollmentData?.enrollment_id) {
        try {
          // Try to get enrollment data with first_name and last_name
          const { data: enrollmentWithNames, error } = await supabase
            .from('student_enrollments')
            .select('first_name, last_name')
            .eq('enrollment_no', enrollmentData.enrollment_id)
            .eq('is_active', false)
            .single();

          if (!error && enrollmentWithNames) {
            if (enrollmentWithNames.first_name) {
              setFirstName(enrollmentWithNames.first_name);
            }
            if (enrollmentWithNames.last_name) {
              setLastName(enrollmentWithNames.last_name);
            }

            console.log('[Verify OTP] Pre-populated names from enrollment:', {
              firstName: enrollmentWithNames.first_name,
              lastName: enrollmentWithNames.last_name,
            });
          } else {
            console.log('[Verify OTP] Could not pre-populate names (enrollment not found or error):', error?.message);
          }
        } catch (nameError: any) {
          console.warn('[Verify OTP] Error fetching enrollment names:', nameError.message);
          // Continue anyway - user can enter names manually
        }
      }

      setCurrentStep('details');
      setOtp('');
    } catch (err: any) {
      console.error('[Verify OTP] Exception caught:', err);
      setError('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getDeviceInfo = async () => {
    try {
      const deviceId = `${Device.brand || 'Unknown'}-${Device.modelId || Device.modelName || 'Unknown'}-${Date.now()}`;
      const deviceModel = Device.modelName || 'Unknown';
      const deviceOS = Device.osName || Platform.OS;
      const appVersion = Constants.expoConfig?.version || '1.0.0';

      console.log('[Device Info] Extracted device info:', {
        device_os: deviceOS,
        device_model: deviceModel,
        app_version: appVersion,
      });

      return {
        device_id: deviceId,
        device_model: deviceModel,
        device_os: deviceOS,
        device_name: `${Device.brand} ${deviceModel}`,
        app_version: appVersion,
      };
    } catch (err: any) {
      console.error('[Device Info] Exception caught:', err);
      const deviceId = `unknown-${Platform.OS}-${Date.now()}`;
      return {
        device_id: deviceId,
        device_model: 'Unknown',
        device_os: Platform.OS,
        device_name: 'Unknown Device',
        app_version: '1.0.0',
      };
    }
  };

  const completeSignup = async () => {
    try {
      console.log('[Complete Signup] Starting signup completion...');

      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name');
        return;
      }

      if (!phone.trim()) {
        setError('Please enter your phone number');
        return;
      }

      setLoading(true);
      setError('');

      const deviceInfo = await getDeviceInfo();
      console.log('[Complete Signup] Device info obtained, uploading profile picture if available...');

      let profilePictureUrl: string | undefined = undefined;
      // Photo upload disabled during signup - can be added later from profile settings

      console.log('[Complete Signup] Creating user profile in database...', {
        userId: user?.id?.substring(0, 8) + '***',
        email,
        firstName,
        lastName,
        enrollmentId: enrollmentData?.enrollment_id,
        universityId: selectedUniversity?.id,
      });

      const signUpResult = await signUp(
        email,
        'otp-authenticated',
        firstName,
        lastName,
        'student',
        selectedUniversity?.id || '',
        {
          phone,
          profile_picture_url: profilePictureUrl,
          enrollment_id: enrollmentData?.enrollment_id,
          program_id: enrollmentData?.program_id,
          branch_id: enrollmentData?.branch_id,
          semester_id: enrollmentData?.semester_id,
          batch: 1,
        }
      );

      if (signUpResult.error) {
        throw signUpResult.error;
      }

      console.log('[Complete Signup] ✅ User created successfully in users table');

      // Verify user was created
      console.log('[Complete Signup] Verifying user creation...');
      const { data: userData, error: fetchUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (fetchUserError) {
        console.warn('[Complete Signup] ⚠️ User creation verification failed:', fetchUserError);
      } else {
        console.log('[Complete Signup] ✅ User verified in database:', {
          id: userData?.id?.substring(0, 8) + '***',
          email: userData?.email,
          first_name: userData?.first_name,
          role: userData?.role,
        });
      }

      // Register device session
      console.log('[Complete Signup] Registering device session...');
      const { error: sessionError } = await supabase.from('mobile_sessions').insert({
        university_id: selectedUniversity?.id,
        user_id: user?.id,
        device_id: deviceInfo.device_id,
        device_name: deviceInfo.device_name,
        device_model: deviceInfo.device_model,
        device_os: deviceInfo.device_os,
        app_version: deviceInfo.app_version,
        is_active: true,
      });

      if (sessionError) {
        console.warn('[Complete Signup] ⚠️ Device session registration failed:', sessionError);
      } else {
        console.log('[Complete Signup] ✅ Device session registered');
      }

      // Note: Enrollment activation is now handled by database trigger
      // The trigger fires when user is inserted and marks matching enrollment as active
      console.log('[Complete Signup] ✅ User created - enrollment will be auto-activated by database trigger');

      console.log('[Complete Signup] ✅ SUCCESS! Account ready.');
      console.log('[Complete Signup] Completed steps:');
      console.log('  ✅ User created in users table');
      console.log('  ✅ Device session registered');
      console.log('  ✅ Database trigger auto-activated enrollment');
      console.log('[Complete Signup] Now redirecting to home screen...');
      console.log('[Complete Signup] User redirecting to home...');
      router.replace('/(main)/home');
    } catch (err: any) {
      console.error('[Complete Signup] ❌ Exception caught:', {
        message: err.message,
        code: err.code,
        error: err,
      });
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.header}
        >
          <Text style={styles.title}>Student Registration</Text>
          <Text style={styles.subtitle}>
            Step{' '}
            {currentStep === 'university' ? '1' : currentStep === 'email' ? '2' : currentStep === 'otp' ? '3' : '4'}{' '}
            of 4
          </Text>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.progressContainer}>
          {(['university', 'email', 'otp', 'details'] as const).map((step) => {
            const stepIndex = ['university', 'email', 'otp', 'details'].indexOf(step);
            const currentIndex = ['university', 'email', 'otp', 'details'].indexOf(currentStep);
            const isCompleted = currentIndex >= stepIndex;

            return (
              <View
                key={step}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.borderLight,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Error Message */}
        {error && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* STEP 1: University Selection */}
        {currentStep === 'university' && (
          <Animated.View entering={FadeInUp.delay(0)}>
            <Text style={styles.sectionTitle}>Select Your University</Text>
            <Text style={styles.sectionSubtitle}>Start your enrollment process</Text>

            {/* Login Alternative - Only on Step 1 */}
            <View style={{ 
              marginBottom: 32, 
              paddingBottom: 24, 
              paddingTop: 12,
              borderBottomWidth: 1.5, 
              borderBottomColor: colors.border 
            }}>
              <Pressable
                onPress={() => {
                  console.log('[Login Alternative] User chose to login instead of signup');
                  router.replace('/(auth)/login');
                }}
              >
                <Text style={{ 
                  textAlign: 'center', 
                  color: colors.textSecondary, 
                  fontSize: 15,
                  lineHeight: 22,
                  fontFamily: 'Lexend',
                }}>
                  Already have an account?{' '}
                  <Text style={{ 
                    color: colors.primary, 
                    fontWeight: '700',
                    fontSize: 15,
                  }}>Login here</Text>
                </Text>
              </Pressable>
            </View>

            {loading && universities.length === 0 ? (
              <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>Loading universities...</Text>
              </View>
            ) : universityError ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="warning" size={20} color={colors.warning} />
                <Text style={[styles.errorText, { color: colors.warning }]}>{universityError}</Text>
              </View>
            ) : universities.length === 0 ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="info" size={20} color={colors.info} />
                <Text style={[styles.errorText, { color: colors.info }]}>No universities available</Text>
              </View>
            ) : (
              <View>
                <Pressable
                  onPress={() => setShowUniversityDropdown(!showUniversityDropdown)}
                  style={[
                    styles.dropdownButton,
                    showUniversityDropdown && styles.dropdownButtonFocused,
                  ]}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !selectedUniversity && styles.dropdownPlaceholder,
                    ]}
                  >
                    {selectedUniversity ? selectedUniversity.name : 'Tap to select university'}
                  </Text>
                  <MaterialIcons
                    name={showUniversityDropdown ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </Pressable>

                {showUniversityDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled>
                      {universities.map((uni, index) => (
                        <Pressable
                          key={uni.id}
                          onPress={() => handleUniversitySelect(uni)}
                          style={[
                            styles.dropdownItem,
                            index === universities.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <MaterialIcons
                            name={selectedUniversity?.id === uni.id ? 'check-circle' : 'radio-button-unchecked'}
                            size={20}
                            color={selectedUniversity?.id === uni.id ? colors.primary : colors.textSecondary}
                          />
                          <Text style={styles.dropdownItemText}>{uni.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    if (selectedUniversity) setCurrentStep('email');
                  }}
                  disabled={!selectedUniversity || loading}
                  style={[
                    styles.button,
                    {
                      backgroundColor: selectedUniversity && !loading ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: selectedUniversity && !loading ? 'white' : colors.textTertiary,
                      },
                    ]}
                  >
                    {loading ? 'Loading...' : 'Continue'}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}

        {/* STEP 2: Email Verification */}
        {currentStep === 'email' && (
          <Animated.View entering={FadeInUp.delay(0)}>
            <Text style={styles.sectionTitle}>Verify Your Email</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the email associated with your {selectedUniversity?.name} enrollment
            </Text>

            <Text style={styles.label}>
              Email Address <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              placeholder="student@university.edu"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
              ]}
            />

            <Pressable
              onPress={verifyEmailEnrollment}
              disabled={!email || loading}
              style={[
                styles.button,
                {
                  backgroundColor: email && !loading ? colors.primary : colors.borderLight,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: email && !loading ? 'white' : colors.textTertiary,
                    },
                  ]}
                >
                  Verify Email
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setCurrentStep('university');
                setError('');
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Back to University Selection</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* STEP 3: OTP Verification */}
        {currentStep === 'otp' && (
          <Animated.View entering={FadeInUp.delay(0)}>
            <Text style={styles.sectionTitle}>Verify Your Email</Text>
            <Text style={styles.sectionSubtitle}>
              Check your email for the 8-digit verification code
            </Text>

            {enrollmentData && (
              <View style={styles.enrollmentInfo}>
                <Text style={styles.enrollmentLabel}>Enrollment ID</Text>
                <Text style={styles.enrollmentValue}>{enrollmentData.enrollment_id}</Text>

                <Text style={styles.enrollmentLabel}>Program</Text>
                <Text style={styles.enrollmentValue}>{enrollmentData.program_name}</Text>

                <Text style={styles.enrollmentLabel}>Branch</Text>
                <Text style={styles.enrollmentValue}>{enrollmentData.branch_name}</Text>

                <Text style={styles.enrollmentLabel}>Semester</Text>
                <Text style={styles.enrollmentValue}>{enrollmentData.semester_name}</Text>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 8 }]}>
              8-Digit Code <Text style={styles.requiredMark}>*</Text>
            </Text>
            <OTPInput value={otp} onChangeText={setOtp} colors={colors} length={8} />

            <Text style={styles.timerText}>
              {otpTimer > 0 ? (
                <>OTP expires in: <Text style={{ fontWeight: '600' }}>{formatTime(otpTimer)}</Text></>
              ) : (
                <>Didn&apos;t receive code? </>
              )}
            </Text>

            {otpTimer === 0 && (
              <Pressable
                onPress={sendOTP}
                disabled={loading}
                style={{
                  marginBottom: 16,
                }}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>Resend OTP</Text>
              </Pressable>
            )}

            <Pressable
              onPress={verifyOTP}
              disabled={otp.length < 8 || loading}
              style={[
                styles.button,
                {
                  backgroundColor: otp.length >= 8 && !loading ? colors.primary : colors.borderLight,
                },
              ]}
            >
              {loading ? (
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
                  Verify Code
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setCurrentStep('email');
                setOtp('');
                setError('');
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Back to Email</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* STEP 4: Detail Fill */}
        {currentStep === 'details' && (
          <Animated.View entering={FadeInUp.delay(0)}>
            <Text style={styles.sectionTitle}>Complete Your Profile</Text>
            <Text style={styles.sectionSubtitle}>Add your personal information</Text>

            {/* Enrollment Details - Read Only Section */}
            {enrollmentData && (
              <View style={[styles.readOnlySection, { marginBottom: 24 }]}>
                <Text style={styles.readOnlyTitle}>Enrollment Information (Verified)</Text>
                
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Enrollment ID</Text>
                  <Text style={styles.readOnlyValue}>{enrollmentData.enrollment_id}</Text>
                </View>

                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Program</Text>
                  <Text style={styles.readOnlyValue}>{enrollmentData.program_name}</Text>
                </View>

                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Branch</Text>
                  <Text style={styles.readOnlyValue}>{enrollmentData.branch_name}</Text>
                </View>

                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Semester</Text>
                  <Text style={styles.readOnlyValue}>{enrollmentData.semester_name}</Text>
                </View>
              </View>
            )}

            {/* First Name */}
            <Text style={styles.label}>
              First Name <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              placeholder="John"
              placeholderTextColor={colors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              style={[
                styles.input,
                firstNameFocused && styles.inputFocused,
              ]}
            />

            {/* Last Name */}
            <Text style={styles.label}>
              Last Name <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              placeholder="Doe"
              placeholderTextColor={colors.textTertiary}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
              style={[
                styles.input,
                lastNameFocused && styles.inputFocused,
              ]}
            />

            {/* Phone */}
            <Text style={styles.label}>
              Phone Number <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              style={[
                styles.input,
                phoneFocused && styles.inputFocused,
                { marginBottom: 28 },
              ]}
            />

            {/* Submit Button */}
            <Pressable
              onPress={completeSignup}
              disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || loading}
              style={[
                styles.button,
                {
                  backgroundColor:
                    firstName.trim() && lastName.trim() && phone.trim() && !loading
                      ? colors.primary
                      : colors.borderLight,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color:
                        firstName.trim() && lastName.trim() && phone.trim() && !loading
                          ? 'white'
                          : colors.textTertiary,
                    },
                  ]}
                >
                  Complete Signup
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setCurrentStep('otp');
                setError('');
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Back to Verification</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

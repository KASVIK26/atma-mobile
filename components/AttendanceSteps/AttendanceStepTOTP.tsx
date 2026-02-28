import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface AttendanceStepTOTPProps {
  onComplete: (code: string) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    descriptionBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 4,
    },
    descriptionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    descriptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    codeInputContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginBottom: 4,
      alignItems: 'center',
    },
    codeInputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // 6 OTP boxes row
    otpRow: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    otpBox: {
      width: 44,
      height: 52,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    otpBoxFilled: {
      borderColor: '#22c55e', // green-500
      borderWidth: 1.5,
    },
    otpBoxFocused: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    otpChar: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 0,
    },
    hiddenInput: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0,
    },
    statusBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
      textAlign: 'center',
    },
    statusCode: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 4,
      textAlign: 'center',
      fontFamily: 'monospace',
    },
    infoAlert: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: 12,
      marginBottom: 4,
    },
    alertRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    alertText: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export const AttendanceStepTOTP: React.FC<AttendanceStepTOTPProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [code, setCode] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    const clean = text.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    setCode(clean);
    if (clean.length === 6) {
      setIsCompleted(true);
      inputRef.current?.blur();
      onComplete(clean);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Description */}
      <View style={styles.descriptionBox}>
        <Text style={styles.descriptionLabel}>Instructor Code</Text>
        <Text style={styles.descriptionText}>
          Your instructor will display a 6-character code. Enter it below to verify your attendance.
        </Text>
      </View>

      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <View style={styles.alertRow}>
          <MaterialIcons name="timer" size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.alertText}>
            The code refreshes every 60 seconds — enter it before it changes
          </Text>
        </View>
      </View>

      {!isCompleted ? (
        <Animated.View entering={FadeIn} style={styles.codeInputContainer}>
          <Text style={styles.codeInputLabel}>Enter 6-Character Code</Text>

          {/* OTP boxes — tap any box to open keyboard */}
          <Pressable onPress={focusInput} style={styles.otpRow}>
            {Array.from({ length: 6 }).map((_, i) => {
              const char = code[i] ?? '';
              const filled = char !== '';
              // highlight the next-to-fill box when focused
              const isActive = isFocused && i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    filled && styles.otpBoxFilled,
                    isActive && !filled && styles.otpBoxFocused,
                  ]}
                >
                  <Text style={styles.otpChar}>{char}</Text>
                </View>
              );
            })}
          </Pressable>

          {/* Single hidden TextInput — only ONE input in DOM, no double-keyboard events */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleChange}
            maxLength={6}
            keyboardType="default"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            caretHidden
          />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.statusBox}>
          <MaterialIcons name="check-circle" size={36} color={colors.success} />
          <Text style={styles.statusText}>Code entered</Text>
          <Text style={styles.statusCode}>{code}</Text>
        </Animated.View>
      )}
    </View>
  );
};

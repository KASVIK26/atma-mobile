/**
 * TextInput Component
 * Custom text input with label, error state, and support for icons
 */

import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontFamily, Typography } from '@/constants/typography';
import { TextInputProps } from '@/types/ui';
import React from 'react';
import {
    TextInput as RNTextInput,
    StyleSheet,
    Text,
    View
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    fontFamily: FontFamily.display,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  labelDark: {
    color: Colors.textDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  inputContainerDark: {
    borderColor: Colors.borderDark,
    backgroundColor: Colors.backgroundDark,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.display,
    fontSize: 16,
    color: Colors.textLight,
    paddingVertical: Spacing.md,
  },
  inputDark: {
    color: Colors.textDark,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  rightElement: {
    marginLeft: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    fontFamily: FontFamily.display,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
});

export const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  rightElement,
  style,
  testID,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const inputContainerStyle: any = [
    styles.inputContainer,
    styles.inputContainerDark,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    disabled && styles.inputDisabled,
  ];

  const inputStyle: any = [
    styles.input,
    styles.inputDark,
    disabled && styles.inputDisabled,
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, styles.labelDark]}>
          {label}
        </Text>
      )}
      <View style={inputContainerStyle}>
        <RNTextInput
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMutedDark}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
        />
        {rightElement && (
          <View style={styles.rightElement}>
            {rightElement}
          </View>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

export default TextInput;

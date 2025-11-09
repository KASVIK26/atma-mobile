/**
 * Button Component
 * Primary, secondary, outline, and ghost variants
 */

import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { ButtonProps } from '@/types/ui';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity
} from 'react-native';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  buttonText: {
    fontFamily: FontFamily.display,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressedIn: {
    opacity: 0.8,
  },
});

const buttonVariants = StyleSheet.create({
  // Primary Variant
  primary: {
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: Colors.white,
    fontSize: 16,
  },
  
  // Secondary Variant
  secondary: {
    backgroundColor: Colors.accent,
  },
  secondaryText: {
    color: Colors.white,
    fontSize: 16,
  },
  
  // Outline Variant
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  outlineText: {
    color: Colors.primary,
    fontSize: 16,
  },
  
  // Ghost Variant
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
    fontSize: 16,
  },
});

const buttonSizes = StyleSheet.create({
  sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 32,
  },
  md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
});

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
  testID,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const variantStyles = {
    primary: [buttonVariants.primary],
    secondary: [buttonVariants.secondary],
    outline: [buttonVariants.outline],
    ghost: [buttonVariants.ghost],
  }[variant];

  const textVariantStyles = {
    primary: buttonVariants.primaryText,
    secondary: buttonVariants.secondaryText,
    outline: buttonVariants.outlineText,
    ghost: buttonVariants.ghostText,
  }[variant];

  const sizeStyle = {
    sm: buttonSizes.sm,
    md: buttonSizes.md,
    lg: buttonSizes.lg,
  }[size];

  const containerStyle: any = [
    styles.button,
    sizeStyle,
    variantStyles,
    disabled && styles.disabled,
    isPressed && styles.pressedIn,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
        />
      ) : null}
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text style={[styles.buttonText, textVariantStyles]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;

/**
 * UI Component Types
 * Shared types for UI components and their props
 */

import { ReactNode } from 'react';
import { ImageSourcePropType, ViewStyle } from 'react-native';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export interface TextInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  rightElement?: ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export interface CardProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  children: ReactNode;
  testID?: string;
}

export interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: ReactNode;
  style?: ViewStyle;
}

export interface AvatarProps {
  source?: ImageSourcePropType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  initials?: string;
  style?: ViewStyle;
}

export interface BadgeProps {
  text: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'small' | 'large';
}

export interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  type?: 'info' | 'warning' | 'error' | 'success';
}

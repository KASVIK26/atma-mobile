/**
 * Color Constants
 * Centralized color palette based on Stitch design system
 */

export const Colors = {
  // Primary Brand Colors
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  
  // Accent Colors
  accent: '#06B6D4',
  accentLight: '#22D3EE',
  accentDark: '#0891B2',
  
  // Status Colors
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerDark: '#DC2626',
  
  info: '#0EA5E9',
  infoLight: '#38BDF8',
  infoDark: '#0284C7',
  
  // Background Colors - Light Mode
  backgroundLight: '#F8FAFC',
  cardLight: '#FFFFFF',
  textLight: '#1F2937',
  textMutedLight: '#64748B',
  borderLight: '#CBD5E1',
  
  // Background Colors - Dark Mode
  backgroundDark: '#0F172A',
  cardDark: '#1E293B',
  textDark: '#F8FAFC',
  textMutedDark: '#94A3B8',
  borderDark: '#334155',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Gradient Colors
  gradientStart: '#2563EB',
  gradientEnd: '#06B6D4',
};

export const DarkColors = {
  ...Colors,
  background: Colors.backgroundDark,
  card: Colors.cardDark,
  text: Colors.textDark,
  textMuted: Colors.textMutedDark,
  border: Colors.borderDark,
};

export const LightColors = {
  ...Colors,
  background: Colors.backgroundLight,
  card: Colors.cardLight,
  text: Colors.textLight,
  textMuted: Colors.textMutedLight,
  border: Colors.borderLight,
};

export type ColorScheme = 'light' | 'dark';

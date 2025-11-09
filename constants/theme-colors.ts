/**
 * Theme Colors System
 * Professional color palette with Light and Dark mode support
 */

export const COLORS = {
  light: {
    // Primary Colors
    primary: '#2563EB',      // Blue
    primaryDark: '#1D4ED8',  // Darker Blue
    primaryLight: '#DBEAFE', // Light Blue
    
    // Accent Colors
    accent: '#06B6D4',       // Cyan
    accentDark: '#0891B2',   // Darker Cyan
    
    // Status Colors
    success: '#10B981',      // Green
    warning: '#F59E0B',      // Amber
    danger: '#EF4444',       // Red
    dangerLight: '#FEF2F2',  // Light Red background
    info: '#3B82F6',         // Info Blue
    
    // Background Colors
    background: '#F8FAFC',   // Very Light Gray
    backgroundAlt: '#F3F4F6', // Light Gray
    backgroundCard: '#FFFFFF', // White
    cardBackground: '#FFFFFF', // Card background (white)
    inputBackground: '#F9FAFB', // Input background
    
    // Text Colors
    textPrimary: '#1F2937',   // Dark Gray (Text)
    textSecondary: '#6B7280', // Medium Gray
    textTertiary: '#9CA3AF',  // Light Gray
    textMuted: '#D1D5DB',     // Very Light Gray
    placeholder: '#D1D5DB',   // Placeholder Text
    
    // Border Colors
    border: '#E5E7EB',        // Light Border
    borderLight: '#F3F4F6',   // Very Light Border
    
    // Special
    shadow: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    // Primary Colors
    primary: '#E63946',       // Crimson Red (from palette)
    primaryDark: '#A4161A',   // Darker Crimson
    primaryLight: '#F1FAEE',  // Light accent
    
    // Accent Colors
    accent: '#A8DADC',        // Soft Blue (from palette)
    accentDark: '#457B9D',    // Steel Blue (from palette)
    
    // Status Colors
    success: '#2A9D8F',       // Teal (from palette)
    warning: '#E76F51',       // Burnt Orange (from palette)
    danger: '#E63946',        // Crimson Red
    dangerLight: '#1A1A1A',   // Darker background for dark theme
    info: '#A8DADC',          // Soft Blue
    
    // Background Colors
    background: '#0E0E0E',    // Deep Black (as requested)
    backgroundAlt: '#1A1A1A', // Dark Gray
    backgroundCard: '#1A1A1A', // Card Navy
    cardBackground: '#1A1A1A', // Card background
    inputBackground: '#0E0E0E', // Input background (deep black)
    
    // Text Colors
    textPrimary: '#FFFFFF',   // Pure White (as requested)
    textSecondary: '#E8E8E8', // Off-White
    textTertiary: '#B8B8B8',  // Light Gray
    textMuted: '#808080',     // Medium Gray
    placeholder: '#808080',   // Placeholder Text
    
    // Border Colors
    border: '#333333',        // Dark Border
    borderLight: '#4A4A4A',   // Lighter Dark Border
    
    // Special
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

export type ThemeType = 'light' | 'dark';

export const getThemeColors = (theme: ThemeType) => {
  return COLORS[theme];
};

// Export both themes for easy access
export const LIGHT_COLORS = COLORS.light;
export const DARK_COLORS = COLORS.dark;

/**
 * Typography Constants
 * Font sizes, weights, and line heights
 */

import { TextStyle } from 'react-native';

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const LineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

export const Typography = {
  // Display/Hero Text
  display1: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.tight,
  } as TextStyle,
  
  display2: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.tight,
  } as TextStyle,
  
  // Heading Styles
  h1: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  h2: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  h3: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  h4: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  // Body Text
  body: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  bodyBold: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  bodySmall: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  bodySmallBold: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  // Label Text
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.normal,
  } as TextStyle,
  
  labelSmall: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.tight,
  } as TextStyle,
  
  // Caption
  caption: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.tight,
  } as TextStyle,
  
  captionBold: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.tight,
  } as TextStyle,
};

export const FontFamily = {
  display: 'Lexend',
} as const;

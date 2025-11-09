/**
 * Separator Component
 * Used to divide sections or create visual separation
 */

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontFamily, Typography } from '@/constants/typography';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: Colors.borderDark,
    marginVertical: Spacing.lg,
  },
  dividerWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderDark,
  },
  text: {
    ...Typography.caption,
    fontFamily: FontFamily.display,
    color: Colors.textMutedDark,
  },
});

interface SeparatorProps {
  style?: ViewStyle;
}

interface DividerProps {
  text?: string;
  style?: ViewStyle;
}

export const Separator: React.FC<SeparatorProps> = ({ style }) => {
  return <View style={[styles.separator, style]} />;
};

export const Divider: React.FC<DividerProps> = ({ text = 'Or', style }) => {
  return (
    <View style={[styles.dividerWithText, style]}>
      <View style={styles.line} />
      <Text style={styles.text}>{text}</Text>
      <View style={styles.line} />
    </View>
  );
};

export default Separator;

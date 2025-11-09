/**
 * Card Component
 * Reusable card container with optional press handling
 */

import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { CardProps } from '@/types/ui';
import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export const Card: React.FC<CardProps> = ({
  onPress,
  disabled = false,
  style,
  children,
  testID,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const containerStyle: any = [
    styles.card,
    isPressed && styles.cardPressed,
    disabled && styles.disabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
};

export default Card;

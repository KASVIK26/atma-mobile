import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  colors: any;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      padding: 2,
      justifyContent: 'center',
    },
    containerActive: {
      backgroundColor: colors.primary,
    },
    thumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
  });

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const position = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.value = withTiming(value ? 1 : 0, { duration: 300 });
  }, [value]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(position.value, [0, 1], [0, 22]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.container, value && styles.containerActive]}
    >
      <Animated.View style={[styles.thumb, thumbAnimatedStyle]} />
    </Pressable>
  );
};

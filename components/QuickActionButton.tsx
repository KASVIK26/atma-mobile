import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  disabled?: boolean;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.95 }],
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
  });

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onPress,
  colors,
  disabled = false,
}) => {
  const [pressed, setPressed] = React.useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        disabled={disabled}
      >
        <MaterialIcons name={icon as any} size={28} color={colors.primary} />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

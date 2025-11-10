import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsMenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  colors: any;
  showBorder?: boolean;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chevron: {
      color: colors.textSecondary,
    },
  });

export const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon,
  label,
  onPress,
  colors,
  showBorder = true,
  hasToggle = false,
  toggleValue = false,
  onToggle,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, !showBorder && { borderBottomWidth: 0 }]}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon as any} size={20} color={colors.textSecondary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.rightContent}>
        {hasToggle ? (
          <ToggleSwitch
            value={toggleValue}
            onValueChange={onToggle!}
            colors={colors}
          />
        ) : (
          <MaterialIcons name="chevron-right" size={24} style={styles.chevron} />
        )}
      </View>
    </Pressable>
  );
};

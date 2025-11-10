import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ProfileMenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  showBorder?: boolean;
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
    chevron: {
      color: colors.textSecondary,
    },
  });

export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  icon,
  label,
  onPress,
  colors,
  showBorder = true,
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
      <MaterialIcons name="chevron-right" size={24} style={styles.chevron} />
    </Pressable>
  );
};

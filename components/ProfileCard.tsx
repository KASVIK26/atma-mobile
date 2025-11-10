import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface ProfileCardProps {
  name: string;
  email: string;
  university: string;
  role: string;
  avatarUrl: string;
  colors: any;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 24,
    },
    avatar: {
      width: 128,
      height: 128,
      borderRadius: 64,
    },
    nameEmail: {
      alignItems: 'center',
      gap: 8,
    },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    email: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    university: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    roleBadge: {
      backgroundColor: colors.primaryLight,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
    },
    roleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
  });

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  university,
  role,
  avatarUrl,
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
      <View style={styles.nameEmail}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.university}>{university}</Text>
      </View>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{role}</Text>
      </View>
    </View>
  );
};

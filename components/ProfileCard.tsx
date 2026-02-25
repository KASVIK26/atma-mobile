import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface ProfileCardProps {
  name: string;
  email: string;
  university: string;
  role: string;
  avatarUrl?: string;
  colors: any;
  instructorCode?: string;
  department?: string;
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
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    university: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    extraField: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 4,
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
  instructorCode,
  department,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Use a placeholder name fallback
  const displayName = name && name.trim() ? name : 'User Profile';
  const displayEmail = email && email.trim() ? email : 'No email';
  const displayUniversity = university && university.trim() ? university : 'No university';

  return (
    <View style={styles.container}>
      <Image
        source={
          avatarUrl && avatarUrl.trim().length > 0
            ? { uri: avatarUrl }
            : require('@/assets/images/profile-icon1.png')
        }
        style={styles.avatar}
        resizeMode="cover"
      />
      <View style={styles.nameEmail}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
        {displayUniversity !== 'No university' && (
          <Text style={styles.university}>{displayUniversity}</Text>
        )}
        {role?.toLowerCase() === 'teacher' && instructorCode && (
          <Text style={styles.extraField}>Code: {instructorCode}</Text>
        )}
        {role?.toLowerCase() === 'teacher' && department && (
          <Text style={styles.extraField}>Dept: {department}</Text>
        )}
      </View>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{role}</Text>
      </View>
    </View>
  );
};

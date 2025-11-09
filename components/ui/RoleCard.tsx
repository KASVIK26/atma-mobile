/**
 * Role Card Component
 * Reusable card for displaying role options with icon and benefits
 */

import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontFamily, Typography } from '@/constants/typography';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';

interface RoleCardProps {
  title: string;
  icon: string;
  benefits: string[];
  onPress?: () => void;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    fontFamily: FontFamily.display,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  benefitsList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 20,
    height: 20,
  },
  benefitText: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.display,
    color: Colors.textMutedDark,
    flex: 1,
  },
});

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  icon,
  benefits,
  onPress,
  style,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const containerStyle = [
    styles.card,
    isPressed && styles.cardPressed,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name="school"
          size={36}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.benefitsList}>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export default RoleCard;

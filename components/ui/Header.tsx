/**
 * Header Component
 * Top app bar with title, back button, and optional right element
 */

import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontFamily, Typography } from '@/constants/typography';
import { HeaderProps } from '@/types/ui';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  title: {
    ...Typography.h4,
    fontFamily: FontFamily.display,
    color: Colors.textDark,
    flex: 1,
  },
  rightElement: {
    justifyContent: 'flex-end',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightElement,
  style,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, style]}>
        <View style={styles.leftContainer}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={Colors.textDark}
              />
            </TouchableOpacity>
          )}
          {!showBackButton && (
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/ATMA-LOGO.png')}
                style={{ width: 32, height: 32, resizeMode: 'contain' }}
              />
            </View>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
        {rightElement && (
          <View style={styles.rightElement}>
            {rightElement}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Header;

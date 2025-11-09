/**
 * Logo Component
 * Display ATMA application logo
 */

import { BorderRadius } from '@/constants/spacing';
import React from 'react';
import {
    Image,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

const styles = StyleSheet.create({
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  smallLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  smallLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
});

interface LogoProps {
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', style }) => {
  if (size === 'sm') {
    return (
      <View style={[styles.smallLogoContainer, style]}>
        <Image
          source={require('@/assets/images/ATMA-LOGO.png')}
          style={styles.smallLogo}
        />
      </View>
    );
  }

  return (
    <View style={[styles.logoContainer, style]}>
      <Image
        source={require('@/assets/images/ATMA-LOGO.png')}
        style={styles.logo}
      />
    </View>
  );
};

export default Logo;

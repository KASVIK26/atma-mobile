/**
 * Avatar Component
 * Display user avatar or initials
 */

import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { AvatarProps } from '@/types/ui';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray300,
    borderWidth: 2,
    borderColor: Colors.borderDark,
  },
  initialsText: {
    fontFamily: FontFamily.display,
    fontWeight: '600',
    color: Colors.textDark,
  },
});

const sizeStyles = {
  sm: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
  },
  md: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  lg: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
  },
  xl: {
    width: 128,
    height: 128,
    borderRadius: BorderRadius['2xl'],
  },
};

const fontSizes = {
  sm: 12,
  md: 16,
  lg: 32,
  xl: 48,
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 'md',
  onPress,
  initials = 'A',
  style,
}) => {
  const sizeStyle = sizeStyles[size];
  const fontSize = fontSizes[size];

  const containerStyle: any = [
    styles.avatar,
    sizeStyle,
    style,
  ];

  const content = (
    <View style={containerStyle}>
      {source ? (
        <Image
          source={source}
          style={[sizeStyle, { borderRadius: sizeStyle.borderRadius }]}
        />
      ) : (
        <Text style={[styles.initialsText, { fontSize }]}>
          {initials}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default Avatar;

import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    marginBottom: 16,
  },
  illustration: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  textContent: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.02,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Lexend',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    fontFamily: 'Lexend',
  },
  footerArea: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    maxWidth: 480,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonInner: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.015,
    fontFamily: 'Lexend',
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
    fontFamily: 'Lexend',
  },
  privacyLink: {
    textDecorationLine: 'underline',
    color: '#2563EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const WelcomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const buttonScale = useSharedValue(1);
  const illustrationOpacity = useSharedValue(1);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  useEffect(() => {
    // Fade out when theme changes
    illustrationOpacity.value = withSpring(0, {
      damping: 10,
      mass: 1,
      stiffness: 100,
    });
    // Fade back in with new image
    const timer = setTimeout(() => {
      illustrationOpacity.value = withSpring(1, {
        damping: 10,
        mass: 1,
        stiffness: 100,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [theme, illustrationOpacity]);

  const handleGetStarted = () => {
    router.push('/(auth)/role-selection');
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const illustrationAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: illustrationOpacity.value,
    };
  });

  const onButtonPress = () => {
    buttonScale.value = withSpring(0.98, { damping: 10 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 10 });
      handleGetStarted();
    }, 100);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />
      
      {/* Header with Theme Toggle */}
      <Animated.View
        entering={FadeInDown.delay(100)}
        style={[styles.header, { zIndex: 1 }]}
      >
        <Pressable
          onPress={toggleTheme}
          style={({ pressed }) => [
            styles.themeToggle,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons
            name={theme === 'light' ? 'dark-mode' : 'light-mode'}
            size={24}
            color={colors.primary}
          />
        </Pressable>
      </Animated.View>

      <ScrollView
        scrollEnabled={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, zIndex: 1 }]}
        style={{ zIndex: 1 }}
      >
      <Animated.View
        entering={FadeInDown.delay(200)}
        style={styles.mainContent}
      >
        <View style={styles.illustrationContainer}>
          <Animated.Image
            source={
              theme === 'dark'
                ? require('@/assets/images/darkmodewelcomescreenimg.png')
                : require('@/assets/images/lightmodewelcomescreenimg.png')
            }
            style={[styles.illustration, illustrationAnimStyle]}
            resizeMode="contain"
          />
        </View>

        <Animated.View entering={FadeInUp.delay(400)} style={styles.textContent}>
          <Text style={styles.title}>Welcome to Atma</Text>
          <Text style={styles.subtitle}>
            Attendance, classes and profiles — effortless.
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(600)}
        style={styles.footerArea}
      >
        <Animated.View style={[styles.buttonContainer, animatedButtonStyle]}>
          <Pressable onPress={onButtonPress}>
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>Get started</Text>
            </View>
          </Pressable>
        </Animated.View>

        <Text style={styles.privacyText}>
          By continuing, you agree to our{' '}
          <Text style={styles.privacyLink}>Privacy & Terms</Text>
        </Text>
      </Animated.View>
    </ScrollView>
    </View>
  );
};

export default WelcomeScreen;

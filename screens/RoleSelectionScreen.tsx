import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
    Image,
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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  titleSection: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    fontFamily: 'Lexend',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    fontFamily: 'Lexend',
  },
  cardsContainer: {
    gap: 24,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    fontFamily: 'Lexend',
  },
  benefitsContainer: {
    marginTop: 8,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    fontFamily: 'Lexend',
  },
});

const RoleCard = ({ role, icon, benefits, onPress, colors }: { role: string; icon: string; benefits: string[]; onPress: () => void; colors: any }) => {
  const [pressed, setPressed] = React.useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Animated.View entering={FadeInUp.delay(200)}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={icon as any}
            size={32}
            color={colors.primary}
          />
        </View>

        <Text style={styles.cardTitle}>{role}</Text>

        <View style={styles.benefitsContainer}>
          {benefits.map((benefit: string, idx: number) => (
            <View key={idx} style={styles.benefitRow}>
              <MaterialIcons
                name="check-circle"
                size={18}
                color={colors.success}
              />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const RoleSelectionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />
      <Animated.View entering={FadeInDown.delay(0)} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
            <View style={styles.logoSection}>
              <View style={styles.logoBg}>
                <Image
                  source={require('@/assets/images/ATMA-LOGO.png')}
                  style={{ width: 44, height: 44, borderRadius: 10 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.headerBrand}>ATMA</Text>
            </View>
          <Pressable style={styles.profileButton}>
            <MaterialIcons name="account-circle" size={40} color={colors.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.headerDivider} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.titleSection}
        >
          <Text style={styles.mainTitle}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you'll be using Atma Mobile.
          </Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <RoleCard
            role="Student"
            icon="school"
            benefits={[
              'View your class schedule',
              'Mark your attendance',
              'Track your progress',
            ]}
            onPress={() => router.push('/(auth)/student-signup')}
            colors={colors}
          />

          <RoleCard
            role="Teacher"
            icon="assignment-ind"
            benefits={[
              'Manage class rosters',
              'Take student attendance',
              'View attendance reports',
            ]}
            onPress={() => router.push('/(auth)/teacher-signup')}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default RoleSelectionScreen;

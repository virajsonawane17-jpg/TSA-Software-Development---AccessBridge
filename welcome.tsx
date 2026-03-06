import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccessibleButton } from '@/components/AccessibleButton';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, fontSizes } = useAccessibility();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(30)).current;
  const mottoFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(mottoFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale, buttonFade, buttonSlide, mottoFade]);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoSection,
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={[styles.logoOuter, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoEmoji}>🌉</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.welcomeLabel, { color: colors.textSecondary }]}>
              WELCOME TO
            </Text>
            <Text
              style={[styles.appName, { color: colors.text, fontSize: fontSizes['4xl'] }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              AccessBridge
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: mottoFade }}>
            <Text style={[styles.motto, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
              Bridging the gap between vision{'\n'}and independence — one tap at a time.
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: buttonFade,
              transform: [{ translateY: buttonSlide }],
            },
          ]}
        >
          <AccessibleButton
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            size="large"
            testID="get-started-button"
          >
            <View style={styles.buttonInner}>
              <Text style={[styles.buttonText, { fontSize: fontSizes.lg }]}>
                Get Started
              </Text>
              <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </AccessibleButton>

          <Text style={[styles.termsText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            By continuing, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoSection: {
    marginBottom: 40,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 42,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 3,
    marginBottom: 8,
  },
  appName: {
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  motto: {
    textAlign: 'center' as const,
    lineHeight: 24,
    fontWeight: '400' as const,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  termsText: {
    textAlign: 'center' as const,
    marginTop: 16,
    fontWeight: '400' as const,
  },
});

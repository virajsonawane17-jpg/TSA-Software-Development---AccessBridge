import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { ToggleButton } from '@/components/ToggleButton';
import { FontSizeSelector } from '@/components/FontSizeSelector';
import { ContrastModeSelector } from '@/components/ContrastModeSelector';
import { Sparkles, ArrowRight } from 'lucide-react-native';

export default function SetupScreen() {
  const router = useRouter();
  const { colors, fontSizes, settings, updateSetting, completeSetup } = useAccessibility();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    completeSetup();
    router.replace('/home');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={[styles.sparklesBadge, { backgroundColor: colors.cardAmberBg }]}>
              <Sparkles size={20} color={colors.cardAmber} strokeWidth={2} />
            </View>
            <Text
              style={[styles.title, { color: colors.text, fontSize: fontSizes['2xl'] }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Personalize Your{'\n'}Experience
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSizes.base }]}
            >
              Adjust settings to make AccessBridge work best for you
            </Text>
          </Animated.View>

          <View style={styles.cardContainer}>
            <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
                Visual Preferences
              </Text>
              <ToggleButton
                label="I have low vision"
                isActive={settings.hasLowVision}
                onToggle={() => updateSetting('hasLowVision', !settings.hasLowVision)}
                testID="toggle-low-vision"
              />
              <ToggleButton
                label="I prefer audio assistance"
                isActive={settings.prefersAudioAssistance}
                onToggle={() => updateSetting('prefersAudioAssistance', !settings.prefersAudioAssistance)}
                testID="toggle-audio-assistance"
              />
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
              <FontSizeSelector testID="font-size-selector" />
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
              <ContrastModeSelector testID="contrast-mode-selector" />
            </View>

            <View style={[styles.previewCard, { backgroundColor: colors.cardIndigoBg }]}>
              <Text style={[styles.previewTitle, { color: colors.cardIndigo, fontSize: fontSizes.base }]}>
                Preview
              </Text>
              <Text style={[styles.previewText, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                This is how text will appear throughout the app. You can always change these settings later.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <AccessibleButton
          title="Continue to AccessBridge"
          onPress={handleContinue}
          variant="primary"
          size="large"
          testID="continue-button"
        >
          <View style={styles.continueBtnInner}>
            <Text style={[styles.continueBtnText, { fontSize: fontSizes.base }]}>Continue to AccessBridge</Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </View>
        </AccessibleButton>
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
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sparklesBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  cardContainer: {
    paddingHorizontal: 20,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  previewCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  previewTitle: {
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  previewText: {
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
});

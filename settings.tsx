import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAccessibility, VoiceSpeed } from '@/contexts/AccessibilityContext';
import { useUser } from '@/contexts/UserContext';
import { FontSizeSelector } from '@/components/FontSizeSelector';
import { ContrastModeSelector } from '@/components/ContrastModeSelector';
import { UserPen, ChevronRight, Volume2, Globe, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const voiceSpeedOptions: { speed: VoiceSpeed; label: string; icon: string }[] = [
  { speed: 'slow', label: 'Slow', icon: '🐢' },
  { speed: 'normal', label: 'Normal', icon: '🎯' },
  { speed: 'fast', label: 'Fast', icon: '⚡' },
];

const languageOptions = ['English', 'Spanish', 'French', 'German', 'Chinese'];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, fontSizes, settings, updateSetting } = useAccessibility();
  const { signOut, profile } = useUser();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  const handleVoiceSpeedSelect = (speed: VoiceSpeed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSetting('voiceSpeed', speed);
  };

  const handleLanguageSelect = (language: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSetting('language', language);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
          <FontSizeSelector testID="settings-font-size" />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
          <ContrastModeSelector testID="settings-contrast" />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.cardOrangeBg }]}>
              <Volume2 size={18} color={colors.cardOrange} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
              Voice Speed
            </Text>
          </View>
          <View style={styles.optionsRow}>
            {voiceSpeedOptions.map((option) => {
              const isSelected = settings.voiceSpeed === option.speed;
              return (
                <TouchableOpacity
                  key={option.speed}
                  onPress={() => handleVoiceSpeedSelect(option.speed)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={[
                    styles.speedOption,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.speedEmoji}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.speedLabel,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontSize: fontSizes.sm,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: colors.cardIndigoBg }]}>
              <Globe size={18} color={colors.cardIndigo} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
              Language
            </Text>
          </View>
          <View style={[styles.languageList, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {languageOptions.map((language, index) => {
              const isSelected = settings.language === language;
              const isLast = index === languageOptions.length - 1;
              return (
                <TouchableOpacity
                  key={language}
                  onPress={() => handleLanguageSelect(language)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={[
                    styles.languageOption,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '06' },
                  ]}
                >
                  <Text
                    style={[
                      styles.languageLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontSize: fontSizes.base,
                        fontWeight: isSelected ? '600' as const : '400' as const,
                      },
                    ]}
                  >
                    {language}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/profile-setup');
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          style={[styles.helpCard, { backgroundColor: colors.cardEmeraldBg }]}
        >
          <View style={[styles.helpIconContainer, { backgroundColor: colors.cardEmerald + '18' }]}>
            <UserPen size={22} color={colors.cardEmerald} strokeWidth={2} />
          </View>
          <View style={styles.helpContent}>
            <Text style={[styles.helpTitle, { color: colors.text, fontSize: fontSizes.base }]}>
              Edit Profile
            </Text>
            <Text style={[styles.helpSubtitle, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
              Update your personal information
            </Text>
          </View>
          <ChevronRight size={20} color={colors.cardEmerald} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={[styles.signOutCard, { backgroundColor: colors.errorLight }]}
        >
          <View style={[styles.signOutIcon, { backgroundColor: colors.error + '15' }]}>
            <LogOut size={18} color={colors.error} strokeWidth={2} />
          </View>
          <View style={styles.signOutContent}>
            <Text style={[styles.signOutTitle, { color: colors.error, fontSize: fontSizes.base }]}>
              Sign Out
            </Text>
            <Text style={[styles.signOutEmail, { color: colors.error, fontSize: fontSizes.xs }]}>
              {profile.email || 'Signed in'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.error} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            AccessBridge v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600' as const,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  speedEmoji: {
    fontSize: 18,
  },
  speedLabel: {
    fontWeight: '500' as const,
  },
  languageList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  languageLabel: {},
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 12,
  },
  helpIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  helpSubtitle: {
    opacity: 0.7,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  signOutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutContent: {
    flex: 1,
  },
  signOutTitle: {
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  signOutEmail: {
    opacity: 0.7,
    fontWeight: '400' as const,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontWeight: '400' as const,
  },
});

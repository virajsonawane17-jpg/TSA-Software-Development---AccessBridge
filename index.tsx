import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useUser } from '@/contexts/UserContext';
import { Colors } from '@/constants/colors';

export default function EntryScreen() {
  const router = useRouter();
  const { settings, isLoading: accessibilityLoading } = useAccessibility();
  const { auth, profile, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!accessibilityLoading && !userLoading) {
      const timer = setTimeout(() => {
        if (auth.isAuthenticated && profile.hasCompletedProfile && settings.hasCompletedSetup) {
          console.log('Navigating to home - fully set up');
          router.replace('/home');
        } else if (auth.isAuthenticated && profile.hasCompletedProfile) {
          console.log('Navigating to setup - profile done, needs accessibility setup');
          router.replace('/setup');
        } else if (auth.isAuthenticated) {
          console.log('Navigating to profile-setup - authenticated, needs profile');
          router.replace('/profile-setup');
        } else {
          console.log('Navigating to welcome - going to get started page');
          router.replace('/welcome');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [accessibilityLoading, userLoading, auth.isAuthenticated, profile.hasCompletedProfile, settings.hasCompletedSetup, router]);

  const colors = settings.contrastMode === 'highContrast' ? Colors.highContrast : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

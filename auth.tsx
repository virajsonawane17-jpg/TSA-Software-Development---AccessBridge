import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useUser } from '@/contexts/UserContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const { colors, fontSizes } = useAccessibility();
  const { signIn, signUp } = useUser();

  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const switchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
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
      Animated.timing(formFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, formFade]);

  const handleModeSwitch = (newMode: AuthMode) => {
    if (newMode === mode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');
    Animated.timing(switchAnim, {
      toValue: newMode === 'login' ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
    setMode(newMode);
  };

  const validateInputs = (): boolean => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Please enter a password.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateInputs()) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let result: { success: boolean; error?: string };
      if (mode === 'signup') {
        result = await signUp(email.trim(), password);
      } else {
        result = await signIn(email.trim(), password);
      }

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (mode === 'signup') {
          router.replace('/profile-setup');
        } else {
          router.replace('/home');
        }
      } else {
        setError(result.error ?? 'Something went wrong.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.log('Auth error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabIndicatorLeft = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  }) as unknown as number;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.header,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: colors.text, fontSize: fontSizes['3xl'] }]}>
                {mode === 'signup' ? 'Create\nAccount' : 'Welcome\nBack'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                {mode === 'signup'
                  ? 'Join AccessBridge to get started'
                  : 'Sign in to continue your journey'}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.formContainer, { opacity: formFade }]}>
              <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSecondary }]}>
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    {
                      backgroundColor: colors.primary,
                      left: tabIndicatorLeft,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => handleModeSwitch('signup')}
                  accessibilityRole="tab"
                  accessibilityLabel="Sign Up"
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: mode === 'signup' ? '#FFFFFF' : colors.textSecondary,
                        fontSize: fontSizes.sm,
                      },
                    ]}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => handleModeSwitch('login')}
                  accessibilityRole="tab"
                  accessibilityLabel="Log In"
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: mode === 'login' ? '#FFFFFF' : colors.textSecondary,
                        fontSize: fontSizes.sm,
                      },
                    ]}
                  >
                    Log In
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                  <Text style={[styles.errorText, { color: colors.error, fontSize: fontSizes.sm }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  EMAIL ADDRESS
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Mail size={18} color={colors.textSecondary} strokeWidth={1.8} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSecondary + '80'}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="auth-email-input"
                    accessibilityLabel="Email address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  PASSWORD
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Lock size={18} color={colors.textSecondary} strokeWidth={1.8} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.textSecondary + '80'}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    secureTextEntry={!showPassword}
                    testID="auth-password-input"
                    accessibilityLabel="Password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={colors.textSecondary} strokeWidth={1.8} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} strokeWidth={1.8} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                    CONFIRM PASSWORD
                  </Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Lock size={18} color={colors.textSecondary} strokeWidth={1.8} />
                    <TextInput
                      style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
                      placeholder="Re-enter password"
                      placeholderTextColor={colors.textSecondary + '80'}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                      secureTextEntry={!showPassword}
                      testID="auth-confirm-password-input"
                      accessibilityLabel="Confirm password"
                    />
                  </View>
                </View>
              )}

              <View style={styles.submitSection}>
                <AccessibleButton
                  title={isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  disabled={isSubmitting}
                  testID="auth-submit-button"
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    position: 'relative',
    height: 48,
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '47%',
    borderRadius: 11,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontWeight: '600' as const,
  },
  errorBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontWeight: '400' as const,
  },
  submitSection: {
    marginTop: 24,
  },
});

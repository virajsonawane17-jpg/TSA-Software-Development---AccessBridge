import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useUser, VisionCondition, AssistancePreference } from '@/contexts/UserContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import {
  User,
  Calendar,
  Eye,
  Ear,
  Vibrate,
  Phone,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowRight,
  Heart,
  Shield,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VISION_CONDITIONS: { value: VisionCondition; label: string; description: string }[] = [
  { value: 'low_vision', label: 'Low Vision', description: 'Partially sighted' },
  { value: 'legally_blind', label: 'Legally Blind', description: 'Very limited sight' },
  { value: 'totally_blind', label: 'Totally Blind', description: 'No functional vision' },
  { value: 'color_blind', label: 'Color Blind', description: 'Color distinction' },
  { value: 'tunnel_vision', label: 'Tunnel Vision', description: 'Limited peripheral' },
  { value: 'light_sensitivity', label: 'Light Sensitive', description: 'Bright light discomfort' },
  { value: 'other', label: 'Other', description: 'Different condition' },
];

const ASSISTANCE_OPTIONS: { value: AssistancePreference; label: string; icon: typeof Ear; description: string }[] = [
  { value: 'voice', label: 'Voice', icon: Ear, description: 'Audio guidance' },
  { value: 'haptic', label: 'Haptic', icon: Vibrate, description: 'Vibration' },
  { value: 'both', label: 'Both', icon: Heart, description: 'Combined' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { colors, fontSizes } = useAccessibility();
  const { completeProfile, auth } = useUser();

  const [step, setStep] = useState(0);
  const totalSteps = 4;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [visionCondition, setVisionCondition] = useState<VisionCondition | ''>('');
  const [visionDetails, setVisionDetails] = useState('');
  const [usesScreenReader, setUsesScreenReader] = useState(false);
  const [assistancePreference, setAssistancePreference] = useState<AssistancePreference>('voice');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;

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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / totalSteps,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const animateStepTransition = useCallback((direction: 'forward' | 'back') => {
    const startX = direction === 'forward' ? 40 : -40;
    stepFade.setValue(0);
    stepSlide.setValue(startX);
    Animated.parallel([
      Animated.timing(stepFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(stepSlide, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepFade, stepSlide]);

  const goNext = () => {
    if (step < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
      animateStepTransition('forward');
    }
  };

  const goBack = () => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step - 1);
      animateStepTransition('back');
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeProfile({
      name: name.trim(),
      age,
      email: auth.email,
      visionCondition,
      visionDetails: visionDetails.trim(),
      usesScreenReader,
      assistancePreference,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
    });
    router.replace('/setup');
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return name.trim().length >= 2;
      case 1: return visionCondition !== '';
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const stepLabels = ['About You', 'Vision', 'Preferences', 'Safety'];

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconContainer, { backgroundColor: colors.cardIndigoBg }]}>
        <User size={24} color={colors.cardIndigo} strokeWidth={2} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
        Tell us about yourself
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
        This helps us personalize your experience
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
          FULL NAME
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <User size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <TextInput
            style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
            placeholder="Your full name"
            placeholderTextColor={colors.textSecondary + '80'}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="profile-name-input"
            accessibilityLabel="Full name"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
          AGE (OPTIONAL)
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Calendar size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <TextInput
            style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
            placeholder="Your age"
            placeholderTextColor={colors.textSecondary + '80'}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
            testID="profile-age-input"
            accessibilityLabel="Age"
          />
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconContainer, { backgroundColor: colors.cardTealBg }]}>
        <Eye size={24} color={colors.cardTeal} strokeWidth={2} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
        Your vision condition
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
        Select what best describes your vision
      </Text>

      <View style={styles.optionsGrid}>
        {VISION_CONDITIONS.map((condition) => {
          const isSelected = visionCondition === condition.value;
          return (
            <TouchableOpacity
              key={condition.value}
              style={[
                styles.conditionCard,
                {
                  backgroundColor: isSelected ? colors.primary + '08' : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setVisionCondition(condition.value);
              }}
              accessibilityRole="radio"
              accessibilityLabel={condition.label}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.conditionHeader}>
                <Text
                  style={[
                    styles.conditionLabel,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontSize: fontSizes.sm,
                    },
                  ]}
                >
                  {condition.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text
                style={[styles.conditionDesc, { color: colors.textSecondary, fontSize: fontSizes.xs }]}
              >
                {condition.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {visionCondition === 'other' && (
        <View style={[styles.inputGroup, { marginTop: 12 }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            PLEASE DESCRIBE
          </Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
              placeholder="Describe your condition"
              placeholderTextColor={colors.textSecondary + '80'}
              value={visionDetails}
              onChangeText={setVisionDetails}
              testID="profile-vision-details"
              accessibilityLabel="Vision condition details"
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconContainer, { backgroundColor: colors.cardOrangeBg }]}>
        <Ear size={24} color={colors.cardOrange} strokeWidth={2} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
        Assistance preferences
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
        How should AccessBridge communicate?
      </Text>

      <View style={styles.assistanceOptions}>
        {ASSISTANCE_OPTIONS.map((option) => {
          const isSelected = assistancePreference === option.value;
          const IconComp = option.icon;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.assistanceCard,
                {
                  backgroundColor: isSelected ? colors.primary + '08' : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAssistancePreference(option.value);
              }}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.assistanceIconWrap, { backgroundColor: isSelected ? colors.primary + '12' : colors.background }]}>
                <IconComp size={22} color={isSelected ? colors.primary : colors.textSecondary} strokeWidth={2} />
              </View>
              <Text
                style={[
                  styles.assistanceLabel,
                  { color: isSelected ? colors.primary : colors.text, fontSize: fontSizes.sm },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[styles.assistanceDesc, { color: colors.textSecondary, fontSize: fontSizes.xs }]}
              >
                {option.description}
              </Text>
              {isSelected && (
                <View style={[styles.assistanceCheck, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.screenReaderToggle,
          {
            backgroundColor: usesScreenReader ? colors.primary + '08' : colors.surfaceSecondary,
            borderColor: usesScreenReader ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setUsesScreenReader(!usesScreenReader);
        }}
        accessibilityRole="switch"
        accessibilityLabel="I use a screen reader"
        accessibilityState={{ checked: usesScreenReader }}
      >
        <View style={styles.screenReaderContent}>
          <View>
            <Text style={[styles.screenReaderLabel, { color: colors.text, fontSize: fontSizes.base }]}>
              I use a screen reader
            </Text>
            <Text style={[styles.screenReaderDesc, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
              VoiceOver, TalkBack, or similar
            </Text>
          </View>
          <View
            style={[
              styles.toggleOuter,
              { backgroundColor: usesScreenReader ? colors.primary : colors.border },
            ]}
          >
            <View
              style={[
                styles.toggleInner,
                { transform: [{ translateX: usesScreenReader ? 20 : 2 }] },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconContainer, { backgroundColor: colors.cardEmeraldBg }]}>
        <Shield size={24} color={colors.cardEmerald} strokeWidth={2} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
        Emergency contact
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
        Optional — someone to reach in emergencies
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
          CONTACT NAME
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <UserCheck size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <TextInput
            style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
            placeholder="e.g. Mom, Dad, Caretaker"
            placeholderTextColor={colors.textSecondary + '80'}
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            autoCapitalize="words"
            testID="profile-emergency-name"
            accessibilityLabel="Emergency contact name"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
          PHONE NUMBER
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Phone size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <TextInput
            style={[styles.input, { color: colors.text, fontSize: fontSizes.base }]}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={colors.textSecondary + '80'}
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            keyboardType="phone-pad"
            testID="profile-emergency-phone"
            accessibilityLabel="Emergency contact phone number"
          />
        </View>
      </View>

      <View style={[styles.safetyNote, { backgroundColor: colors.cardEmeraldBg }]}>
        <Shield size={16} color={colors.cardEmerald} strokeWidth={2} />
        <Text style={[styles.safetyNoteText, { color: colors.cardEmerald, fontSize: fontSizes.xs }]}>
          Your data stays on your device. We never share personal information.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: fontSizes['2xl'] }]}>
            Set Up Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
            Step {step + 1} of {totalSteps} — {stepLabels[step]}
          </Text>

          <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: progressWidth },
              ]}
            />
          </View>
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.stepContainer}>
            <Animated.View
              style={{
                opacity: stepFade,
                transform: [{ translateX: stepSlide }],
                flex: 1,
              }}
            >
              {renderCurrentStep()}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerRow}>
            {step > 0 ? (
              <TouchableOpacity
                onPress={goBack}
                style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
                accessibilityLabel="Previous step"
                accessibilityRole="button"
              >
                <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backPlaceholder} />
            )}

            <View style={styles.footerButtonWrap}>
              {step < totalSteps - 1 ? (
                <AccessibleButton
                  title="Continue"
                  onPress={goNext}
                  variant="primary"
                  size="large"
                  disabled={!canProceed()}
                  testID="profile-next-button"
                >
                  <View style={styles.nextBtnInner}>
                    <Text style={[styles.nextBtnText, { fontSize: fontSizes.base }]}>Continue</Text>
                    <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </AccessibleButton>
              ) : (
                <AccessibleButton
                  title="Finish Setup"
                  onPress={handleComplete}
                  variant="primary"
                  size="large"
                  testID="profile-complete-button"
                >
                  <View style={styles.nextBtnInner}>
                    <Text style={[styles.nextBtnText, { fontSize: fontSizes.base }]}>Finish Setup</Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </AccessibleButton>
              )}
            </View>
          </View>
        </SafeAreaView>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontWeight: '700' as const,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontWeight: '400' as const,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  stepContent: {
    paddingTop: 4,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontWeight: '700' as const,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepDescription: {
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  conditionLabel: {
    fontWeight: '600' as const,
    flex: 1,
  },
  conditionDesc: {
    lineHeight: 16,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistanceOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  assistanceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  assistanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistanceLabel: {
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  assistanceDesc: {
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  assistanceCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenReaderToggle: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  screenReaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenReaderLabel: {
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  screenReaderDesc: {
    opacity: 0.7,
  },
  toggleOuter: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  safetyNoteText: {
    flex: 1,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 48,
  },
  footerButtonWrap: {
    flex: 1,
    alignItems: 'stretch',
  },
  nextBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
});

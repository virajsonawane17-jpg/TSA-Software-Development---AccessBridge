import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Navigation, AlertTriangle, Phone, ArrowUp, ArrowLeft, ArrowRight, Camera, MapPin, Volume2, VolumeX, Shield, Hand, Bookmark, Check, Vibrate, ScanLine, Gauge } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useHistory } from '@/contexts/HistoryContext';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-1234567890abcdef1234567890abcdef12345678',
});

const generateText = async ({ messages }: { messages: any[] }) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 150,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || 'AI response unavailable';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'AI service temporarily unavailable';
  }
};

type Direction = 'forward' | 'left' | 'right' | 'stop' | 'caution';

interface NavigationInstruction {
  direction: Direction;
  message: string;
  isWarning: boolean;
}

export default function NavigationHelpScreen() {
  const { colors, fontSizes, settings } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [vibrationFeedback, setVibrationFeedback] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [instruction, setInstruction] = useState<NavigationInstruction>({
    direction: 'forward',
    message: 'Ready to guide you',
    isWarning: false,
  });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addHistoryEntry } = useHistory();
  const startTimeRef = useRef<number>(Date.now());
  
  const cameraRef = useRef<CameraView>(null);
  const navigationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const emergencyPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [emergencyPulse]);

  useEffect(() => {
    if (instruction.isWarning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [instruction.isWarning, pulseAnim]);

  useEffect(() => {
    return () => {
      void Speech.stop();
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current);
      }
    };
  }, []);

  const getDirectionIcon = () => {
    switch (instruction.direction) {
      case 'left': return ArrowLeft;
      case 'right': return ArrowRight;
      case 'stop': return Hand;
      case 'caution': return AlertTriangle;
      default: return ArrowUp;
    }
  };

  const speakInstruction = useCallback((text: string) => {
    if (!audioFeedback) return;
    void Speech.stop();
    const speechRate = settings.voiceSpeed === 'slow' ? 0.8 : settings.voiceSpeed === 'fast' ? 1.2 : 1.0;
    Speech.speak(text, { rate: speechRate });
  }, [settings.voiceSpeed, audioFeedback]);

  const analyzeNavigation = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isProcessing) return;

    try {
      setIsProcessing(true);
      console.log('Analyzing navigation path...');

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
      });

      if (photo?.base64) {
        const rawResult = await generateText({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are a navigation assistant for a visually impaired person who is walking. Analyze this image and provide walking guidance.

Respond in this EXACT format:
DIRECTION: [forward/left/right/stop/caution]
MESSAGE: [Brief instruction, max 8 words]
WARNING: [yes/no]

Guidelines:
- forward = safe to walk straight
- left = suggest turning left to avoid obstacle or follow path
- right = suggest turning right
- stop = immediate danger, must stop
- caution = proceed slowly, potential obstacle

Focus on: clear path, obstacles, stairs, doors, people, curbs, vehicles. Be concise and actionable.`,
                },
                {
                  type: 'image',
                  image: `data:image/jpeg;base64,${photo.base64}`,
                },
              ],
            },
          ],
        });

        const result = (typeof rawResult === 'string' && rawResult.trim()) ? rawResult : '';
        if (!result) {
          console.log('Empty navigation result, skipping');
          return;
        }
        console.log('Navigation result:', result);

        const lines = result.split('\n').filter(l => l.trim());
        let direction: Direction = 'forward';
        let message = 'Continue forward';
        let isWarning = false;

        for (const line of lines) {
          if (line.toUpperCase().includes('DIRECTION:')) {
            const dir = line.toLowerCase();
            if (dir.includes('left')) direction = 'left';
            else if (dir.includes('right')) direction = 'right';
            else if (dir.includes('stop')) direction = 'stop';
            else if (dir.includes('caution')) direction = 'caution';
            else direction = 'forward';
          }
          if (line.toUpperCase().includes('MESSAGE:')) {
            message = line.replace(/MESSAGE:/i, '').trim();
          }
          if (line.toUpperCase().includes('WARNING:')) {
            isWarning = line.toLowerCase().includes('yes');
          }
        }

        setInstruction({ direction, message, isWarning });
        setScanCount(prev => prev + 1);
        
        if (vibrationFeedback) {
          if (isWarning) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        
        speakInstruction(message);
      }
    } catch (error) {
      console.error('Navigation analysis error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isCameraReady, isProcessing, speakInstruction, vibrationFeedback]);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    void analyzeNavigation();
    navigationIntervalRef.current = setInterval(() => {
      void analyzeNavigation();
    }, 3000);
  }, [analyzeNavigation]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    void Speech.stop();
    if (navigationIntervalRef.current) {
      clearInterval(navigationIntervalRef.current);
      navigationIntervalRef.current = null;
    }
    setInstruction({
      direction: 'forward',
      message: 'Navigation stopped',
      isWarning: false,
    });
  }, []);

  const handleToggleNavigation = () => {
    if (isNavigating) {
      stopNavigation();
    } else {
      startNavigation();
    }
  };

  const handleEmergencyPress = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowEmergencyModal(true);
  };

  const handleConfirmEmergency = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEmergencyConfirmed(true);
    setTimeout(() => {
      setShowEmergencyModal(false);
      setEmergencyConfirmed(false);
    }, 3000);
  };

  const handleCancelEmergency = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmergencyModal(false);
  };

  const DirectionIcon = getDirectionIcon();

  const stackScreenOptions = {
    title: 'Mobility Assistant',
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            Loading camera...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={stackScreenOptions} />
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Camera size={48} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
            Camera Access Needed
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
            We need camera permission to help guide your navigation.
          </Text>
          <AccessibleButton
            title="Grant Camera Access"
            onPress={requestPermission}
            variant="primary"
            size="large"
            testID="grant-camera-permission"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={stackScreenOptions} />

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => {
            console.log('Navigation camera ready');
            setIsCameraReady(true);
          }}
        />

        {isNavigating && (
          <Animated.View 
            style={[
              styles.directionOverlay,
              {
                backgroundColor: instruction.isWarning ? colors.error + 'E6' : colors.primary + 'E6',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <DirectionIcon size={72} color="#FFFFFF" strokeWidth={2} />
            <Text style={[styles.directionText, { fontSize: fontSizes['2xl'] }]}>
              {instruction.message}
            </Text>
            {isProcessing && (
              <Text style={[styles.processingText, { fontSize: fontSizes.sm }]}>
                Analyzing path...
              </Text>
            )}
          </Animated.View>
        )}

        {!isNavigating && (
          <View style={[styles.readyOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Navigation size={56} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={[styles.readyText, { fontSize: fontSizes.lg }]}>
              Tap Start to begin navigation
            </Text>
            <Text style={[styles.readySubtext, { fontSize: fontSizes.sm }]}>
              Hold phone at chest level, camera facing forward
            </Text>
          </View>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Animated.View 
          style={[
            styles.emergencyButtonContainer,
            { transform: [{ scale: emergencyPulse }] }
          ]}
        >
          <Pressable
            onPress={handleEmergencyPress}
            style={({ pressed }) => [
              styles.emergencyButton,
              { 
                backgroundColor: colors.emergencyRed,
                opacity: pressed ? 0.9 : 1,
              }
            ]}
            accessibilityLabel="Emergency button"
            accessibilityRole="button"
            testID="emergency-button"
          >
            <Shield size={24} color="#FFFFFF" strokeWidth={2} />
            <Text style={[styles.emergencyButtonText, { fontSize: fontSizes.base }]}>
              EMERGENCY
            </Text>
          </Pressable>
        </Animated.View>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.statItem}>
            <ScanLine size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.sm }]}>{scanCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Scans</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Gauge size={14} color={isNavigating ? colors.success : colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.statValue, { color: isNavigating ? colors.success : colors.textSecondary, fontSize: fontSizes.sm }]}>
              {isNavigating ? 'Active' : 'Idle'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Status</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.sm }]}>
              {Math.round((Date.now() - startTimeRef.current) / 1000)}s
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Duration</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAudioFeedback(!audioFeedback);
            }}
            activeOpacity={0.7}
            style={[
              styles.iconActionButton,
              {
                backgroundColor: audioFeedback ? colors.primary + '12' : colors.surfaceSecondary,
                borderColor: audioFeedback ? colors.primary : colors.border,
                borderWidth: 1.5,
              },
            ]}
            testID="toggle-audio-feedback"
          >
            {audioFeedback ? (
              <Volume2 size={22} color={colors.primary} strokeWidth={2} />
            ) : (
              <VolumeX size={22} color={colors.textSecondary} strokeWidth={2} />
            )}
            <Text
              style={[
                styles.iconActionLabel,
                {
                  color: audioFeedback ? colors.primary : colors.textSecondary,
                  fontSize: fontSizes.xs,
                },
              ]}
              numberOfLines={1}
            >
              {audioFeedback ? 'Sound On' : 'Sound Off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setVibrationFeedback(!vibrationFeedback);
            }}
            activeOpacity={0.7}
            style={[
              styles.iconActionButton,
              {
                backgroundColor: vibrationFeedback ? colors.primary + '12' : colors.surfaceSecondary,
                borderColor: vibrationFeedback ? colors.primary : colors.border,
                borderWidth: 1.5,
              },
            ]}
            testID="toggle-vibration-feedback"
          >
            <Vibrate size={22} color={vibrationFeedback ? colors.primary : colors.textSecondary} strokeWidth={2} />
            <Text
              style={[
                styles.iconActionLabel,
                {
                  color: vibrationFeedback ? colors.primary : colors.textSecondary,
                  fontSize: fontSizes.xs,
                },
              ]}
              numberOfLines={1}
            >
              {vibrationFeedback ? 'Haptic On' : 'Haptic Off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (saved) return;
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
              await addHistoryEntry({
                featureType: 'mobility_assistant',
                title: `Navigation — ${scanCount} scans`,
                summary: instruction.message || 'Mobility assistant session',
                durationSeconds: duration,
              });
              setSaved(true);
            }}
            disabled={saved}
            activeOpacity={0.7}
            style={[
              styles.saveActionButton,
              {
                backgroundColor: saved ? colors.successLight : colors.primary,
              },
            ]}
            testID="save-history-button"
          >
            {saved ? (
              <Check size={20} color={colors.success} strokeWidth={2.5} />
            ) : (
              <Bookmark size={20} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text
              style={[
                styles.saveActionLabel,
                {
                  color: saved ? colors.success : '#FFFFFF',
                  fontSize: fontSizes.sm,
                },
              ]}
              numberOfLines={1}
            >
              {saved ? 'Saved!' : 'Save Session'}
            </Text>
          </TouchableOpacity>
        </View>

        <AccessibleButton
          title={isNavigating ? 'Stop Navigation' : 'Start Navigation'}
          onPress={handleToggleNavigation}
          variant={isNavigating ? 'danger' : 'primary'}
          size="large"
          disabled={!isCameraReady}
          testID="toggle-navigation-button"
        />
      </SafeAreaView>

      <Modal
        visible={showEmergencyModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEmergency}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {!emergencyConfirmed ? (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.emergencyRedLight }]}>
                  <AlertTriangle size={44} color={colors.emergencyRed} strokeWidth={2} />
                </View>

                <Text style={[styles.modalTitle, { color: colors.text, fontSize: fontSizes['2xl'] }]}>
                  Emergency Mode
                </Text>

                <Text style={[styles.modalDescription, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                  This will send your location and call emergency contact.
                </Text>

                <View style={styles.modalFeatures}>
                  <View style={styles.featureRow}>
                    <MapPin size={18} color={colors.emergencyRed} strokeWidth={2} />
                    <Text style={[styles.featureText, { color: colors.text, fontSize: fontSizes.sm }]}>
                      Share live location
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Phone size={18} color={colors.emergencyRed} strokeWidth={2} />
                    <Text style={[styles.featureText, { color: colors.text, fontSize: fontSizes.sm }]}>
                      Call emergency contact
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Volume2 size={18} color={colors.emergencyRed} strokeWidth={2} />
                    <Text style={[styles.featureText, { color: colors.text, fontSize: fontSizes.sm }]}>
                      Voice confirmation
                    </Text>
                  </View>
                </View>

                <AccessibleButton
                  title="Confirm Emergency"
                  onPress={handleConfirmEmergency}
                  variant="danger"
                  size="large"
                  testID="confirm-emergency-button"
                />

                <Pressable
                  onPress={handleCancelEmergency}
                  style={styles.cancelButton}
                  testID="cancel-emergency-button"
                >
                  <Text style={[styles.cancelText, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                    Cancel
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.successLight }]}>
                  <Phone size={44} color={colors.success} strokeWidth={2} />
                </View>

                <Text style={[styles.modalTitle, { color: colors.success, fontSize: fontSizes['2xl'] }]}>
                  Help is on the way
                </Text>

                <Text style={[styles.modalDescription, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                  Your location has been shared and emergency contact is being called.
                </Text>

                <View style={[styles.locationBadge, { backgroundColor: colors.successLight }]}>
                  <MapPin size={18} color={colors.success} strokeWidth={2} />
                  <Text style={[styles.locationText, { color: colors.success, fontSize: fontSizes.sm }]}>
                    Location shared successfully
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center' as const,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  permissionText: {
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  directionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    borderRadius: 24,
  },
  directionText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    paddingHorizontal: 24,
  },
  processingText: {
    color: 'rgba(255,255,255,0.8)',
  },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 32,
    borderRadius: 24,
  },
  readyText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  readySubtext: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center' as const,
  },
  emergencyButtonContainer: {
    marginBottom: 2,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyButtonText: {
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontWeight: '700' as const,
  },
  statLabel: {
    fontWeight: '400' as const,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconActionButton: {
    minWidth: 80,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  iconActionLabel: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  saveActionButton: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveActionLabel: {
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  modalDescription: {
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalFeatures: {
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontWeight: '500' as const,
  },
  cancelButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontWeight: '500' as const,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
  },
  locationText: {
    fontWeight: '500' as const,
  },
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Camera, Volume2, VolumeX, Vibrate, AlertTriangle, RefreshCw, Bookmark, Check, Gauge, ScanLine } from 'lucide-react-native';
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
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useHistory } from '@/contexts/HistoryContext';

export default function ObjectDetectionScreen() {
  const { colors, fontSizes, settings } = useAccessibility();
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [vibrationFeedback, setVibrationFeedback] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<string | null>(null);
  const [proximityLevel, setProximityLevel] = useState<'safe' | 'caution' | 'warning' | 'danger'>('safe');
  const [lastSpoken, setLastSpoken] = useState('');
  const [detectionCount, setDetectionCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const { addHistoryEntry } = useHistory();
  const startTimeRef = useRef<number>(Date.now());
  const cameraRef = useRef<CameraView>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getProximityColor = () => {
    switch (proximityLevel) {
      case 'danger': return colors.warningCritical;
      case 'warning': return colors.warningHigh;
      case 'caution': return colors.warningMedium;
      default: return colors.success;
    }
  };

  const getProximityMessage = () => {
    switch (proximityLevel) {
      case 'danger': return 'Very close obstacle!';
      case 'warning': return 'Obstacle nearby';
      case 'caution': return 'Object detected ahead';
      default: return 'Path appears clear';
    }
  };

  useEffect(() => {
    if (proximityLevel === 'danger' || proximityLevel === 'warning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: proximityLevel === 'danger' ? 200 : 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: proximityLevel === 'danger' ? 200 : 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      if (vibrationFeedback) {
        void Haptics.impactAsync(
          proximityLevel === 'danger' 
            ? Haptics.ImpactFeedbackStyle.Heavy 
            : Haptics.ImpactFeedbackStyle.Medium
        );
      }
    } else {
      pulseAnim.setValue(1);
    }
  }, [proximityLevel, vibrationFeedback, pulseAnim]);

  const speakAlert = useCallback((text: string) => {
    if (!audioFeedback || text === lastSpoken) return;
    
    void Speech.stop();
    const speechRate = settings.voiceSpeed === 'slow' ? 0.8 : settings.voiceSpeed === 'fast' ? 1.2 : 1.0;
    Speech.speak(text, { rate: speechRate });
    setLastSpoken(text);
  }, [audioFeedback, lastSpoken, settings.voiceSpeed]);

  const detectObjects = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isDetecting) return;

    try {
      setIsDetecting(true);
      console.log('Capturing frame for object detection...');

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
                  text: `You are an obstacle detection system for a visually impaired person. Analyze this image and respond in this EXACT format:

PROXIMITY: [safe/caution/warning/danger]
ALERT: [One short sentence about the most important thing to know, max 10 words]

Guidelines:
- danger = obstacle within 2 feet, immediate action needed
- warning = obstacle 2-4 feet away
- caution = obstacle 4-8 feet away
- safe = path clear or obstacles far away

Focus on: walls, furniture, people, doors, stairs, vehicles, pets. Be brief and urgent if danger.`,
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
          console.log('Empty detection result, skipping');
          return;
        }
        console.log('Detection result:', result);

        const lines = result.split('\n').filter(l => l.trim());
        let newProximity: 'safe' | 'caution' | 'warning' | 'danger' = 'safe';
        let alertText = 'Path clear';

        for (const line of lines) {
          if (line.toUpperCase().includes('PROXIMITY:')) {
            const level = line.toLowerCase();
            if (level.includes('danger')) newProximity = 'danger';
            else if (level.includes('warning')) newProximity = 'warning';
            else if (level.includes('caution')) newProximity = 'caution';
            else newProximity = 'safe';
          }
          if (line.toUpperCase().includes('ALERT:')) {
            alertText = line.replace(/ALERT:/i, '').trim();
          }
        }

        setProximityLevel(newProximity);
        setCurrentAlert(alertText);
        setDetectionCount(prev => prev + 1);

        if (newProximity !== 'safe') {
          speakAlert(alertText);
        }
      }
    } catch (error) {
      console.error('Object detection error:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [isCameraReady, isDetecting, speakAlert]);

  const startContinuousDetection = useCallback(() => {
    if (detectionIntervalRef.current) return;
    
    void detectObjects();
    detectionIntervalRef.current = setInterval(() => {
      void detectObjects();
    }, 1000);
  }, [detectObjects]);

  const stopContinuousDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    void Speech.stop();
  }, []);

  useEffect(() => {
    if (isCameraReady) {
      startContinuousDetection();
    }
    return () => stopContinuousDetection();
  }, [isCameraReady, startContinuousDetection, stopContinuousDetection]);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const stackScreenOptions = {
    title: 'Object Detection',
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
            We need camera permission to detect objects around you.
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

      <Animated.View 
        style={[
          styles.alertBanner, 
          { 
            backgroundColor: getProximityColor(),
            transform: [{ scale: pulseAnim }],
            marginHorizontal: 16,
            marginTop: 8,
          }
        ]}
      >
        <View style={styles.alertContent}>
          {proximityLevel !== 'safe' && (
            <AlertTriangle size={24} color="#FFFFFF" strokeWidth={2.5} />
          )}
          <View style={styles.alertTextContainer}>
            <Text style={[styles.alertTitle, { fontSize: fontSizes.base }]}>
              {getProximityMessage()}
            </Text>
            {currentAlert && proximityLevel !== 'safe' && (
              <Text style={[styles.alertDetail, { fontSize: fontSizes.sm }]} numberOfLines={1}>
                {currentAlert}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.feedbackIcons}>
          {audioFeedback && <Volume2 size={16} color="#FFFFFF" strokeWidth={2} />}
          {vibrationFeedback && <Vibrate size={16} color="#FFFFFF" strokeWidth={2} />}
        </View>
      </Animated.View>

      <View style={styles.proximityIndicator}>
        <View style={[styles.proximityDot, { backgroundColor: getProximityColor() }]} />
        <View style={[styles.proximityDot, { backgroundColor: proximityLevel !== 'safe' ? getProximityColor() : colors.border, opacity: proximityLevel !== 'safe' ? 1 : 0.3 }]} />
        <View style={[styles.proximityDot, { backgroundColor: proximityLevel === 'warning' || proximityLevel === 'danger' ? getProximityColor() : colors.border, opacity: proximityLevel === 'warning' || proximityLevel === 'danger' ? 1 : 0.3 }]} />
        <View style={[styles.proximityDot, { backgroundColor: proximityLevel === 'danger' ? getProximityColor() : colors.border, opacity: proximityLevel === 'danger' ? 1 : 0.3 }]} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => {
            console.log('Camera ready for object detection');
            setIsCameraReady(true);
          }}
        />

        <View style={styles.flipButtonContainer}>
          <AccessibleButton
            title=""
            onPress={toggleFacing}
            variant="outline"
            style={[styles.flipButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            testID="flip-camera-button"
          >
            <RefreshCw size={20} color={colors.text} strokeWidth={2} />
          </AccessibleButton>
        </View>

        {isDetecting && (
          <View style={[styles.scanningIndicator, { backgroundColor: colors.primary }]}>
            <Text style={[styles.scanningText, { fontSize: fontSizes.xs }]}>Scanning...</Text>
          </View>
        )}

        <View style={[styles.cameraOverlay, { borderColor: getProximityColor() }]} />
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.statItem}>
            <ScanLine size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.sm }]}>{detectionCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Scans</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Gauge size={14} color={getProximityColor()} strokeWidth={2} />
            <Text style={[styles.statValue, { color: getProximityColor(), fontSize: fontSizes.sm }]}>
              {proximityLevel.charAt(0).toUpperCase() + proximityLevel.slice(1)}
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
                featureType: 'object_detection',
                title: `Object Detection — ${detectionCount} scans`,
                summary: currentAlert || 'Object detection session',
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
      </SafeAreaView>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  alertDetail: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  feedbackIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  proximityIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  proximityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  flipButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scanningText: {
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 24,
    pointerEvents: 'none',
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 12,
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
});

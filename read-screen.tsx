import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Camera, Eye, Volume2, VolumeX, RefreshCw, Bookmark, Check, ImageIcon, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
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
import { useHistory } from '@/contexts/HistoryContext';

export default function ReadScreenScreen() {
  const { colors, fontSizes, settings } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);
  const { addHistoryEntry } = useHistory();
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanGlowAnim = useRef(new Animated.Value(0.6)).current;
  const cornerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isReading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isReading, waveAnim]);

  React.useEffect(() => {
    if (capturedPhoto && isProcessing) {
      Animated.timing(cornerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scanGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scanGlowAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      scanGlowAnim.setValue(0.6);
      cornerAnim.setValue(0);
    }
  }, [capturedPhoto, isProcessing, scanLineAnim, scanGlowAnim, cornerAnim]);

  React.useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isProcessing, pulseAnim]);

  React.useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const captureAndDescribe = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isProcessing) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsProcessing(true);
      console.log('Capturing screen for description...');

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (photo?.base64) {
        console.log('Photo captured, analyzing with AI...');
        const photoUri = photo.uri || `data:image/jpeg;base64,${photo.base64}`;
        setCapturedPhoto(photoUri);
        
        const rawResult = await generateText({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are helping a visually impaired person understand what they're looking at. Describe this image in detail but concisely. Focus on:
1. Main subject or scene
2. People present (if any) - their apparent actions, positions
3. Text visible (read it out)
4. Important objects and their positions (left, right, center, near, far)
5. Colors and lighting
6. Any potential hazards or important information

Speak directly to the user in a friendly, helpful tone. Keep it under 150 words but be thorough.`,
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
        console.log('AI description:', result);
        setDescription(result || 'Unable to describe the scene. Please try again.');
        
        const speechRate = settings.voiceSpeed === 'slow' ? 0.7 : settings.voiceSpeed === 'fast' ? 1.3 : 1.0;
        setIsReading(true);
        Speech.speak(result, {
          rate: speechRate,
          onDone: () => setIsReading(false),
          onStopped: () => setIsReading(false),
          onError: () => setIsReading(false),
        });
      }
    } catch (error) {
      console.error('Error describing screen:', error);
      setDescription('Error analyzing the image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isCameraReady, isProcessing, settings.voiceSpeed]);

  const handleSaveToHistory = async () => {
    if (!description || saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(saveScaleAnim, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(saveScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    await addHistoryEntry({
      featureType: 'screen_reader',
      title: 'Scene Description',
      summary: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
    });
    setSaved(true);
    console.log('Screen reader result saved to history');
  };

  const handleReadAgain = () => {
    if (!description) return;
    
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isReading) {
      void Speech.stop();
      setIsReading(false);
    } else {
      const speechRate = settings.voiceSpeed === 'slow' ? 0.7 : settings.voiceSpeed === 'fast' ? 1.3 : 1.0;
      setIsReading(true);
      Speech.speak(description, {
        rate: speechRate,
        onDone: () => setIsReading(false),
        onStopped: () => setIsReading(false),
        onError: () => setIsReading(false),
      });
    }
  };

  const handleRetake = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Speech.stop();
    setIsReading(false);
    setDescription('');
    setCapturedPhoto(null);
    setSaved(false);
    setShowPhoto(true);
  };

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const stackScreenOptions = {
    title: 'Screen Reader',
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
            We need camera permission to see and describe your surroundings.
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

      {!description ? (
        <View style={styles.cameraContainer}>
          {capturedPhoto && isProcessing ? (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: capturedPhoto }}
                style={styles.photoPreview}
                resizeMode="cover"
              />

              <View style={styles.scanOverlay}>
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      backgroundColor: colors.primary,
                      opacity: scanGlowAnim,
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 400],
                        }),
                      }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.scanLineGlow,
                    {
                      backgroundColor: colors.primary,
                      opacity: scanGlowAnim.interpolate({
                        inputRange: [0.6, 1],
                        outputRange: [0.1, 0.25],
                      }),
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 400],
                        }),
                      }],
                    },
                  ]}
                />
              </View>

              <Animated.View style={[styles.cornerOverlay, { opacity: cornerAnim }]}>
                <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBR, { borderColor: colors.primary }]} />
              </Animated.View>

              <View style={[styles.processingBanner, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Eye size={22} color={colors.primary} strokeWidth={2} />
                </Animated.View>
                <Text style={[styles.processingBannerText, { fontSize: fontSizes.sm }]}>
                  Analyzing scene...
                </Text>
                <View style={styles.dotLoader}>
                  <Animated.View style={[styles.dot, { backgroundColor: colors.primary, opacity: scanGlowAnim }]} />
                  <Animated.View style={[styles.dot, { backgroundColor: colors.primary, opacity: scanGlowAnim.interpolate({ inputRange: [0.6, 1], outputRange: [1, 0.6] }) }]} />
                  <Animated.View style={[styles.dot, { backgroundColor: colors.primary, opacity: scanGlowAnim }]} />
                </View>
              </View>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                onCameraReady={() => {
                  console.log('Read Screen camera ready');
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

              <View style={[styles.hintOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <Eye size={28} color="#FFFFFF" strokeWidth={1.5} />
                <Text style={[styles.hintOverlayText, { fontSize: fontSizes.base }]}>
                  Point camera at anything and tap Describe
                </Text>
              </View>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.resultScroll}
        >
          {capturedPhoto && (
            <View style={[styles.photoSection, { backgroundColor: colors.surfaceSecondary }]}>
              <TouchableOpacity
                onPress={() => setShowPhoto(!showPhoto)}
                style={styles.photoToggle}
                activeOpacity={0.7}
              >
                <View style={styles.photoToggleLeft}>
                  <ImageIcon size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.photoToggleText, { color: colors.text, fontSize: fontSizes.sm }]}>
                    Captured Photo
                  </Text>
                </View>
                {showPhoto ? (
                  <ChevronUp size={18} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
              {showPhoto && (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: capturedPhoto }}
                    style={styles.capturedPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}

          {isReading && (
            <View style={[styles.audioIndicator, { backgroundColor: colors.primary }]}>
              <View style={styles.waveContainer}>
                <Animated.View style={[styles.audioWave, { transform: [{ scaleY: waveScale }], backgroundColor: '#FFFFFF' }]} />
                <Animated.View style={[styles.audioWave, styles.audioWaveTall, { transform: [{ scaleY: waveScale }], backgroundColor: '#FFFFFF' }]} />
                <Animated.View style={[styles.audioWave, { transform: [{ scaleY: waveScale }], backgroundColor: '#FFFFFF' }]} />
                <Animated.View style={[styles.audioWave, styles.audioWaveTall, { transform: [{ scaleY: waveScale }], backgroundColor: '#FFFFFF' }]} />
                <Animated.View style={[styles.audioWave, { transform: [{ scaleY: waveScale }], backgroundColor: '#FFFFFF' }]} />
              </View>
              <Text style={[styles.audioText, { fontSize: fontSizes.sm }]}>
                Reading aloud...
              </Text>
            </View>
          )}

          <View style={[styles.descriptionCard, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={styles.descriptionHeader}>
              <Eye size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.descriptionLabel, { color: colors.text, fontSize: fontSizes.sm }]}>
                Scene Description
              </Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.text, fontSize: fontSizes.base }]}>
              {description}
            </Text>
          </View>
        </ScrollView>
      )}

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {description ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleReadAgain}
              activeOpacity={0.7}
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: isReading ? colors.error : colors.surfaceSecondary,
                },
              ]}
              testID="read-again-button"
            >
              {isReading ? (
                <VolumeX size={22} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Volume2 size={22} color={colors.primary} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.iconActionLabel,
                  {
                    color: isReading ? '#FFFFFF' : colors.text,
                    fontSize: fontSizes.xs,
                  },
                ]}
                numberOfLines={1}
              >
                {isReading ? 'Stop' : 'Listen'}
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
              <TouchableOpacity
                onPress={handleSaveToHistory}
                activeOpacity={0.7}
                disabled={saved}
                style={[
                  styles.iconActionButton,
                  {
                    backgroundColor: saved ? colors.successLight : colors.surfaceSecondary,
                  },
                ]}
                testID="save-history-button"
              >
                {saved ? (
                  <Check size={22} color={colors.success} strokeWidth={2.5} />
                ) : (
                  <Bookmark size={22} color={colors.primary} strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.iconActionLabel,
                    {
                      color: saved ? colors.success : colors.text,
                      fontSize: fontSizes.xs,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {saved ? 'Saved!' : 'Save'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              onPress={handleRetake}
              activeOpacity={0.7}
              style={[styles.retakeButton, { backgroundColor: colors.primary }]}
              testID="retake-button"
            >
              <RotateCcw size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={[styles.retakeLabel, { fontSize: fontSizes.sm }]}>
                Describe Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.captureRow}>
            <Text style={[styles.hint, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
              {isProcessing ? 'Analyzing scene...' : 'Hold steady for best results'}
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <AccessibleButton
                title={isProcessing ? 'Analyzing...' : 'Describe Scene'}
                onPress={captureAndDescribe}
                variant="primary"
                size="large"
                disabled={!isCameraReady || isProcessing}
                style={styles.describeButton}
                testID="describe-button"
              />
            </Animated.View>
          </View>
        )}
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
    top: 16,
    right: 16,
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

  hintOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  hintOverlayText: {
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  photoPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  photoPreview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanLine: {
    width: '100%',
    height: 3,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  scanLineGlow: {
    width: '100%',
    height: 40,
    marginTop: -20,
  },
  cornerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerTL: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 32,
    height: 32,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 32,
    height: 32,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 32,
    height: 32,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderRadius: 4,
  },
  processingBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  processingBannerText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  dotLoader: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  resultScroll: {
    flex: 1,
  },
  resultScrollContent: {
    padding: 20,
    gap: 12,
  },
  photoSection: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  photoToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoToggleText: {
    fontWeight: '600' as const,
  },
  photoContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  capturedPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  audioWave: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  audioWaveTall: {
    height: 22,
  },
  audioText: {
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  descriptionCard: {
    padding: 18,
    borderRadius: 16,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  descriptionLabel: {
    fontWeight: '600' as const,
    flex: 1,
  },
  descriptionText: {
    lineHeight: 24,
  },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionButton: {
    width: 68,
    height: 68,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconActionLabel: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  retakeButton: {
    flex: 1,
    height: 56,
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
  retakeLabel: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  captureRow: {
    alignItems: 'center',
    gap: 14,
  },
  hint: {
    textAlign: 'center' as const,
  },
  describeButton: {
    width: 200,
  },
});

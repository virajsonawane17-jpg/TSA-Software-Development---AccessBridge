import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useScannedText } from '@/contexts/ScannedTextContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Camera, Focus, RefreshCw, ScanLine } from 'lucide-react-native';
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

export default function ScanTextScreen() {
  const router = useRouter();
  const { colors, fontSizes } = useAccessibility();
  const { setScannedText, setCapturedPhotoUri, setIsScanning } = useScannedText();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isProcessing, pulseAnim]);

  React.useEffect(() => {
    if (capturedPhoto && isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [capturedPhoto, isProcessing, scanLineAnim]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isProcessing) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsProcessing(true);
      setIsScanning(true);
      console.log('Taking picture for OCR...');

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (photo?.base64) {
        console.log('Photo captured, processing with AI OCR...');
        const photoUri = photo.uri || `data:image/jpeg;base64,${photo.base64}`;
        setCapturedPhoto(photoUri);
        setCapturedPhotoUri(photoUri);
        
        const rawResult = await generateText({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract and return ALL text visible in this image. Return only the extracted text, nothing else. If no text is found, say "No text detected in the image."',
                },
                {
                  type: 'image',
                  image: `data:image/jpeg;base64,${photo.base64}`,
                },
              ],
            },
          ],
        });

        const extractedText = (typeof rawResult === 'string' && rawResult.trim()) ? rawResult : '';
        console.log('OCR result:', extractedText);
        setScannedText(extractedText || 'No text detected in the image.');
        router.push('/text-result');
      }
    } catch (error) {
      console.error('Error during OCR:', error);
      setScannedText('Error scanning text. Please try again.');
      router.push('/text-result');
    } finally {
      setIsProcessing(false);
      setIsScanning(false);
      setCapturedPhoto(null);
    }
  }, [isCameraReady, isProcessing, router, setScannedText, setCapturedPhotoUri, setIsScanning]);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const stackScreenOptions = {
    title: 'Document Reader',
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
            We need camera permission to scan and read text for you.
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
        {capturedPhoto ? (
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
                    transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 300],
                      }),
                    }],
                  },
                ]}
              />
            </View>
            <View style={[styles.processingBanner, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <ScanLine size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.processingBannerText, { fontSize: fontSizes.sm }]}>
                Extracting text from image...
              </Text>
            </View>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              onCameraReady={() => {
                console.log('Camera ready');
                setIsCameraReady(true);
              }}
            />

            <View style={[styles.instructionBanner, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <Focus size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.instructionText, { color: colors.text, fontSize: fontSizes.sm }]}>
                Point your camera at text
              </Text>
            </View>

            <View style={styles.cornerOverlay}>
              <View style={[styles.cornerTL, { borderColor: '#FFFFFF' }]} />
              <View style={[styles.cornerTR, { borderColor: '#FFFFFF' }]} />
              <View style={[styles.cornerBL, { borderColor: '#FFFFFF' }]} />
              <View style={[styles.cornerBR, { borderColor: '#FFFFFF' }]} />
            </View>

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
          </>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
          {isProcessing ? 'Reading text from image...' : 'Hold steady for best results'}
        </Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <AccessibleButton
            title={isProcessing ? 'Scanning...' : 'Scan Text'}
            onPress={handleCapture}
            variant="primary"
            size="large"
            disabled={!isCameraReady || isProcessing}
            testID="scan-button"
            style={styles.scanButton}
          />
        </Animated.View>
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
    opacity: 0.8,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
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
  instructionBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  instructionText: {
    fontWeight: '500' as const,
  },
  cornerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 80,
    left: 30,
    width: 36,
    height: 36,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 80,
    right: 30,
    width: 36,
    height: 36,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 80,
    left: 30,
    width: 36,
    height: 36,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 80,
    right: 30,
    width: 36,
    height: 36,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderRadius: 4,
  },
  flipButtonContainer: {
    position: 'absolute',
    top: 70,
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
  controls: {
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  hint: {
    textAlign: 'center' as const,
  },
  scanButton: {
    width: 200,
  },
});

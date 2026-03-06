import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Camera, RefreshCw } from 'lucide-react-native';

interface CameraViewProps {
  onCapture?: (base64: string) => void;
  showCaptureButton?: boolean;
  captureButtonLabel?: string;
  isProcessing?: boolean;
  children?: React.ReactNode;
}

export function CameraViewComponent({
  onCapture,
  showCaptureButton = true,
  captureButtonLabel = 'Capture',
  isProcessing = false,
  children,
}: CameraViewProps) {
  const { colors, fontSizes } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<ExpoCameraView>(null);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isProcessing) return;

    try {
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (photo?.base64 && onCapture) {
        console.log('Picture captured, base64 length:', photo.base64.length);
        onCapture(photo.base64);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }, [isCameraReady, isProcessing, onCapture]);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
          Loading camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { backgroundColor: colors.surface }]}>
        <Camera size={64} color={colors.textSecondary} strokeWidth={1.5} />
        <Text style={[styles.permissionTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
          Camera Access Needed
        </Text>
        <Text style={[styles.permissionText, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
          We need camera permission to scan text and detect objects for you.
        </Text>
        <AccessibleButton
          title="Grant Camera Access"
          onPress={requestPermission}
          variant="secondary"
          size="large"
          testID="grant-camera-permission"
        />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.primaryLight }]}>
        <ExpoCameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />
        {children}
        {showCaptureButton && (
          <View style={styles.webControls}>
            <AccessibleButton
              title={isProcessing ? 'Processing...' : captureButtonLabel}
              onPress={handleCapture}
              variant="secondary"
              size="large"
              disabled={!isCameraReady || isProcessing}
              testID="capture-button"
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryLight }]}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => {
          console.log('Camera is ready');
          setIsCameraReady(true);
        }}
      />
      {children}
      <View style={styles.flipButtonContainer}>
        <AccessibleButton
          title=""
          onPress={toggleFacing}
          variant="outline"
          style={styles.flipButton}
          testID="flip-camera-button"
        >
          <RefreshCw size={24} color={colors.text} strokeWidth={2} />
        </AccessibleButton>
      </View>
      {showCaptureButton && (
        <View style={styles.captureContainer}>
          <AccessibleButton
            title={isProcessing ? 'Processing...' : captureButtonLabel}
            onPress={handleCapture}
            variant="secondary"
            size="large"
            disabled={!isCameraReady || isProcessing}
            testID="capture-button"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginTop: 16,
  },
  permissionText: {
    textAlign: 'center' as const,
    lineHeight: 26,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center' as const,
  },
  flipButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  webControls: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
});

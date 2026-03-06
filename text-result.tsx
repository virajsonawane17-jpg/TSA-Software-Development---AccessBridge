import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useScannedText } from '@/contexts/ScannedTextContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { FileText, Type, Volume2, VolumeX, RotateCcw, Bookmark, Check, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useHistory } from '@/contexts/HistoryContext';

export default function TextResultScreen() {
  const router = useRouter();
  const { colors, fontSizes, settings } = useAccessibility();
  const { scannedText, capturedPhotoUri, clearScannedText } = useScannedText();
  const [isReading, setIsReading] = useState(false);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1);
  const [saved, setSaved] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);
  const { addHistoryEntry } = useHistory();
  
  const waveAnim = useRef(new Animated.Value(0)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;

  const displayText = scannedText || 'No text was scanned. Please go back and try again.';

  const formatText = (text: string): string[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines;
  };

  const formattedLines = formatText(displayText);
  const wordCount = displayText.split(/\s+/).filter(Boolean).length;
  const lineCount = formattedLines.length;

  useEffect(() => {
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

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const handleReadAloud = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isReading) {
      await Speech.stop();
      setIsReading(false);
    } else {
      setIsReading(true);
      
      const speechRate = settings.voiceSpeed === 'slow' ? 0.7 : settings.voiceSpeed === 'fast' ? 1.3 : 1.0;
      
      Speech.speak(displayText, {
        rate: speechRate,
        onDone: () => setIsReading(false),
        onStopped: () => setIsReading(false),
        onError: () => setIsReading(false),
      });
    }
  };

  const handleIncreaseSize = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTextSizeMultiplier((prev) => Math.min(prev + 0.25, 2));
  };

  const handleDecreaseSize = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTextSizeMultiplier((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleSaveToHistory = async () => {
    if (!scannedText || saved) return;
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
      featureType: 'document_reader',
      title: `Scanned Document — ${wordCount} words`,
      summary: displayText.substring(0, 200) + (displayText.length > 200 ? '...' : ''),
    });
    setSaved(true);
    console.log('Text result saved to history');
  };

  const handleRescan = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Speech.stop();
    clearScannedText();
    router.back();
  };

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Scanned Text',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '600' as const },
          headerShadowVisible: false,
        }}
      />

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!scannedText ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.background }]}>
              <FileText size={48} color={colors.textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
              No Text Found
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
              No text was detected. Try scanning again with better lighting.
            </Text>
          </View>
        ) : (
          <>
            {capturedPhotoUri ? (
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
                      source={{ uri: capturedPhotoUri }}
                      style={styles.capturedPhoto}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            ) : null}

            <View style={[styles.statsBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.xl }]}>
                  {wordCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  words
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.xl }]}>
                  {lineCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  lines
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.xl }]}>
                  {displayText.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  chars
                </Text>
              </View>
            </View>

            <View style={[styles.textSizeControls, { backgroundColor: colors.surfaceSecondary }]}>
              <Type size={18} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.textSizeLabel, { color: colors.text, fontSize: fontSizes.sm }]}>
                Text Size
              </Text>
              <View style={styles.sizeButtons}>
                <AccessibleButton
                  title="A-"
                  onPress={handleDecreaseSize}
                  variant="outline"
                  style={styles.sizeButton}
                  disabled={textSizeMultiplier <= 0.75}
                  testID="decrease-size-button"
                />
                <Text style={[styles.sizeValue, { color: colors.text, fontSize: fontSizes.sm }]}>
                  {Math.round(textSizeMultiplier * 100)}%
                </Text>
                <AccessibleButton
                  title="A+"
                  onPress={handleIncreaseSize}
                  variant="outline"
                  style={styles.sizeButton}
                  disabled={textSizeMultiplier >= 2}
                  testID="increase-size-button"
                />
              </View>
            </View>

            <View style={[styles.textCard, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={styles.textHeader}>
                <FileText size={18} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.textHeaderLabel, { color: colors.text, fontSize: fontSizes.sm }]}>
                  Extracted Text
                </Text>
              </View>
              
              <View style={styles.textContent}>
                {formattedLines.map((line, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.textLine,
                      {
                        color: colors.text,
                        fontSize: fontSizes.lg * textSizeMultiplier,
                        lineHeight: fontSizes.lg * textSizeMultiplier * 1.7,
                        marginBottom: fontSizes.lg * textSizeMultiplier * 0.5,
                      },
                    ]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleReadAloud}
            activeOpacity={0.7}
            style={[
              styles.iconActionButton,
              {
                backgroundColor: isReading ? colors.error : colors.surfaceSecondary,
              },
            ]}
            testID="read-aloud-button"
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

          {scannedText ? (
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
          ) : null}

          <TouchableOpacity
            onPress={handleRescan}
            activeOpacity={0.7}
            style={[styles.rescanButton, { backgroundColor: colors.primary }]}
            testID="rescan-button"
          >
            <RotateCcw size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={[styles.rescanLabel, { fontSize: fontSizes.sm }]}>
              Scan Again
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
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  emptyState: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 14,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  emptyDescription: {
    textAlign: 'center' as const,
    lineHeight: 24,
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
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 14,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700' as const,
  },
  statLabel: {
    fontWeight: '400' as const,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  textSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  textSizeLabel: {
    fontWeight: '500' as const,
    flex: 1,
  },
  sizeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
  },
  sizeValue: {
    fontWeight: '600' as const,
    minWidth: 44,
    textAlign: 'center' as const,
  },
  textCard: {
    padding: 18,
    borderRadius: 16,
  },
  textHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  textHeaderLabel: {
    fontWeight: '600' as const,
  },
  textContent: {
    gap: 0,
  },
  textLine: {
    fontWeight: '400' as const,
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
  rescanButton: {
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
  rescanLabel: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
});

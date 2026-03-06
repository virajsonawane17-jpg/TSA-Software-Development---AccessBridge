import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Camera, Mic, Bot, CircleStop, RefreshCw, Volume2, Bookmark, Check, Loader } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useHistory } from '@/contexts/HistoryContext';
import { Audio } from 'expo-av';
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

const SPEECH_API = 'https://api.openai.com/v1/audio/transcriptions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIGuiderScreen() {
  const { colors, fontSizes, settings } = useAccessibility();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [saved, setSaved] = useState(false);
  const { addHistoryEntry } = useHistory();
  const recording = useRef<Audio.Recording | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const camera = useRef<CameraView>(null);
  const startTime = useRef<number>(Date.now());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollView = useRef<ScrollView>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.3)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const createWaveAnim = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ])
        );
      createWaveAnim(wave1, 0).start();
      createWaveAnim(wave2, 150).start();
      createWaveAnim(wave3, 300).start();
    } else {
      pulseAnim.setValue(1);
      wave1.setValue(0.3);
      wave2.setValue(0.3);
      wave3.setValue(0.3);
    }
  }, [isRecording, pulseAnim, wave1, wave2, wave3]);

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isProcessing, spinAnim]);

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollView.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const takePicture = useCallback(async () => {
    if (!camera.current || !isCameraReady) return null;
    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      if (photo?.base64) {
        return photo.base64;
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
    return null;
  }, [isCameraReady]);

  const speakResponse = useCallback((text: string) => {
    void Speech.stop();
    setIsSpeaking(true);
    const speechRate = settings.voiceSpeed === 'slow' ? 0.8 : settings.voiceSpeed === 'fast' ? 1.2 : 1.0;
    Speech.speak(text, {
      rate: speechRate,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [settings.voiceSpeed]);

  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      role,
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const startRecordingNative = async () => {
    try {
      console.log('Requesting audio permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Audio permission denied');
        addMessage('assistant', 'Microphone permission is required. Please enable it in your device settings.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting native recording...');
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      recording.current = recording;
      setIsRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('Native recording started');
    } catch (error) {
      console.error('Failed to start native recording:', error);
      addMessage('assistant', 'Could not start recording. Please check microphone permissions.');
    }
  };

  const startRecordingWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      mediaRecorder.current = mediaRecorder;
      setIsRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('Web recording started');
    } catch (error) {
      console.error('Failed to start web recording:', error);
      addMessage('assistant', 'Could not access microphone. Please allow microphone access in your browser.');
    }
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      await startRecordingWeb();
    } else {
      await startRecordingNative();
    }
  };

  const stopRecordingNative = async () => {
    if (!recording.current) return;
    try {
      setIsRecording(false);
      setIsProcessing(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recording.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.current.getURI();
      console.log('Recording URI:', uri);

      const imageBase64 = await takePicture();

      if (uri) {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        const formData = new FormData();
        const audioFile = {
          uri,
          name: 'recording.' + fileType,
          type: 'audio/' + fileType,
        } as unknown as Blob;
        formData.append('audio', audioFile);

        void transcribeAndProcess(formData, imageBase64);
      } else {
        setIsProcessing(false);
      }

      recording.current = null;
    } catch (error) {
      console.error('Failed to stop native recording:', error);
      setIsProcessing(false);
    }
  };

  const stopRecordingWeb = async () => {
    if (!mediaRecorder.current) return;
    try {
      setIsRecording(false);
      setIsProcessing(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await new Promise<void>((resolve) => {
        if (mediaRecorder.current) {
          mediaRecorder.current.onstop = () => resolve();
          mediaRecorder.current.stop();
        } else {
          resolve();
        }
      });

      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
      }

      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      console.log('Web audio blob size:', audioBlob.size);

      const imageBase64 = await takePicture();

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      void transcribeAndProcess(formData, imageBase64);

      mediaRecorder.current = null;
      audioChunks.current = [];
    } catch (error) {
      console.error('Failed to stop web recording:', error);
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    if (Platform.OS === 'web') {
      await stopRecordingWeb();
    } else {
      await stopRecordingNative();
    }
  };

  const transcribeAndProcess = async (formData: FormData, imageBase64: string | null) => {
    try {
      const response = await fetch(SPEECH_API, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription failed:', response.status, errorText);
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      console.log('Transcription result:', data);

      if (data.text && data.text.trim()) {
        addMessage('user', data.text.trim());
        await getAIResponse(data.text.trim(), imageBase64);
      } else {
        addMessage('assistant', "I couldn't hear anything. Please try speaking again, a bit louder or closer to the microphone.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      addMessage('assistant', 'Sorry, I had trouble understanding the audio. Please try again.');
      setIsProcessing(false);
    }
  };

  const getAIResponse = async (userText: string, imageBase64: string | null) => {
    try {
      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

      let aiResponse: string;

      if (imageBase64) {
        const result = await generateText({
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are a helpful AI assistant for a visually impaired person. They are looking through a camera and asking you questions. Be concise, friendly, and helpful. Keep responses under 100 words. Respond naturally as in a conversation.

User's question: ${userText}

Analyze the image and respond to help them understand their surroundings or answer their question.`,
                },
                {
                  type: 'image',
                  image: `data:image/jpeg;base64,${imageBase64}`,
                },
              ],
            },
          ],
        });
        aiResponse = (typeof result === 'string' && result.trim()) ? result : '';
      } else {
        const result = await generateText({
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: `You are a helpful AI assistant for a visually impaired person. Be concise, friendly, and helpful. Keep responses under 100 words. Respond naturally as in a conversation.

User's question: ${userText}`,
            },
          ],
        });
        aiResponse = (typeof result === 'string' && result.trim()) ? result : '';
      }

      if (!aiResponse) {
        throw new Error('Empty response from AI');
      }

      console.log('AI response:', aiResponse);
      addMessage('assistant', aiResponse);
      speakResponse(aiResponse);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMsg = 'Sorry, I had trouble processing that. Please try again.';
      addMessage('assistant', errorMsg);
      speakResponse(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPress = () => {
    if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  };

  const toggleCamera = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const stopSpeaking = () => {
    void Speech.stop();
    setIsSpeaking(false);
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const stackScreenOptions = {
    title: 'AI Guide',
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
            We need camera permission for the AI to see and guide you.
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
          ref={camera}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => {
            console.log('AI Guider camera ready');
            setIsCameraReady(true);
          }}
        />

        <View style={styles.flipButtonContainer}>
          <TouchableOpacity
            onPress={toggleCamera}
            style={styles.flipButton}
            accessibilityLabel="Flip camera"
          >
            <RefreshCw size={20} color="#1A1A2E" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {isRecording && (
          <View style={styles.recordingOverlay}>
            <View style={[styles.recordingBadge, { backgroundColor: 'rgba(220, 38, 38, 0.9)' }]}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { fontSize: fontSizes.xs }]}>
                {formatTime(recordingTime)}
              </Text>
            </View>
            <View style={styles.waveformContainer}>
              {[wave1, wave2, wave3, wave2, wave1].map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      transform: [{ scaleY: anim }],
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={[styles.chatSection, { backgroundColor: colors.surfaceSecondary }]}>
        <ScrollView
          ref={scrollView}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !isProcessing ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.background }]}>
                <Bot size={32} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                Your AI Assistant
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                Tap the mic and ask me anything
              </Text>
              <View style={styles.suggestionsRow}>
                {['What do you see?', 'Is it safe to cross?', 'Read this for me'].map((suggestion) => (
                  <View
                    key={suggestion}
                    style={[styles.suggestionChip, { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                      {suggestion}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow,
                  ]}
                >
                  {msg.role === 'assistant' && (
                    <View style={[styles.avatarDot, { backgroundColor: colors.primary }]}>
                      <Bot size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      msg.role === 'user'
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.assistantBubble, { backgroundColor: colors.background }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: msg.role === 'user' ? '#FFFFFF' : colors.text,
                          fontSize: fontSizes.sm,
                        },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {isProcessing && (
                <View style={[styles.messageRow, styles.assistantMessageRow]}>
                  <View style={[styles.avatarDot, { backgroundColor: colors.primary }]}>
                    <Bot size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.background }]}>
                    <View style={styles.typingRow}>
                      <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                        <Loader size={14} color={colors.primary} strokeWidth={2} />
                      </Animated.View>
                      <Text style={[styles.thinkingText, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                        Thinking...
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {isSpeaking && (
          <TouchableOpacity
            onPress={stopSpeaking}
            style={[styles.speakingBar, { backgroundColor: colors.primary }]}
          >
            <Volume2 size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={[styles.speakingText, { fontSize: fontSizes.xs }]}>Speaking... Tap to stop</Text>
          </TouchableOpacity>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.controls, { backgroundColor: colors.background }]}>
        <View style={styles.controlsRow}>
          {messages.length > 0 && (
            <TouchableOpacity
              onPress={async () => {
                if (saved) return;
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const duration = Math.round((Date.now() - startTime.current) / 1000);
                const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                void addHistoryEntry({
                  featureType: 'ai_guide',
                  title: `AI Conversation — ${messages.length} messages`,
                  summary: lastAssistant?.text || messages[messages.length - 1]?.text || 'AI guide session',
                  durationSeconds: duration,
                }).then(() => setSaved(true));
              }}
              disabled={saved}
              activeOpacity={0.7}
              style={[
                styles.sideButton,
                { backgroundColor: saved ? colors.successLight : colors.surfaceSecondary },
              ]}
              testID="save-history-button"
            >
              {saved ? (
                <Check size={18} color={colors.success} strokeWidth={2} />
              ) : (
                <Bookmark size={18} color={colors.text} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}

          <View style={styles.recordButtonWrap}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handleRecordPress}
                disabled={isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                style={[
                  styles.recordButton,
                  {
                    backgroundColor: isRecording ? '#DC2626' : colors.primary,
                    opacity: isProcessing ? 0.5 : 1,
                  },
                ]}
              >
                {isRecording ? (
                  <CircleStop size={30} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Mic size={30} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.recordLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
              {isRecording ? 'Tap to stop' : isProcessing ? 'Processing...' : 'Tap to speak'}
            </Text>
          </View>

          {messages.length > 0 && (
            <View style={styles.sideButtonPlaceholder} />
          )}
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
  cameraContainer: {
    height: '32%',
    position: 'relative',
    margin: 12,
    marginBottom: 0,
    borderRadius: 20,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  chatSection: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    textAlign: 'center' as const,
    opacity: 0.7,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  suggestionText: {
    fontWeight: '500' as const,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  assistantMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    lineHeight: 21,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontStyle: 'italic',
  },
  speakingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  speakingText: {
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  controls: {
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  recordButtonWrap: {
    alignItems: 'center',
    gap: 6,
  },
  recordButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  recordLabel: {
    fontWeight: '500' as const,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
  },
  sideButtonPlaceholder: {
    width: 44,
    height: 44,
  },
});

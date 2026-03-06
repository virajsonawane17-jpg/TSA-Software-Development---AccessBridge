import { useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Colors, FontSizes, ThemeColors, FontSizeScale } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export type FontSizeLevel = 'normal' | 'large' | 'extraLarge';
export type ContrastMode = 'standard' | 'highContrast';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';

interface Settings {
  hasLowVision: boolean;
  prefersAudioAssistance: boolean;
  fontSizeLevel: FontSizeLevel;
  contrastMode: ContrastMode;
  voiceSpeed: VoiceSpeed;
  language: string;
  hasCompletedSetup: boolean;
}

const defaults: Settings = {
  hasLowVision: false,
  prefersAudioAssistance: false,
  fontSizeLevel: 'normal',
  contrastMode: 'standard',
  voiceSpeed: 'normal',
  language: 'English',
  hasCompletedSetup: false,
};

const STORAGE_KEY = 'accessibility_settings';

async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export const [AccessibilityProvider, useAccessibility] = createContextHook(() => {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      const userId = await getUserId();

      if (userId) {
        const { data, error } = await supabase
          .from('accessibility_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data && !error) {
          const loaded: Settings = {
            hasLowVision: data.has_low_vision ?? false,
            prefersAudioAssistance: data.prefers_audio_assistance ?? false,
            fontSizeLevel: data.font_size_level ?? 'normal',
            contrastMode: data.contrast_mode ?? 'standard',
            voiceSpeed: data.voice_speed ?? 'normal',
            language: data.language ?? 'English',
            hasCompletedSetup: data.has_completed_setup ?? false,
          };
          setSettings(loaded);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          console.log('Accessibility settings loaded from Supabase');
          setIsLoading(false);
          return;
        }
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
        console.log('Accessibility settings loaded from local');
      }
    } catch (error) {
      console.log('Error loading accessibility settings:', error);
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (e) {
        console.log('Error loading from local fallback:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sync = useCallback(async (newSettings: Settings) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('accessibility_settings')
        .upsert({
          user_id: userId,
          has_low_vision: newSettings.hasLowVision,
          prefers_audio_assistance: newSettings.prefersAudioAssistance,
          font_size_level: newSettings.fontSizeLevel,
          contrast_mode: newSettings.contrastMode,
          voice_speed: newSettings.voiceSpeed,
          language: newSettings.language,
          has_completed_setup: newSettings.hasCompletedSetup,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.log('Error syncing accessibility settings to Supabase:', error.message);
      } else {
        console.log('Accessibility settings synced to Supabase');
      }
    } catch (error) {
      console.log('Error syncing accessibility settings:', error);
    }
  }, []);

  const save = useCallback(async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      void sync(newSettings);
    } catch (error) {
      console.log('Error saving accessibility settings:', error);
    }
  }, [sync]);

  const update = useCallback(<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    void save(newSettings);
  }, [settings, save]);

  const complete = useCallback(() => {
    update('hasCompletedSetup', true);
  }, [update]);

  const colors: ThemeColors = useMemo(() => {
    return settings.contrastMode === 'highContrast' ? Colors.highContrast : Colors.light;
  }, [settings.contrastMode]);

  const fontSizes: FontSizeScale = useMemo(() => {
    return FontSizes[settings.fontSizeLevel];
  }, [settings.fontSizeLevel]);

  return useMemo(() => ({
    settings,
    isLoading,
    colors,
    fontSizes,
    update,
    complete,
    save,
  }), [settings, isLoading, colors, fontSizes, update, complete, save]);
});

export function useThemeColors() {
  const { colors } = useAccessibility();
  return colors;
}

export function useFontSizes() {
  const { fontSizes } = useAccessibility();
  return fontSizes;
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

export type FeatureType =
  | 'document_reader'
  | 'screen_reader'
  | 'object_detection'
  | 'mobility_assistant'
  | 'ai_guide';

export interface HistoryEntry {
  id: string;
  featureType: FeatureType;
  title: string;
  summary: string;
  imageUri?: string;
  timestamp: number;
  durationSeconds?: number;
}

export interface UsageStats {
  totalSessions: number;
  featureUsage: Record<FeatureType, number>;
  dailyUsage: Record<string, number>;
  weeklyStreak: number;
  lastUsedDate: string;
  totalDurationSeconds: number;
  averageSessionDuration: number;
  mostUsedFeature: FeatureType | null;
  documentsScanned: number;
  objectsDetected: number;
  aiConversations: number;
  navigationSessions: number;
  screenDescriptions: number;
}

const HISTORY_KEY = 'app_history';
const STATS_KEY = 'app_usage_stats';

const defaultStats: UsageStats = {
  totalSessions: 0,
  featureUsage: {
    document_reader: 0,
    screen_reader: 0,
    object_detection: 0,
    mobility_assistant: 0,
    ai_guide: 0,
  },
  dailyUsage: {},
  weeklyStreak: 0,
  lastUsedDate: '',
  totalDurationSeconds: 0,
  averageSessionDuration: 0,
  mostUsedFeature: null,
  documentsScanned: 0,
  objectsDetected: 0,
  aiConversations: 0,
  navigationSessions: 0,
  screenDescriptions: 0,
};

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateStreak(dailyUsage: Record<string, number>): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dailyUsage[key] && dailyUsage[key] > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function findMostUsed(featureUsage: Record<FeatureType, number>): FeatureType | null {
  let max = 0;
  let best: FeatureType | null = null;
  for (const [key, val] of Object.entries(featureUsage)) {
    if (val > max) {
      max = val;
      best = key as FeatureType;
    }
  }
  return best;
}

async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export const [HistoryProvider, useHistory] = createContextHook(() => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<UsageStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = await getUserId();

      if (userId) {
        await loadFromSupabase(userId);
      } else {
        await loadFromLocal();
      }
    } catch (error) {
      console.log('Error loading history/stats:', error);
      await loadFromLocal();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromSupabase = async (userId: string) => {
    try {
      const [historyResult, statsResult] = await Promise.all([
        supabase
          .from('history_entries')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false }),
        supabase
          .from('usage_stats')
          .select('*')
          .eq('user_id', userId)
          .single(),
      ]);

      if (historyResult.data && historyResult.data.length > 0) {
        const entries: HistoryEntry[] = historyResult.data.map((row: Record<string, unknown>) => ({
          id: row.entry_id as string,
          featureType: row.feature_type as FeatureType,
          title: row.title as string,
          summary: row.summary as string,
          imageUri: (row.image_uri as string) || undefined,
          timestamp: row.timestamp as number,
          durationSeconds: (row.duration_seconds as number) || undefined,
        }));
        setHistory(entries);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
        console.log('History loaded from Supabase:', entries.length, 'entries');
      } else {
        await loadHistoryFromLocal();
      }

      if (statsResult.data && !statsResult.error) {
        const row = statsResult.data as Record<string, unknown>;
        const loadedStats: UsageStats = {
          totalSessions: (row.total_sessions as number) || 0,
          featureUsage: (row.feature_usage as Record<FeatureType, number>) || defaultStats.featureUsage,
          dailyUsage: (row.daily_usage as Record<string, number>) || {},
          weeklyStreak: (row.weekly_streak as number) || 0,
          lastUsedDate: (row.last_used_date as string) || '',
          totalDurationSeconds: (row.total_duration_seconds as number) || 0,
          averageSessionDuration: (row.average_session_duration as number) || 0,
          mostUsedFeature: (row.most_used_feature as FeatureType) || null,
          documentsScanned: (row.documents_scanned as number) || 0,
          objectsDetected: (row.objects_detected as number) || 0,
          aiConversations: (row.ai_conversations as number) || 0,
          navigationSessions: (row.navigation_sessions as number) || 0,
          screenDescriptions: (row.screen_descriptions as number) || 0,
        };
        setStats(loadedStats);
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(loadedStats));
        console.log('Stats loaded from Supabase');
      } else {
        await loadStatsFromLocal();
      }
    } catch (error) {
      console.log('Error loading from Supabase:', error);
      await loadFromLocal();
    }
  };

  const loadFromLocal = async () => {
    await Promise.all([loadHistoryFromLocal(), loadStatsFromLocal()]);
  };

  const loadHistoryFromLocal = async () => {
    try {
      const historyData = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyData) {
        setHistory(JSON.parse(historyData));
        console.log('History loaded from local:', JSON.parse(historyData).length);
      }
    } catch (error) {
      console.log('Error loading history from local:', error);
    }
  };

  const loadStatsFromLocal = async () => {
    try {
      const statsData = await AsyncStorage.getItem(STATS_KEY);
      if (statsData) {
        const parsed = JSON.parse(statsData);
        setStats({ ...defaultStats, ...parsed });
        console.log('Stats loaded from local');
      }
    } catch (error) {
      console.log('Error loading stats from local:', error);
    }
  };

  const syncHistoryEntryToSupabase = async (entry: HistoryEntry) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('history_entries')
        .insert({
          user_id: userId,
          entry_id: entry.id,
          feature_type: entry.featureType,
          title: entry.title,
          summary: entry.summary,
          image_uri: entry.imageUri || null,
          timestamp: entry.timestamp,
          duration_seconds: entry.durationSeconds || null,
        });

      if (error) {
        console.log('Error syncing history entry to Supabase:', error.message);
      } else {
        console.log('History entry synced to Supabase');
      }
    } catch (error) {
      console.log('Error syncing history entry:', error);
    }
  };

  const syncStatsToSupabase = async (newStats: UsageStats) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('usage_stats')
        .upsert({
          user_id: userId,
          total_sessions: newStats.totalSessions,
          feature_usage: newStats.featureUsage,
          daily_usage: newStats.dailyUsage,
          weekly_streak: newStats.weeklyStreak,
          last_used_date: newStats.lastUsedDate,
          total_duration_seconds: newStats.totalDurationSeconds,
          average_session_duration: newStats.averageSessionDuration,
          most_used_feature: newStats.mostUsedFeature,
          documents_scanned: newStats.documentsScanned,
          objects_detected: newStats.objectsDetected,
          ai_conversations: newStats.aiConversations,
          navigation_sessions: newStats.navigationSessions,
          screen_descriptions: newStats.screenDescriptions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.log('Error syncing stats to Supabase:', error.message);
      } else {
        console.log('Stats synced to Supabase');
      }
    } catch (error) {
      console.log('Error syncing stats:', error);
    }
  };

  const saveHistory = useCallback(async (entries: HistoryEntry[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch (error) {
      console.log('Error saving history:', error);
    }
  }, []);

  const saveStats = useCallback(async (newStats: UsageStats) => {
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    } catch (error) {
      console.log('Error saving stats:', error);
    }
  }, []);

  const addHistoryEntry = useCallback(async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...history];
    setHistory(updated);
    await saveHistory(updated);

    const todayKey = getTodayKey();
    const newStats = { ...stats };
    newStats.totalSessions += 1;
    newStats.featureUsage[entry.featureType] = (newStats.featureUsage[entry.featureType] || 0) + 1;
    newStats.dailyUsage[todayKey] = (newStats.dailyUsage[todayKey] || 0) + 1;
    newStats.lastUsedDate = todayKey;
    if (entry.durationSeconds) {
      newStats.totalDurationSeconds += entry.durationSeconds;
    }
    newStats.averageSessionDuration = newStats.totalSessions > 0
      ? Math.round(newStats.totalDurationSeconds / newStats.totalSessions)
      : 0;
    newStats.weeklyStreak = calculateStreak(newStats.dailyUsage);
    newStats.mostUsedFeature = findMostUsed(newStats.featureUsage);

    switch (entry.featureType) {
      case 'document_reader':
        newStats.documentsScanned += 1;
        break;
      case 'screen_reader':
        newStats.screenDescriptions += 1;
        break;
      case 'object_detection':
        newStats.objectsDetected += 1;
        break;
      case 'mobility_assistant':
        newStats.navigationSessions += 1;
        break;
      case 'ai_guide':
        newStats.aiConversations += 1;
        break;
    }

    setStats(newStats);
    await saveStats(newStats);

    void syncHistoryEntryToSupabase(newEntry);
    void syncStatsToSupabase(newStats);

    console.log('History entry added:', entry.title);
    return newEntry;
  }, [history, stats, saveHistory, saveStats]);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    const updated = history.filter((e) => e.id !== id);
    setHistory(updated);
    await saveHistory(updated);

    const userId = await getUserId();
    if (userId) {
      void supabase
        .from('history_entries')
        .delete()
        .eq('user_id', userId)
        .eq('entry_id', id)
        .then(({ error }) => {
          if (error) console.log('Error deleting history from Supabase:', error.message);
          else console.log('History entry deleted from Supabase');
        });
    }

    console.log('History entry deleted:', id);
  }, [history, saveHistory]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);

    const userId = await getUserId();
    if (userId) {
      void supabase
        .from('history_entries')
        .delete()
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.log('Error clearing history from Supabase:', error.message);
          else console.log('History cleared from Supabase');
        });
    }

    console.log('History cleared');
  }, []);

  const clearStats = useCallback(async () => {
    setStats(defaultStats);
    await AsyncStorage.removeItem(STATS_KEY);

    const userId = await getUserId();
    if (userId) {
      void supabase
        .from('usage_stats')
        .delete()
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.log('Error clearing stats from Supabase:', error.message);
          else console.log('Stats cleared from Supabase');
        });
    }

    console.log('Stats cleared');
  }, []);

  const getHistoryByFeature = useCallback((featureType: FeatureType) => {
    return history.filter((e) => e.featureType === featureType);
  }, [history]);

  const recentHistory = useMemo(() => history.slice(0, 20), [history]);

  return useMemo(() => ({
    history,
    stats,
    isLoading,
    recentHistory,
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    clearStats,
    getHistoryByFeature,
  }), [history, stats, isLoading, recentHistory, addHistoryEntry, deleteHistoryEntry, clearHistory, clearStats, getHistoryByFeature]);
});

export const FEATURE_LABELS: Record<FeatureType, string> = {
  document_reader: 'Document Reader',
  screen_reader: 'Screen Reader',
  object_detection: 'Object Detection',
  mobility_assistant: 'Mobility Assistant',
  ai_guide: 'AI Guide',
};

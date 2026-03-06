import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';

import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useHistory, FeatureType, HistoryEntry, FEATURE_LABELS } from '@/contexts/HistoryContext';
import {
  Clock,
  Trash2,
  ScanText,
  MonitorSpeaker,
  Eye,
  Navigation,
  BotMessageSquare,
  Filter,
  X,
  ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';


const FEATURE_ICONS: Record<FeatureType, typeof ScanText> = {
  document_reader: ScanText,
  screen_reader: MonitorSpeaker,
  object_detection: Eye,
  mobility_assistant: Navigation,
  ai_guide: BotMessageSquare,
};

const FEATURE_COLORS: Record<FeatureType, string> = {
  document_reader: '#FF6B35',
  screen_reader: '#00B4D8',
  object_detection: '#5856D6',
  mobility_assistant: '#30D158',
  ai_guide: '#FF2D55',
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function HistoryCard({
  entry,
  onDelete,
  colors,
  fontSizes,
}: {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof useAccessibility>['colors'];
  fontSizes: ReturnType<typeof useAccessibility>['fontSizes'];
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const Icon = FEATURE_ICONS[entry.featureType];
  const accentColor = FEATURE_COLORS[entry.featureType];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Entry', 'Remove this from your history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
    ]);
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.featureBadge, { backgroundColor: accentColor + '15' }]}>
            <Icon size={16} color={accentColor} strokeWidth={2} />
            <Text style={[styles.featureBadgeText, { color: accentColor, fontSize: fontSizes.xs }]}>
              {FEATURE_LABELS[entry.featureType]}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={[styles.timeText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
              {formatTimestamp(entry.timestamp)}
            </Text>
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteButton}
              testID={`delete-history-${entry.id}`}
            >
              <Trash2 size={16} color={colors.textSecondary} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[styles.cardTitle, { color: colors.text, fontSize: fontSizes.base }]}
          numberOfLines={1}
        >
          {entry.title}
        </Text>

        <Text
          style={[styles.cardSummary, { color: colors.textSecondary, fontSize: fontSizes.sm }]}
          numberOfLines={3}
        >
          {entry.summary}
        </Text>

        {entry.imageUri && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: entry.imageUri }}
              style={styles.entryImage}
              resizeMode="cover"
            />
            <View style={[styles.imageBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <ImageIcon size={12} color="#FFFFFF" strokeWidth={2} />
            </View>
          </View>
        )}

        {entry.durationSeconds != null && entry.durationSeconds > 0 && (
          <View style={[styles.durationBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.durationText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
              {entry.durationSeconds < 60
                ? `${entry.durationSeconds}s`
                : `${Math.floor(entry.durationSeconds / 60)}m ${entry.durationSeconds % 60}s`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const { colors, fontSizes } = useAccessibility();
  const { history, deleteHistoryEntry, clearHistory } = useHistory();
  const [filter, setFilter] = useState<FeatureType | 'all'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const filteredHistory = filter === 'all'
    ? history
    : history.filter((e) => e.featureType === filter);

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Clear History', 'This will remove all saved history. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearHistory() },
    ]);
  }, [clearHistory]);

  const filterOptions: { key: FeatureType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'document_reader', label: 'Documents' },
    { key: 'screen_reader', label: 'Screen' },
    { key: 'object_detection', label: 'Objects' },
    { key: 'mobility_assistant', label: 'Mobility' },
    { key: 'ai_guide', label: 'AI Guide' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'History',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '600' },
          headerShadowVisible: false,
          headerRight: () =>
            history.length > 0 ? (
              <TouchableOpacity onPress={handleClearAll} style={styles.headerAction}>
                <Trash2 size={20} color={colors.error} strokeWidth={1.8} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {filterOptions.map((opt) => {
            const isActive = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(opt.key);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                testID={`filter-${opt.key}`}
              >
                {opt.key !== 'all' && (
                  <View style={styles.filterIcon}>
                    {React.createElement(FEATURE_ICONS[opt.key as FeatureType], {
                      size: 14,
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                      strokeWidth: 2,
                    })}
                  </View>
                )}
                {opt.key === 'all' && (
                  <Filter size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? '#FFFFFF' : colors.text,
                      fontSize: fontSizes.xs,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filter !== 'all' && (
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[styles.clearFilterBanner, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Text style={[styles.clearFilterText, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
              Showing: {filterOptions.find((f) => f.key === filter)?.label}
            </Text>
            <X size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Clock size={40} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
                No history yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                Your saved results from features will appear here
              </Text>
            </View>
          ) : (
            filteredHistory.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onDelete={deleteHistoryEntry}
                colors={colors}
                fontSizes={fontSizes}
              />
            ))
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAction: {
    padding: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  filterIcon: {},
  filterChipText: {
    fontWeight: '600' as const,
    flexShrink: 0,
  },
  clearFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  clearFilterText: {
    fontWeight: '500' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featureBadgeText: {
    fontWeight: '600' as const,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontWeight: '400' as const,
  },
  deleteButton: {
    padding: 4,
  },
  cardTitle: {
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  cardSummary: {
    lineHeight: 20,
  },
  imageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  entryImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  imageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  durationText: {
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  bottomSpacer: {
    height: 24,
  },
});

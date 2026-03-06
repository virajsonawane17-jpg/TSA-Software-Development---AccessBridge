import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useHistory, FeatureType, FEATURE_LABELS } from '@/contexts/HistoryContext';
import {
  BarChart3,
  TrendingUp,
  Flame,
  Clock,
  ScanText,
  MonitorSpeaker,
  Eye,
  Navigation,
  BotMessageSquare,
  Zap,
  Target,
  Calendar,
  Activity,
  LucideIcon,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURE_ICONS: Record<FeatureType, LucideIcon> = {
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

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subtitle,
  colors,
  fontSizes,
  delay,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  subtitle?: string;
  colors: ReturnType<typeof useAccessibility>['colors'];
  fontSizes: ReturnType<typeof useAccessibility>['fontSizes'];
  delay: number;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.xl }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.textSecondary, fontSize: 10 }]}>
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}

function FeatureBar({
  featureType,
  count,
  maxCount,
  colors,
  fontSizes,
  delay,
}: {
  featureType: FeatureType;
  count: number;
  maxCount: number;
  colors: ReturnType<typeof useAccessibility>['colors'];
  fontSizes: ReturnType<typeof useAccessibility>['fontSizes'];
  delay: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const Icon = FEATURE_ICONS[featureType];
  const accentColor = FEATURE_COLORS[featureType];
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: false }),
      Animated.timing(widthAnim, { toValue: percentage, duration: 800, delay, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, widthAnim, percentage, delay]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.featureBarRow, { opacity: fadeAnim }]}>
      <View style={styles.featureBarLeft}>
        <View style={[styles.featureBarIcon, { backgroundColor: accentColor + '15' }]}>
          <Icon size={16} color={accentColor} strokeWidth={2} />
        </View>
        <View style={styles.featureBarInfo}>
          <Text style={[styles.featureBarLabel, { color: colors.text, fontSize: fontSizes.sm }]}>
            {FEATURE_LABELS[featureType]}
          </Text>
          <Text style={[styles.featureBarCount, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {count} {count === 1 ? 'use' : 'uses'}
          </Text>
        </View>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: accentColor, width: animatedWidth }]}
        />
      </View>
    </Animated.View>
  );
}

function WeeklyChart({
  dailyUsage,
  colors,
  fontSizes,
}: {
  dailyUsage: Record<string, number>;
  colors: ReturnType<typeof useAccessibility>['colors'];
  fontSizes: ReturnType<typeof useAccessibility>['fontSizes'];
}) {
  const last7Days = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        key,
        label: i === 0 ? 'Today' : dayNames[d.getDay()],
        count: dailyUsage[key] || 0,
      });
    }
    return days;
  }, [dailyUsage]);

  const maxVal = Math.max(...last7Days.map((d) => d.count), 1);

  return (
    <View style={styles.weeklyChart}>
      <View style={styles.chartBars}>
        {last7Days.map((day, index) => {
          const heightPercent = (day.count / maxVal) * 100;
          return (
            <View key={day.key} style={styles.chartColumn}>
              <Text style={[styles.chartValue, { color: colors.text, fontSize: 10 }]}>
                {day.count > 0 ? day.count : ''}
              </Text>
              <View style={[styles.chartBarTrack, { backgroundColor: colors.surfaceSecondary }]}>
                <AnimatedBar
                  heightPercent={heightPercent}
                  color={day.label === 'Today' ? colors.primary : colors.primaryLight}
                  delay={index * 80}
                />
              </View>
              <Text
                style={[
                  styles.chartLabel,
                  {
                    color: day.label === 'Today' ? colors.primary : colors.textSecondary,
                    fontSize: 10,
                    fontWeight: day.label === 'Today' ? ('600' as const) : ('400' as const),
                  },
                ]}
              >
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedBar({
  heightPercent,
  color,
  delay,
}: {
  heightPercent: number;
  color: string;
  delay: number;
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: heightPercent,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [heightAnim, heightPercent, delay]);

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.chartBarFill,
        { backgroundColor: color, height: animatedHeight },
      ]}
    />
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function AnalyticsScreen() {
  const { colors, fontSizes } = useAccessibility();
  const { stats } = useHistory();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const featureEntries = useMemo(() => {
    const entries = Object.entries(stats.featureUsage) as [FeatureType, number][];
    return entries.sort((a, b) => b[1] - a[1]);
  }, [stats.featureUsage]);

  const maxFeatureCount = useMemo(() => {
    return Math.max(...featureEntries.map(([, c]) => c), 1);
  }, [featureEntries]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayCount = stats.dailyUsage[todayKey] || 0;

  const thisWeekCount = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      count += stats.dailyUsage[key] || 0;
    }
    return count;
  }, [stats.dailyUsage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Analytics',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroLeft}>
            <Text style={[styles.heroLabel, { fontSize: fontSizes.sm }]}>Total Sessions</Text>
            <Text style={[styles.heroValue, { fontSize: fontSizes['4xl'] }]}>
              {stats.totalSessions}
            </Text>
            <Text style={[styles.heroSubtext, { fontSize: fontSizes.xs }]}>
              {todayCount} today · {thisWeekCount} this week
            </Text>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.heroIconContainer}>
              <Activity size={36} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={Flame}
            iconColor="#FF6B35"
            iconBg="#FFF4EF"
            label="Day Streak"
            value={stats.weeklyStreak}
            subtitle="consecutive days"
            colors={colors}
            fontSizes={fontSizes}
            delay={0}
          />
          <StatCard
            icon={Clock}
            iconColor="#00B4D8"
            iconBg="#EDF9FC"
            label="Avg Duration"
            value={formatDuration(stats.averageSessionDuration)}
            subtitle="per session"
            colors={colors}
            fontSizes={fontSizes}
            delay={80}
          />
          <StatCard
            icon={Zap}
            iconColor="#5856D6"
            iconBg="#F0F0FF"
            label="Total Time"
            value={formatDuration(stats.totalDurationSeconds)}
            subtitle="across all features"
            colors={colors}
            fontSizes={fontSizes}
            delay={160}
          />
          <StatCard
            icon={Target}
            iconColor="#30D158"
            iconBg="#EEFCF1"
            label="Most Used"
            value={stats.mostUsedFeature ? FEATURE_LABELS[stats.mostUsedFeature].split(' ')[0] : '—'}
            subtitle={stats.mostUsedFeature ? FEATURE_LABELS[stats.mostUsedFeature] : 'no data yet'}
            colors={colors}
            fontSizes={fontSizes}
            delay={240}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
              Feature Usage
            </Text>
          </View>
          <View style={styles.featureBars}>
            {featureEntries.map(([type, count], index) => (
              <FeatureBar
                key={type}
                featureType={type}
                count={count}
                maxCount={maxFeatureCount}
                colors={colors}
                fontSizes={fontSizes}
                delay={index * 100}
              />
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
              Last 7 Days
            </Text>
          </View>
          <WeeklyChart dailyUsage={stats.dailyUsage} colors={colors} fontSizes={fontSizes} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
              Detailed Breakdown
            </Text>
          </View>
          <View style={styles.breakdownGrid}>
            <BreakdownItem
              icon={ScanText}
              color="#FF6B35"
              label="Documents Scanned"
              value={stats.documentsScanned}
              colors={colors}
              fontSizes={fontSizes}
            />
            <BreakdownItem
              icon={MonitorSpeaker}
              color="#00B4D8"
              label="Scenes Described"
              value={stats.screenDescriptions}
              colors={colors}
              fontSizes={fontSizes}
            />
            <BreakdownItem
              icon={Eye}
              color="#5856D6"
              label="Objects Detected"
              value={stats.objectsDetected}
              colors={colors}
              fontSizes={fontSizes}
            />
            <BreakdownItem
              icon={Navigation}
              color="#30D158"
              label="Nav Sessions"
              value={stats.navigationSessions}
              colors={colors}
              fontSizes={fontSizes}
            />
            <BreakdownItem
              icon={BotMessageSquare}
              color="#FF2D55"
              label="AI Conversations"
              value={stats.aiConversations}
              colors={colors}
              fontSizes={fontSizes}
            />
          </View>
        </View>

        {stats.totalSessions === 0 && (
          <View style={[styles.emptyBanner, { backgroundColor: colors.surfaceSecondary }]}>
            <BarChart3 size={28} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
              Start using features to see your analytics data here
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

function BreakdownItem({
  icon: Icon,
  color,
  label,
  value,
  colors,
  fontSizes,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: number;
  colors: ReturnType<typeof useAccessibility>['colors'];
  fontSizes: ReturnType<typeof useAccessibility>['fontSizes'];
}) {
  return (
    <View style={[styles.breakdownItem, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={[styles.breakdownIcon, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.breakdownValue, { color: colors.text, fontSize: fontSizes.xl }]}>
        {value}
      </Text>
      <Text
        style={[styles.breakdownLabel, { color: colors.textSecondary, fontSize: 11 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  heroValue: {
    color: '#FFFFFF',
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400' as const,
    marginTop: 4,
  },
  heroRight: {
    marginLeft: 16,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: '700' as const,
  },
  statLabel: {
    fontWeight: '500' as const,
  },
  statSubtitle: {
    fontWeight: '400' as const,
    marginTop: 2,
  },
  section: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700' as const,
  },
  featureBars: {
    gap: 14,
  },
  featureBarRow: {
    gap: 8,
  },
  featureBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  featureBarIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureBarInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureBarLabel: {
    fontWeight: '500' as const,
  },
  featureBarCount: {
    fontWeight: '400' as const,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  weeklyChart: {
    paddingTop: 4,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartValue: {
    fontWeight: '600' as const,
    marginBottom: 4,
    minHeight: 14,
  },
  chartBarTrack: {
    width: '70%',
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    minHeight: 4,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  chartLabel: {
    marginTop: 6,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  breakdownItem: {
    width: (SCREEN_WIDTH - 76) / 3,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownValue: {
    fontWeight: '700' as const,
  },
  breakdownLabel: {
    fontWeight: '400' as const,
    textAlign: 'center' as const,
  },
  emptyBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 24,
  },
});

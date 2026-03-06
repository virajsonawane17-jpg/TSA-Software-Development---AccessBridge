import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useUser } from '@/contexts/UserContext';
import { FeatureCard } from '@/components/FeatureCard';
import { Settings, ScanText, MonitorSpeaker, Eye, Navigation, BotMessageSquare, Clock, Flame, ChevronRight, Activity } from 'lucide-react-native';
import { useHistory, FEATURE_LABELS } from '@/contexts/HistoryContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const gradients = [
  ['#F97316', '#EA580C', '#C2410C'],
  ['#0EA5E9', '#0284C7', '#0369A1'],
  ['#8B5CF6', '#7C3AED', '#6D28D9'],
  ['#10B981', '#059669', '#047857'],
  ['#F43F5E', '#E11D48', '#BE123C'],
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, fontSizes } = useAccessibility();
  const { firstName } = useUser();
  const { stats } = useHistory();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = useMemo(getTimeOfDay, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSettingsPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handleHistoryPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/history');
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayCount = stats.dailyUsage[todayKey] || 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const features = [
    { title: 'Document Reader', subtitle: 'Read printed text aloud', Icon: ScanText, route: '/scan-text' as const, testID: 'feature-scan-text', color: colors.cardOrange, bgColor: colors.cardOrangeBg, gradient: gradients[0] },
    { title: 'Screen Reader', subtitle: 'Hear what\'s on your screen', Icon: MonitorSpeaker, route: '/read-screen' as const, testID: 'feature-read-screen', color: colors.cardTeal, bgColor: colors.cardTealBg, gradient: gradients[1] },
    { title: 'Object Detection', subtitle: 'Identify objects around you', Icon: Eye, route: '/object-detection' as const, testID: 'feature-object-detection', color: colors.cardIndigo, bgColor: colors.cardIndigoBg, gradient: gradients[2] },
    { title: 'Mobility Assistant', subtitle: 'Guided walking assistance', Icon: Navigation, route: '/navigation-help' as const, testID: 'feature-navigation-help', color: colors.cardEmerald, bgColor: colors.cardEmeraldBg, gradient: gradients[3] },
    { title: 'AI Guide', subtitle: 'Talk to AI for live help', Icon: BotMessageSquare, route: '/ai-guider' as const, testID: 'feature-ai-guider', color: colors.cardRose, bgColor: colors.cardRoseBg, gradient: gradients[4] },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTextBlock}>
              <Text
                style={[
                  styles.greeting,
                  { color: colors.text, fontSize: fontSizes.xl },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {firstName ? `${greeting}, ${firstName}` : `${greeting}`} 👋
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: colors.textSecondary, fontSize: fontSizes.base },
                ]}
              >
                Explore your tools
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleHistoryPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="History"
                style={[styles.headerIconButton, { backgroundColor: colors.surfaceSecondary }]}
                testID="history-button"
              >
                <Clock size={20} color={colors.text} strokeWidth={1.8} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSettingsPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={[styles.headerIconButton, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Settings size={20} color={colors.text} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
          </View>


        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/analytics');
            }}
            activeOpacity={0.85}
            style={[styles.analyticsCard, { backgroundColor: colors.primary }]}
            testID="analytics-button"
          >
            <View style={styles.analyticsCardHeader}>
              <View style={styles.analyticsCardTitleRow}>
                <View style={styles.analyticsIconCircle}>
                  <Activity size={16} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={[styles.analyticsCardTitle, { fontSize: fontSizes.sm }]}>Your Activity</Text>
              </View>
              <View style={styles.analyticsChevron}>
                <ChevronRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </View>
            </View>
            <View style={styles.analyticsStatsRow}>
              <View style={styles.analyticsStat}>
                <Text style={[styles.analyticsStatValue, { fontSize: fontSizes.xl }]}>
                  {stats.totalSessions}
                </Text>
                <Text style={styles.analyticsStatLabel}>Sessions</Text>
              </View>
              <View style={styles.analyticsStatDivider} />
              <View style={styles.analyticsStat}>
                <Text style={[styles.analyticsStatValue, { fontSize: fontSizes.xl }]}>
                  {todayCount}
                </Text>
                <Text style={styles.analyticsStatLabel}>Today</Text>
              </View>
              <View style={styles.analyticsStatDivider} />
              <View style={styles.analyticsStat}>
                <Text style={[styles.analyticsStatValue, { fontSize: fontSizes.xl }]}>
                  {stats.weeklyStreak}
                </Text>
                <Text style={styles.analyticsStatLabel}>
                  <Flame size={10} color="rgba(255,255,255,0.7)" /> Streak
                </Text>
              </View>
              <View style={styles.analyticsStatDivider} />
              <View style={styles.analyticsStat}>
                <Text style={[styles.analyticsStatValue, { fontSize: fontSizes.xl }]}>
                  {formatTime(stats.averageSessionDuration)}
                </Text>
                <Text style={styles.analyticsStatLabel}>Avg Time</Text>
              </View>
            </View>
            {stats.mostUsedFeature && (
              <View style={styles.analyticsMostUsed}>
                <Text style={styles.analyticsMostUsedText}>
                  Most used: {FEATURE_LABELS[stats.mostUsedFeature]}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
              Your tools
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View
                key={feature.testID}
                style={index % 2 === 0 && index === features.length - 1 ? styles.featureFull : styles.featureLarge}
              >
                <FeatureCard
                  title={feature.title}
                  subtitle={feature.subtitle}
                  Icon={feature.Icon}
                  onPress={() => router.push(feature.route)}
                  testID={feature.testID}
                  cardColor={feature.color}
                  cardBgColor={feature.bgColor}
                  gradientColors={feature.gradient}
                />
              </View>
            ))}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  greeting: {
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '400' as const,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  analyticsCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsCardTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600' as const,
  },
  analyticsChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsStat: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsStatValue: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  analyticsStatLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  analyticsStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  analyticsMostUsed: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  analyticsMostUsedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '700' as const,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureLarge: {
    width: (SCREEN_WIDTH - 52) / 2,
  },
  featureFull: {
    width: '100%',
  },
  bottomSpacer: {
    height: 24,
  },
});

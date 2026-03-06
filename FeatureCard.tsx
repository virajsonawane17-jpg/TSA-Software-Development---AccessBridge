import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import * as Haptics from 'expo-haptics';
import { LucideIcon, ChevronRight } from 'lucide-react-native';

interface CardProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  onPress: () => void;
  testID?: string;
  cardColor?: string;
  cardBgColor?: string;
  gradientColors?: string[];
}

export function FeatureCard({
  title,
  subtitle,
  Icon,
  onPress,
  testID,
  cardColor,
  cardBgColor,
  gradientColors,
}: CardProps) {
  const { colors, fontSizes } = useAccessibility();
  const scale = React.useRef(new Animated.Value(1)).current;

  const accentColor = cardColor ?? colors.accent;
  const bgColor = cardBgColor ?? colors.surfaceSecondary;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const onButtonPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (gradientColors) {
    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scale }] }]}>
        <TouchableOpacity
          onPress={onButtonPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${subtitle}`}
          style={styles.gradientCard}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.gradientDecoCircle1} />
            <View style={styles.gradientDecoCircle2} />
            <View style={styles.gradientContent}>
              <View style={styles.gradientIconBadge}>
                <Icon size={22} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={styles.gradientTextBlock}>
                <Text
                  style={[styles.gradientTitle, { fontSize: fontSizes.lg }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                <Text
                  style={[styles.gradientSubtitle, { fontSize: fontSizes.xs }]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              </View>
              <View style={styles.gradientArrow}>
                <ChevronRight size={16} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scale }] }]}>
      <TouchableOpacity
        onPress={onButtonPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={[styles.card, { backgroundColor: bgColor }]}
      >
        <View style={styles.cardRow}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: accentColor + '15' },
            ]}
          >
            <Icon size={24} color={accentColor} strokeWidth={2} />
          </View>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: fontSizes.base },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontSize: fontSizes.sm },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
          <View style={[styles.arrow, { backgroundColor: accentColor + '10' }]}>
            <Icon size={18} color={accentColor} strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '600' as const,
  },
  subtitle: {
    opacity: 0.7,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 20,
  },
  gradientDecoCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gradientDecoCircle2: {
    position: 'absolute',
    top: 40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  gradientContent: {
    padding: 18,
    gap: 6,
  },
  gradientIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gradientTextBlock: {
    gap: 3,
  },
  gradientTitle: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  gradientSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
  },
  gradientArrow: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAccessibility, FontSizeLevel } from '@/contexts/AccessibilityContext';
import { Type } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface FontSizeSelectorProps {
  testID?: string;
}

const fontSizeOptions: { level: FontSizeLevel; label: string; previewSize: number }[] = [
  { level: 'normal', label: 'Normal', previewSize: 16 },
  { level: 'large', label: 'Large', previewSize: 20 },
  { level: 'extraLarge', label: 'Extra Large', previewSize: 24 },
];

export function FontSizeSelector({ testID }: FontSizeSelectorProps) {
  const { colors, fontSizes, settings, updateSetting } = useAccessibility();

  const handleSelect = (level: FontSizeLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSetting('fontSizeLevel', level);
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.titleRow}>
        <View style={[styles.titleIconBg, { backgroundColor: colors.cardTealBg }]}>
          <Type size={16} color={colors.cardTeal} strokeWidth={2} />
        </View>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: fontSizes.base },
          ]}
        >
          Font Size
        </Text>
      </View>
      <View style={styles.options}>
        {fontSizeOptions.map((option) => {
          const isSelected = settings.fontSizeLevel === option.level;
          return (
            <TouchableOpacity
              key={option.level}
              onPress={() => handleSelect(option.level)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label} font size`}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.preview,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontSize: option.previewSize,
                  },
                ]}
              >
                Aa
              </Text>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontSize: fontSizes.xs,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  titleIconBg: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600' as const,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  optionLabel: {
    fontWeight: '500' as const,
  },
  preview: {
    fontWeight: '700' as const,
  },
});

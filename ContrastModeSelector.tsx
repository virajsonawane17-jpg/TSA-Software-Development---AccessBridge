import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAccessibility, ContrastMode } from '@/contexts/AccessibilityContext';
import * as Haptics from 'expo-haptics';
import { Sun, Contrast, Eye } from 'lucide-react-native';

interface ContrastModeSelectorProps {
  testID?: string;
}

const contrastOptions: { mode: ContrastMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'standard', label: 'Standard', Icon: Sun },
  { mode: 'highContrast', label: 'High Contrast', Icon: Contrast },
];

export function ContrastModeSelector({ testID }: ContrastModeSelectorProps) {
  const { colors, fontSizes, settings, updateSetting } = useAccessibility();

  const handleSelect = (mode: ContrastMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSetting('contrastMode', mode);
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.titleRow}>
        <View style={[styles.titleIconBg, { backgroundColor: colors.cardRoseBg }]}>
          <Eye size={16} color={colors.cardRose} strokeWidth={2} />
        </View>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: fontSizes.base },
          ]}
        >
          Contrast Mode
        </Text>
      </View>
      <View style={styles.options}>
        {contrastOptions.map((option) => {
          const isSelected = settings.contrastMode === option.mode;
          const Icon = option.Icon;
          return (
            <TouchableOpacity
              key={option.mode}
              onPress={() => handleSelect(option.mode)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label} contrast mode`}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Icon
                size={24}
                color={isSelected ? '#FFFFFF' : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontSize: fontSizes.sm,
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  optionLabel: {
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
});

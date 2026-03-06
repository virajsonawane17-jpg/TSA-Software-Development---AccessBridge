import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
  testID?: string;
}

export function ToggleButton({
  label,
  isActive,
  onToggle,
  testID,
}: ToggleButtonProps) {
  const { colors, fontSizes } = useAccessibility();
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="switch"
        accessibilityState={{ checked: isActive }}
        accessibilityLabel={label}
        style={[
          styles.toggle,
          {
            backgroundColor: isActive ? colors.primary + '08' : colors.background,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color: isActive ? colors.primary : colors.text,
              fontSize: fontSizes.base,
            },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isActive ? colors.primary : colors.background,
              borderColor: isActive ? colors.primary : colors.border,
            },
          ]}
        >
          {isActive && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  label: {
    fontWeight: '500' as const,
    flex: 1,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

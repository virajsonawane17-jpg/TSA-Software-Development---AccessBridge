import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'normal' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  testID?: string;
  children?: React.ReactNode;
}

export function AccessibleButton({
  title,
  onPress,
  variant = 'primary',
  size = 'normal',
  style,
  textStyle,
  disabled = false,
  testID,
  children,
}: ButtonProps) {
  const { colors, fontSizes } = useAccessibility();
  const scale = React.useRef(new Animated.Value(1)).current;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBgColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.accent;
      case 'outline':
        return 'transparent';
      case 'danger':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'primary':
        return colors.textOnPrimary;
      case 'secondary':
        return colors.textOnAccent;
      case 'outline':
        return colors.text;
      case 'danger':
        return colors.textOnPrimary;
      default:
        return colors.textOnPrimary;
    }
  };

  const buttonHeight = size === 'large' ? 56 : 48;
  const fontSize = size === 'large' ? fontSizes.lg : fontSizes.base;

  return (
    <Animated.View style={{ transform: [{ scale: scale }] }}>
      <TouchableOpacity
        onPress={onButtonPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[
          styles.button,
          {
            backgroundColor: getBgColor(),
            borderColor: variant === 'outline' ? colors.border : 'transparent',
            borderWidth: variant === 'outline' ? 1.5 : 0,
            height: buttonHeight,
          },
          style,
        ]}
      >
        {children ? (
          children
        ) : (
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize,
              },
              textStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
});

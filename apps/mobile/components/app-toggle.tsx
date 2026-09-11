import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';

export function AppToggle({
  value,
  label,
  onValueChange,
  disabled = false,
  style,
}: {
  value: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: reducedMotion ? 0 : 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[{ width: 44, height: 44, flexShrink: 0, justifyContent: 'center', opacity: disabled ? 0.48 : 1 }, style]}
    >
      <Animated.View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: ui.border, overflow: 'hidden' }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, borderRadius: 12, backgroundColor: ui.accent, opacity: progress }}
        />
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: ui.surface, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }}
        />
      </Animated.View>
    </Pressable>
  );
}

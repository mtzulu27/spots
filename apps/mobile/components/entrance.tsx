import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from 'react-native';

export function Entrance({ children, trigger, index = 0, style, disabled = false }: {
  children: ReactNode; trigger?: string; index?: number; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (disabled) { progress.setValue(1); return; }
    let disposed = false;
    let motion: Animated.CompositeAnimation | undefined;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) { motion?.stop(); progress.setValue(1); }
    });
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (disposed || reduced) return;
      progress.setValue(0);
      motion = Animated.timing(progress, { toValue: 1, duration: 320, delay: Math.min(index, 5) * 45, useNativeDriver: true });
      motion.start();
    }).catch(() => progress.setValue(1));
    return () => { disposed = true; motion?.stop(); subscription.remove(); };
  }, [trigger, index, progress, disabled]);
  return <Animated.View style={[style, !disabled && { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

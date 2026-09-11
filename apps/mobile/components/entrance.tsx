import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from 'react-native';

let reducedMotion = true;
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
let generation = 0;
const listeners = new Set<() => void>();
function subscribeMotion(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const current = ++generation;
    let changed = false;
    const update = (value: boolean) => {
      if (current !== generation || value === reducedMotion) return;
      reducedMotion = value;
      listeners.forEach(notify => notify());
    };
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; update(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (!changed) update(value); }).catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { subscription?.remove(); subscription = undefined; generation++; reducedMotion = true; }
  };
}
const getMotionSnapshot = () => reducedMotion;
const getServerMotionSnapshot = () => true;

export function Entrance({ children, trigger, index = 0, style, disabled = false }: {
  children: ReactNode; trigger?: string; index?: number; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useSyncExternalStore(subscribeMotion, getMotionSnapshot, getServerMotionSnapshot);
  useEffect(() => {
    if (disabled || reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const motion = Animated.timing(progress, { toValue: 1, duration: 320, delay: Math.min(index, 5) * 45, useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [trigger, index, progress, disabled, reduced]);
  return <Animated.View style={[style, !disabled && { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

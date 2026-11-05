import { SpotsIcon as Ionicons } from '@/components/spots-icon';
import { useIsFocused } from '@react-navigation/native';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountUi as ui } from '@/lib/account-ui';

const destinations = [
  ['explore', 'home-outline', 'Explorar', 'onExplore'],
  ['map', 'map-outline', 'Mapa', 'onMap'],
  ['contribute', 'chatbox-ellipses-outline', 'Aportar', 'onContribute'],
  ['account', 'person-outline', 'Mi cuenta', 'onAccount'],
] as const;
const navItemSize = 48;
const navItemGap = 16;
const navInlinePadding = 8;
type NavigationProps = {
  active: 'explore' | 'map' | 'parches' | 'contribute' | 'account'; onExplore: () => void; onMap: () => void;
  onParches: () => void; onContribute: () => void; onAccount: () => void;
};
type SurfaceProps = NavigationProps & { bottomInset: number };
const webRegistrations = new Map<symbol, SurfaceProps>();
let webRoot: { render: (node: ReactNode) => void; unmount: () => void } | undefined;
let webHost: HTMLDivElement | undefined;
let renderQueued = false;
let surfaceSequence = 0;

// One viewport-level surface survives screen changes and their entrance effects.
function scheduleWebNavigation() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => {
    renderQueued = false;
    const props = Array.from(webRegistrations.values()).at(-1);
    if (!props) {
      webRoot?.unmount();
      webRoot = undefined;
      webHost?.remove();
      webHost = undefined;
      return;
    }
    if (!webRoot) {
      webHost = document.createElement('div');
      webHost.dataset.spotsNavigationHost = 'true';
      Object.assign(webHost.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: 'var(--app-height, 100dvh)', pointerEvents: 'none', zIndex: '50' });
      document.body.appendChild(webHost);
      const { createRoot } = require('react-dom/client') as { createRoot: (container: Element) => NonNullable<typeof webRoot> };
      webRoot = createRoot(webHost);
    }
    webRoot.render(<NavigationSurface {...props} />);
  });
}

export function DiscoveryNavigation(props: NavigationProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const registration = useRef(Symbol('navigation'));
  const [isStandalonePwa, setIsStandalonePwa] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setIsStandalonePwa(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  }, []);
  const bottomInset = isStandalonePwa ? Math.max(insets.bottom, 16) : 22;
  const { active, onExplore, onMap, onParches, onContribute, onAccount } = props;
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !isFocused) return;
    const key = registration.current;
    webRegistrations.set(key, { active, onExplore, onMap, onParches, onContribute, onAccount, bottomInset });
    scheduleWebNavigation();
    return () => { webRegistrations.delete(key); scheduleWebNavigation(); };
  }, [isFocused, active, onExplore, onMap, onParches, onContribute, onAccount, bottomInset]);
  return Platform.OS === 'web' ? null : <NavigationSurface {...props} bottomInset={bottomInset} />;
}

function NavigationSurface(props: SurfaceProps) {
  const { active, bottomInset } = props;
  const activeIndex = destinations.findIndex(([destination]) => destination === active);
  const [initialIndex] = useState(Math.max(0, activeIndex));
  const [surfaceId] = useState(() => ++surfaceSequence);
  const [progress] = useState(() => new Animated.Value(initialIndex));
  const cursorRef = useRef<View>(null);
  const trackRef = useRef<View>(null);
  const webAnimations = useRef<Animation[]>([]);
  const target = useRef<{ index: number; width: number; reduced: boolean } | null>(null);
  const [navWidth, setNavWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const tabs = destinations.map(([destination, icon, label, callback]) =>
    [icon, label, props[callback], active === destination] as const);
  const lastIndex = tabs.length - 1;
  const step = navItemSize + navItemGap;
  const translateX = progress.interpolate({ inputRange: [0, lastIndex], outputRange: [navInlinePadding, navInlinePadding + step * lastIndex] });
  const counterTranslateX = Animated.multiply(translateX, -1);
  function moveTo(index: number) {
    // Direct links to the hidden Parches route have no selected navbar item.
    if (index < 0) return;
    if (target.current?.index === index && target.current.width === navWidth && target.current.reduced === reduceMotion) return;
    const previousIndex = target.current?.index ?? index;
    target.current = { index, width: navWidth, reduced: reduceMotion };
    const duration = reduceMotion ? 0 : 220 + Math.min(lastIndex, Math.abs(index - previousIndex)) * 25;
    if (Platform.OS !== 'web') {
      progress.stopAnimation();
      Animated.timing(progress, { toValue: index, duration, useNativeDriver: true }).start();
      return;
    }
    if (!navWidth) return;
    const cursor = cursorRef.current as unknown as HTMLElement | null;
    const track = trackRef.current as unknown as HTMLElement | null;
    if (!cursor || !track) return;
    const fromCursor = getComputedStyle(cursor).transform;
    const fromTrack = getComputedStyle(track).transform;
    webAnimations.current.forEach(animation => animation.cancel());
    webAnimations.current = [];
    const x = (value: number) => navInlinePadding + step * value;
    for (const [element, sign, from] of [[cursor, 1, fromCursor], [track, -1, fromTrack]] as const) {
      element.style.transform = `translate3d(${sign * x(index)}px, 0, 0)`;
      if (duration && previousIndex !== index && element.animate) {
        webAnimations.current.push(element.animate([
          { transform: from === 'none' ? `translate3d(${sign * x(previousIndex)}px, 0, 0)` : from },
          { transform: `translate3d(${sign * x(index)}px, 0, 0)` },
        ], { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }));
      }
    }
  }
  useLayoutEffect(() => {
    moveTo(activeIndex);
  }, [activeIndex, navWidth, reduceMotion]);
  useEffect(() => () => {
      webAnimations.current.forEach(animation => animation.cancel());
      webAnimations.current = [];
      progress.stopAnimation();
  }, [progress]);
  const MotionView = Platform.OS === 'web' ? View : Animated.View;
  const initialX = navInlinePadding + step * initialIndex;
  return <View pointerEvents="box-none" style={[s.dock, { bottom: bottomInset }]}>
    <View nativeID={`spots-navbar-${surfaceId}`} pointerEvents="auto" testID="discovery-navbar" onLayout={event => setNavWidth(event.nativeEvent.layout.width)} style={s.nav}>
    {tabs.map(([icon, label, onPress, selected], index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { moveTo(index); onPress(); }} style={[s.button, !navWidth && selected && s.active]}><Ionicons name={icon} size={23} color={!navWidth && selected ? ui.surface : ui.text} /></Pressable>)}
    {navWidth > 0 && <MotionView ref={cursorRef} testID="discovery-nav-indicator" pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.cursor, { opacity: activeIndex < 0 ? 0 : 1, transform: [{ translateX: Platform.OS === 'web' ? initialX : translateX }] }]}>
      <MotionView ref={trackRef} style={[s.iconTrack, { width: navWidth, transform: [{ translateX: Platform.OS === 'web' ? -initialX : counterTranslateX }] }]}>
        {tabs.map(([icon, label]) => <View key={label} style={s.button}><Ionicons name={icon} size={23} color={ui.surface} /></View>)}
      </MotionView>
    </MotionView>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  dock: { position: 'absolute', left: 20, right: 20, zIndex: 10, alignItems: 'center' },
  nav: { height: 68, borderRadius: 34, backgroundColor: ui.surface, flexDirection: 'row', alignItems: 'center', gap: navItemGap, paddingHorizontal: navInlinePadding, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  button: { width: navItemSize, height: navItemSize, flexShrink: 0, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: ui.accent },
  cursor: { position: 'absolute', top: 10, left: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: ui.accent, overflow: 'hidden' },
  iconTrack: { position: 'absolute', left: 0, top: 0, height: navItemSize, flexDirection: 'row', alignItems: 'center', gap: navItemGap, paddingHorizontal: navInlinePadding },
});

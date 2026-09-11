import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountUi as ui } from '@/lib/account-ui';
export function DiscoveryNavigation({ active, onExplore, onMap, onParches, onContribute, onAccount }: {
  active: 'explore' | 'map' | 'parches' | 'contribute' | 'account'; onExplore: () => void; onMap: () => void;
  onParches: () => void; onContribute: () => void; onAccount: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isStandalonePwa, setIsStandalonePwa] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setIsStandalonePwa(
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
  }, []);
  const bottomInset = isStandalonePwa ? Math.max(insets.bottom, 16) : 22;
  return <View style={[s.nav, { bottom: bottomInset }]}>{([
    ['home-outline', 'Explorar', onExplore, active === 'explore'],
    ['map-outline', 'Mapa', onMap, active === 'map'],
    ['ticket-outline', 'Parches', onParches, active === 'parches'],
    ['chatbox-ellipses-outline', 'Aportar', onContribute, active === 'contribute'],
    ['person-outline', 'Mi cuenta', onAccount, active === 'account'],
  ] as const).map(([icon, label, onPress, selected]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[s.button, selected && s.active]}><Ionicons name={icon} size={23} color={ui.text} /></Pressable>)}</View>;
}
const s = StyleSheet.create({
  nav: { position: 'absolute', left: 20, right: 20, height: 68, zIndex: 10, borderRadius: 34, backgroundColor: ui.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: ui.accentSoft },
});

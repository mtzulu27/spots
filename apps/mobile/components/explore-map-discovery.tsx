import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExploreMap } from './explore-map';
import { AppIconButton, SearchField } from './app-ui';
import { DiscoveryPlaceCard } from './discovery-place-card';
import { DiscoveryNavigation } from './discovery-navigation';
import { CategoryIcon } from './category-icon';
import type { ExploreDiscoveryProps } from './explore-discovery';
import { shortcuts } from '@/lib/explore-categories';
import { accountUi as ui } from '@/lib/account-ui';
import { useLocationStore } from '@/lib/location-store';
import { rankSearchResults } from '@/lib/discovery-ranking';

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function ExploreMapDiscovery(p: ExploreDiscoveryProps & { onBack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rail = useRef<ScrollView>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [width, setWidth] = useState(390);
  const [railIndex, setRailIndex] = useState(0);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string>();
  const [focusKey, setFocusKey] = useState(0);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [areaIds, setAreaIds] = useState<string[] | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [uiHidden, setUiHidden] = useState(false);
  const [areaSuggested, setAreaSuggested] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const reducedMotion = useRef(false);
  const { userLocation, requestLocation, loading } = useLocationStore();
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) reducedMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: uiHidden ? 0 : 1, duration: reducedMotion.current ? 0 : 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [uiHidden, opacity]);
  const criteria = `${deferredQuery}|${p.selected.join('|')}|${p.activeFiltersCount}|${p.spots.map(spot => spot.id).join(',')}`;
  const previousCriteria = useRef(criteria);
  useEffect(() => {
    if (previousCriteria.current !== criteria) setAreaSuggested(true);
    previousCriteria.current = criteria;
  }, [criteria]);
  const candidates = useMemo(() => {
    const terms = normalizeSearch(deferredQuery).split(/\s+/).filter(Boolean);
    const catalog = terms.length ? p.mapSearchSpots ?? p.spots : p.spots;
    return rankSearchResults(catalog.filter(spot => {
      const branches = [spot, ...(spot.branches ?? [])];
      const text = normalizeSearch(branches.map(branch => [branch.name, branch.brandName, branch.category, branch.hubName, branch.neighborhood, ...(branch.tags ?? [])].join(' ')).join(' '));
      return Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude) && terms.every(term => text.includes(term));
    }), deferredQuery, new Date());
  }, [p.spots, p.mapSearchSpots, deferredQuery]);
  const places = useMemo(() => areaIds ? candidates.filter(spot => areaIds.includes(spot.id)) : candidates, [candidates, areaIds]);
  const cardWidth = Math.min(360, width - 48);
  const selected = places.find(spot => spot.id === selectedId) ?? places[0];
  useEffect(() => () => { if (snapTimer.current) clearTimeout(snapTimer.current); }, [places, cardWidth]);
  function finishSnap(offset: number) {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    const index = Math.max(0, Math.min(places.length - 1, Math.round(offset / (cardWidth + 12))));
    const spot = places[index];
    if (!spot) return;
    const target = index * (cardWidth + 12);
    if (Math.abs(offset - target) > 1) {
      rail.current?.scrollTo({ x: target, animated: !reducedMotion.current });
      return;
    }
    if (spot.id !== selected?.id) {
      setSelectedId(spot.id);
      setFocusKey(value => value + 1);
    }
  }
  useEffect(() => { setAreaIds(null); }, [deferredQuery, p.selected.join('|')]);
  const resultKey = places.map(spot => spot.id).join('|');
  useEffect(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    setRailIndex(0);
    setSelectedId(undefined);
    rail.current?.scrollTo({ x: 0, animated: false });
  }, [resultKey]);
  function select(id: string) {
    setUiHidden(false);
    setSelectedId(id);
    setFocusKey(value => value + 1);
    const outsideArea = !places.some(spot => spot.id === id);
    if (outsideArea) setAreaIds(null);
    const index = (outsideArea ? candidates : places).findIndex(spot => spot.id === id);
    if (index >= 0) rail.current?.scrollTo({ x: index * (cardWidth + 12), animated: true });
  }
  return <View style={s.screen} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={StyleSheet.absoluteFill}>
      <ExploreMap spots={candidates} onOpenSpot={id => router.push(`/spot/${id}`)} fullscreen selectedSpotId={selected?.id} focusKey={focusKey} onSelectSpot={select} onVisibleSpotsChange={setVisibleIds} userLocation={userLocation} recenterKey={recenter} onBackgroundPress={() => setUiHidden(value => !value)} onUserMove={() => setAreaSuggested(true)} />
    </View>
    <Animated.View pointerEvents={uiHidden ? 'none' : 'box-none'} accessibilityElementsHidden={uiHidden} importantForAccessibility={uiHidden ? 'no-hide-descendants' : 'auto'} style={[s.top, { opacity, top: Math.max(16, insets.top + 8) }]}>
      <View style={s.row}>
        <View style={s.searchInput}><SearchField value={query} onChangeText={setQuery} placeholder="Busca un lugar" height={48} backgroundColor={ui.surface} showClearButton={!!query} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros" onPress={p.onFilters} style={s.filter}>
          <Ionicons name="options-outline" size={20} color={ui.text} />
          {!!p.activeFiltersCount && <View style={s.badge}><Text style={s.badgeText}>{p.activeFiltersCount}</Text></View>}
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
        {shortcuts.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: p.selected.includes(item.value) }} onPress={() => p.onCategory(item.value)} style={[s.chip, p.selected.includes(item.value) && { backgroundColor: item.activeBg }]}><CategoryIcon category={item.value} size={18} color={ui.text} /><Text style={s.label}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {areaSuggested && visibleIds && <Pressable accessibilityRole="button" onPress={() => { setAreaSuggested(false); setAreaIds(visibleIds); setSelectedId(undefined); rail.current?.scrollTo({ x: 0, animated: true }); }} style={s.area}><Text style={s.label}>Buscar en esta zona</Text></Pressable>}
    </Animated.View>
    <View pointerEvents="box-none" style={[s.bottom, { bottom: Math.max(insets.bottom, 16) + 68 + 12 }]}>
      <Animated.View pointerEvents={uiHidden ? 'none' : 'box-none'} accessibilityElementsHidden={uiHidden} importantForAccessibility={uiHidden ? 'no-hide-descendants' : 'auto'} style={{ opacity, gap: 12 }}>
      <View style={s.tools}><AppIconButton name="locate-outline" accessibilityLabel={loading ? 'Buscando tu ubicación' : 'Centrar en mi ubicación'} tone="light" size={44} onPress={() => { if (!userLocation) requestLocation(); setRecenter(value => value + 1); }} /></View>
      {places.length ? <ScrollView ref={rail} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={cardWidth + 12} snapToAlignment="start" disableIntervalMomentum scrollEventThrottle={16}
        style={Platform.OS === 'web' ? { scrollSnapType: 'x mandatory', scrollPaddingLeft: 16 } as any : undefined}
        contentContainerStyle={[s.cards, { paddingRight: Math.max(16, width - cardWidth - 16) }, Platform.OS === 'web' ? { scrollSnapAlign: 'none' } as any : undefined]}
        onScroll={event => {
          const offset = event.nativeEvent.contentOffset.x;
          setRailIndex(Math.round(offset / (cardWidth + 12)));
          if (snapTimer.current) clearTimeout(snapTimer.current);
          snapTimer.current = setTimeout(() => finishSnap(offset), 160);
        }}
        onMomentumScrollEnd={event => finishSnap(event.nativeEvent.contentOffset.x)}>
        {places.map((spot, index) => <View key={spot.id} style={[{ width: cardWidth, height: 190, flexShrink: 0 }, Platform.OS === 'web' ? { scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any : undefined]}>{Math.abs(index - railIndex) <= 2 && <DiscoveryPlaceCard spot={spot} width={cardWidth} bookmarked={p.isSaved(spot.likeTargetId)} onToggleBookmark={() => p.toggleSaved(spot.likeTargetId)} onPress={() => router.push(p.href(spot))} />}</View>)}
      </ScrollView> : <View style={s.empty}><Text style={s.label}>No hay lugares en esta selección</Text><Pressable onPress={() => setAreaIds(null)}><Text style={s.label}>Ver otras zonas</Text></Pressable></View>}
      </Animated.View>
    </View>
    <DiscoveryNavigation active="map" onExplore={p.onBack} onMap={() => setUiHidden(value => !value)} onParches={() => router.push('/today')} onFeedback={p.onFeedback} onSuggest={p.onSuggest} />
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, zIndex: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: '#d6d6dc', backgroundColor: ui.surface, paddingRight: 4 },
  searchInput: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 999 },
  filter: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.accentSoft, alignItems: 'center', justifyContent: 'center' },
  categories: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { height: 40, paddingHorizontal: 14, gap: 7, borderRadius: 22, backgroundColor: ui.surface, flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '500', color: ui.text },
  area: { alignSelf: 'center', borderRadius: 20, backgroundColor: ui.surface, paddingVertical: 10, paddingHorizontal: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, zIndex: 2, gap: 12 },
  tools: { alignItems: 'flex-end', paddingHorizontal: 16 },
  cards: { paddingHorizontal: 16, gap: 12, paddingRight: 32 },
  badge: { position: 'absolute', right: -5, top: -5, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 4, borderWidth: 2, borderColor: ui.surface, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14, color: ui.surface, fontWeight: '700' },
  empty: { backgroundColor: ui.surface, padding: 20, marginHorizontal: 16, borderRadius: 12, gap: 12 },
});

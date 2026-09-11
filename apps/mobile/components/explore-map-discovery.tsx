import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import type { Spot } from '@/lib/mock-spots';
import { DEFAULT_FILTERS, getContextualSpotCategory, matchesSpotToFilters } from '@/lib/explore-filters';
import { useRelayoutSubscription } from '@/lib/relayout';
import { topContentInset } from '@/lib/layout-insets';

const showSearchThisArea = false;

type MapDiscoveryProps = Pick<ExploreDiscoveryProps, 'spots' | 'mapSearchSpots' | 'selected' | 'activeFiltersCount' | 'locationFilters' | 'onFilters' | 'onCategory' | 'onMapCategory' | 'isSaved' | 'toggleSaved' | 'href'> & {
  onBack: () => void;
  initialBranchId?: string;
  initialBranch?: Spot;
  onReturnToPlace?: () => void;
};

export function ExploreMapDiscovery(p: MapDiscoveryProps) {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showNavigation = !p.onReturnToPlace;
  const [width, setWidth] = useState(390);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedBranch, setSelectedBranch] = useState<Spot>();
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [areaIds, setAreaIds] = useState<string[] | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [areaSuggested, setAreaSuggested] = useState(false);
  const initializedBranch = useRef<string | undefined>(undefined);
  const { userLocation, requestLocation, loading } = useLocationStore();
  const criteria = `${deferredQuery}|${p.selected.join('|')}|${p.activeFiltersCount}|${p.spots.map(spot => spot.id).join(',')}`;
  const previousCriteria = useRef(criteria);
  useEffect(() => {
    if (previousCriteria.current !== criteria) setAreaSuggested(true);
    previousCriteria.current = criteria;
  }, [criteria]);
  const candidates = useMemo(() => {
    const catalog = p.mapSearchSpots ?? p.spots;
    return rankSearchResults(catalog.filter(spot => {
      const branches = [spot, ...(spot.branches ?? [])];
      return Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude) &&
        branches.some(branch => matchesSpotToFilters(branch, DEFAULT_FILTERS, deferredQuery));
    }), deferredQuery, new Date());
  }, [p.spots, p.mapSearchSpots, deferredQuery]);
  const places = useMemo(() => areaIds ? candidates.filter(spot => areaIds.includes(spot.id)) : candidates, [candidates, areaIds]);
  const cardWidth = Math.min(360, width - 32);
  const selected = places.find(spot => spot.id === selectedId);
  const cardSpot = selected && selectedBranch ? { ...selected, ...selectedBranch, branches: undefined } : selected;
  const canShowBranches = (selected?.branchCount ?? selected?.branches?.length ?? 0) > 1;
  useEffect(() => { setAreaIds(null); }, [deferredQuery, p.selected.join('|')]);
  const resultKey = places.map(spot => spot.id).join('|');
  useEffect(() => {
    setSelectedId(undefined);
    setSelectedBranch(undefined);
    setShowAllBranches(false);
  }, [resultKey]);
  const initialPlace = candidates.find(place => place.id === p.initialBranchId || place.branches?.some(branch => branch.id === p.initialBranchId));
  const initialBranch = p.initialBranch ?? initialPlace?.branches?.find(branch => branch.id === p.initialBranchId) ?? initialPlace;
  const hasInitialCoordinates = Number.isFinite(initialBranch?.latitude) && Number.isFinite(initialBranch?.longitude);
  useEffect(() => {
    if (!p.initialBranchId || !initialPlace || !initialBranch || !hasInitialCoordinates || initializedBranch.current === p.initialBranchId) return;
    initializedBranch.current = p.initialBranchId;
    setSelectedId(initialPlace.id);
    setSelectedBranch(initialBranch);
    setShowAllBranches(false);
  }, [p.initialBranchId, initialPlace, initialBranch, hasInitialCoordinates]);
  function select(id: string, branch?: Spot) {
    setSelectedId(id);
    setSelectedBranch(branch);
    setShowAllBranches(false);
  }
  function clearSelection() {
    setSelectedId(undefined);
    setSelectedBranch(undefined);
    setShowAllBranches(false);
  }
  return <View style={s.screen} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={StyleSheet.absoluteFill}>
      <ExploreMap spots={places} initialFocusSpot={initialBranch} onOpenSpot={id => router.push(`/spot/${id}`)} fullscreen selectedSpotId={selected?.id} showAllBranches={showAllBranches} onSelectSpot={select} onVisibleSpotsChange={setVisibleIds} userLocation={userLocation} recenterKey={recenter} locationFocusKey={(p.locationFilters ?? []).join('|')} onBackgroundPress={clearSelection} onUserMove={() => setAreaSuggested(true)} />
    </View>
    <View pointerEvents="box-none" style={[s.top, { top: topContentInset(insets) }]}> 
      <View style={s.headerRow}>
      {p.onReturnToPlace && <AppIconButton name="arrow-back" accessibilityLabel="Volver a la ficha del lugar" tone="light" size={48} onPress={p.onReturnToPlace} />}
      <View style={[s.row, { flex: 1 }]}>
        <View style={s.searchInput}><SearchField value={query} onChangeText={setQuery} placeholder="Busca un lugar" height={48} backgroundColor={ui.surface} showClearButton={!!query} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filtrar lugares en el mapa" onPress={() => p.onFilters(true)} style={s.filter}>
          <Ionicons name="options-outline" size={20} color={ui.text} />
          {!!p.activeFiltersCount && <View style={s.badge}><Text style={s.badgeText}>{p.activeFiltersCount}</Text></View>}
        </Pressable>
      </View>
      </View>
      {p.initialBranchId && !hasInitialCoordinates && p.spots.length > 0 && <View style={s.empty}><Text style={s.label}>La ubicación exacta de esta sede está pendiente.</Text></View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
        {shortcuts.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: p.selected.includes(item.value) }} onPress={() => (p.onMapCategory ?? p.onCategory)(item.value)} style={[s.chip, p.selected.includes(item.value) && { backgroundColor: item.activeBg }]}><CategoryIcon category={item.value} size={18} color={ui.text} /><Text style={s.label}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {showSearchThisArea && areaSuggested && visibleIds && <Pressable accessibilityRole="button" onPress={() => { setAreaSuggested(false); setAreaIds(visibleIds); setSelectedId(undefined); }} style={s.area}><Text style={s.label}>Buscar en esta zona</Text></Pressable>}
    </View>
    <View pointerEvents="box-none" style={[s.bottom, { bottom: Math.max(insets.bottom, 16) + (showNavigation ? 80 : 12) }]}>
      <View pointerEvents="box-none" style={{ gap: 12 }}>
      <View style={s.tools}>
        {canShowBranches && <Pressable accessibilityRole="button" accessibilityState={{ selected: showAllBranches }} accessibilityLabel={showAllBranches ? 'Volver al zoom anterior' : 'Ver todas las sedes de este lugar'} onPress={() => setShowAllBranches(value => !value)} style={[s.branchesButton, showAllBranches && { backgroundColor: ui.accentSoft }]}><Ionicons name={showAllBranches ? 'contract-outline' : 'expand-outline'} size={22} color={ui.text} /></Pressable>}
        <AppIconButton name="locate-outline" accessibilityLabel={loading ? 'Buscando tu ubicación' : 'Centrar en mi ubicación'} tone="light" size={44} onPress={() => { if (!userLocation) requestLocation(); setRecenter(value => value + 1); }} />
      </View>
      <MapSelectionCard spot={cardSpot} displayCategory={cardSpot ? getContextualSpotCategory(cardSpot, p.selected, deferredQuery) : undefined} place={selected} width={cardWidth} saved={p.isSaved} onSave={p.toggleSaved} onOpen={spot => router.push(p.href(spot))} />
      {!places.length && <View style={s.empty}><Text style={s.label}>No hay lugares en esta selección</Text><Pressable onPress={() => setAreaIds(null)}><Text style={s.label}>Ver otras zonas</Text></Pressable></View>}
      </View>
    </View>
    {showNavigation && <DiscoveryNavigation active="map" onExplore={p.onBack} onMap={clearSelection} onParches={() => router.push('/today')} onContribute={() => router.push('/contribute')} onAccount={() => router.push('/account')} />}
  </View>;
}

function MapSelectionCard({ spot, displayCategory, place, width, saved, onSave, onOpen }: {
  spot?: Spot; displayCategory?: string; place?: Spot; width: number;
  saved: ExploreDiscoveryProps['isSaved']; onSave: ExploreDiscoveryProps['toggleSaved']; onOpen: (spot: Spot) => void;
}) {
  const last = useRef<{ spot: Spot; place: Spot; displayCategory?: string } | null>(null);
  if (spot && place) last.current = { spot, place, displayCategory };
  const [mounted, setMounted] = useState(Boolean(spot));
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { alive = false; subscription.remove(); };
  }, []);
  const id = spot?.id;
  useEffect(() => {
    if (id) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: id ? 1 : 0,
      duration: reducedMotion ? 0 : id ? 420 : 240,
      easing: id ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished && !id) setMounted(false); });
    return () => animation.stop();
  }, [id, progress, reducedMotion]);
  const data = last.current;
  if (!mounted || !data) return null;
  return <Animated.View pointerEvents={spot ? 'auto' : 'none'} accessibilityElementsHidden={!spot} importantForAccessibility={spot ? 'auto' : 'no-hide-descendants'} style={[s.selectedCard, { width, opacity: progress, transform: [
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.97, 1] }) },
] }]}><DiscoveryPlaceCard spot={data.spot} displayCategory={data.displayCategory} width={width} bookmarked={saved(data.place.likeTargetId)} onToggleBookmark={() => onSave(data.place.likeTargetId)} onPress={() => onOpen(data.spot)} /></Animated.View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, zIndex: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: ui.border, backgroundColor: ui.surface, paddingRight: 4 },
  searchInput: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 999 },
  filter: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.accentSoft, alignItems: 'center', justifyContent: 'center' },
  categories: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  chip: { height: 40, paddingHorizontal: 14, gap: 7, borderRadius: 22, backgroundColor: ui.surface, flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '500', color: ui.text },
  area: { alignSelf: 'center', borderRadius: 20, backgroundColor: ui.surface, paddingVertical: 10, paddingHorizontal: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, zIndex: 2, gap: 12 },
  tools: { alignItems: 'flex-end', paddingHorizontal: 16, gap: 12, zIndex: 11 },
  branchesButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.surface },
  selectedCard: { alignSelf: 'center', height: 190 },
  badge: { position: 'absolute', right: -5, top: -5, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 4, borderWidth: 2, borderColor: ui.surface, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14, color: ui.surface, fontWeight: '700' },
  empty: { backgroundColor: ui.surface, padding: 20, marginHorizontal: 16, borderRadius: 12, gap: 12 },
});

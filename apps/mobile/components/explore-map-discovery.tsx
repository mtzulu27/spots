import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SpotsIcon as Ionicons } from '@/components/spots-icon';
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
import { DEFAULT_FILTERS, getContextualSpotCategory, isFiltersActive, serializeFilters } from '@/lib/explore-filters';
import { selectMapSearchResults, type MapSearchBounds } from '@/lib/explore-map-search';
import { canPinMapZone, type MapSearchViewport } from '@/lib/map-zone-policy';
import { discoverySurfaceShadow } from '@/lib/discovery-surface';
import { useRelayoutSubscription } from '@/lib/relayout';
import { topContentInset } from '@/lib/layout-insets';

type MapDiscoveryProps = Pick<ExploreDiscoveryProps, 'filters' | 'spots' | 'mapSearchSpots' | 'selected' | 'activeFiltersCount' | 'locationFilters' | 'onFilters' | 'onCategory' | 'onMapCategory' | 'isSaved' | 'toggleSaved' | 'href'> & {
  query?: string;
  onQuery?: (query: string) => void;
  fitResults?: boolean;
  onBack: () => void;
  onHome?: () => void;
  onBackToResults?: () => void;
  initialBranchId?: string;
  initialBranch?: Spot;
  onReturnToPlace?: () => void;
};

export function ExploreMapDiscovery(p: MapDiscoveryProps) {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showNavigation = !p.onReturnToPlace;
  const allowAreaSearch = showNavigation && !p.fitResults && !p.onBackToResults;
  const [width, setWidth] = useState(390);
  const [headerHeight, setHeaderHeight] = useState(112);
  const [localQuery, setLocalQuery] = useState('');
  const query = p.query ?? localQuery;
  const setQuery = p.onQuery ?? setLocalQuery;
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedBranch, setSelectedBranch] = useState<Spot>();
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<MapSearchViewport | null>(null);
  const [areaBounds, setAreaBounds] = useState<MapSearchBounds | null>(null);
  const [frameAllResults, setFrameAllResults] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const canPinZone = canPinMapZone(viewportBounds);
  const initializedBranch = useRef<string | undefined>(undefined);
  const { userLocation, requestLocation, loading } = useLocationStore();
  const criteria = JSON.stringify([deferredQuery, serializeFilters(p.filters ?? DEFAULT_FILTERS)]);
  const hasCriteria = Boolean(deferredQuery.trim()) || isFiltersActive(p.filters ?? DEFAULT_FILTERS);
  const autoFitResults = Boolean(p.fitResults) || (allowAreaSearch && (hasCriteria || frameAllResults) && !areaBounds);
  const resultsFitKey = `${criteria}:${allowAreaSearch && !areaBounds ? 'global' : 'scoped'}`;
  useEffect(() => { if (hasCriteria) setFrameAllResults(true); }, [hasCriteria]);
  const candidates = useMemo(() => {
    const catalog = p.mapSearchSpots ?? p.spots;
    return rankSearchResults(selectMapSearchResults(catalog, p.filters ?? DEFAULT_FILTERS, deferredQuery, userLocation, allowAreaSearch ? areaBounds : null), deferredQuery, new Date(), p.filters?.sortBy);
  }, [p.spots, p.mapSearchSpots, p.filters, deferredQuery, userLocation, allowAreaSearch, areaBounds]);
  const places = candidates;
  const cardWidth = Math.min(360, width - 32);
  const selected = places.find(spot => spot.id === selectedId);
  const cardSpot = selected && selectedBranch ? { ...selected, ...selectedBranch, branches: undefined } : selected;
  const canShowBranches = (selected?.branchCount ?? selected?.branches?.length ?? 0) > 1;
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
  function searchThisArea() {
    if (!viewportBounds || !canPinZone) return;
    const { zoom: _zoom, ...bounds } = viewportBounds;
    setAreaBounds(bounds);
    clearSelection();
  }
  function clearArea() {
    setAreaBounds(null);
    setFrameAllResults(true);
    clearSelection();
  }
  return <View style={s.screen} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={StyleSheet.absoluteFill}>
      <ExploreMap spots={places} initialFocusSpot={initialBranch} fitResults={autoFitResults} resultsFitKey={resultsFitKey} preserveViewport={allowAreaSearch && Boolean(areaBounds)} onViewportChange={allowAreaSearch ? setViewportBounds : undefined} resultsFitInsets={{ top: topContentInset(insets) + headerHeight + 24, bottom: Math.max(insets.bottom, 16) + (showNavigation ? 80 : 12) + 60 }} onOpenSpot={id => router.push(`/spot/${id}`)} fullscreen selectedSpotId={selected?.id} showAllBranches={showAllBranches} onSelectSpot={select} userLocation={userLocation} recenterKey={recenter} locationFocusKey={(p.locationFilters ?? []).join('|')} onBackgroundPress={clearSelection} />
    </View>
    <View pointerEvents="box-none" onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)} style={[s.top, { top: topContentInset(insets) }]}>
      <View style={s.headerRow}>
      {p.onReturnToPlace && <AppIconButton name="arrow-back" accessibilityLabel="Volver a la ficha del lugar" tone="light" size={48} onPress={p.onReturnToPlace} />}
      {!p.onReturnToPlace && p.onBackToResults && <AppIconButton name="arrow-back" accessibilityLabel="Volver a los resultados" tone="light" size={48} onPress={p.onBackToResults} />}
      <View style={[s.row, { flex: 1 }]}>
        <View style={s.searchInput}><SearchField value={query} onChangeText={setQuery} placeholder="Busca un lugar" height={48} backgroundColor={ui.surface} showClearButton={!!query} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filtrar lugares en el mapa" onPress={() => p.onFilters(true, allowAreaSearch ? areaBounds : null)} style={s.filter}>
          <Ionicons name="options-outline" size={20} color={ui.text} />
          {!!p.activeFiltersCount && <View style={s.badge}><Text style={s.badgeText}>{p.activeFiltersCount}</Text></View>}
        </Pressable>
      </View>
      </View>
      {p.initialBranchId && !hasInitialCoordinates && p.spots.length > 0 && <View style={s.empty}><Text style={s.label}>La ubicación exacta de esta sede está pendiente.</Text></View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
        {shortcuts.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: p.selected.includes(item.value) }} onPress={() => (p.onMapCategory ?? p.onCategory)(item.value)} style={[s.chip, p.selected.includes(item.value) && { backgroundColor: item.activeBg }]}><CategoryIcon category={item.value} size={18} color={ui.text} /><Text style={s.label}>{item.label}</Text></Pressable>)}
      </ScrollView>
    </View>
    <View pointerEvents="box-none" style={[s.bottom, { bottom: Math.max(insets.bottom, 16) + (showNavigation ? 80 : 12) }]}>
      <View pointerEvents="box-none" style={{ gap: 12 }}>
      <View style={s.tools}>
        {canShowBranches && <Pressable accessibilityRole="button" accessibilityState={{ selected: showAllBranches }} accessibilityLabel={showAllBranches ? 'Volver al zoom anterior' : 'Ver todas las sedes de este lugar'} onPress={() => setShowAllBranches(value => !value)} style={[s.branchesButton, showAllBranches && { backgroundColor: ui.accentSoft }]}><Ionicons name={showAllBranches ? 'contract-outline' : 'expand-outline'} size={22} color={ui.text} /></Pressable>}
        <AppIconButton name="locate-outline" accessibilityLabel={loading ? 'Buscando tu ubicación' : 'Centrar en mi ubicación'} tone="light" size={44} onPress={() => { if (!userLocation) requestLocation(); setRecenter(value => value + 1); }} />
      </View>
      <MapSelectionCard spot={cardSpot} displayCategory={cardSpot ? getContextualSpotCategory(cardSpot, p.selected, deferredQuery) : undefined} place={selected} width={cardWidth} saved={p.isSaved} onSave={p.toggleSaved} onOpen={spot => router.push(p.href(spot))} />
      {!places.length && <View style={s.empty}><Text accessibilityLiveRegion="polite" style={s.label}>{areaBounds ? 'No hay resultados en esta zona con estos filtros' : 'No hay lugares en esta selección'}</Text></View>}
      {allowAreaSearch && !cardSpot && (areaBounds || canPinZone) && <View pointerEvents="box-none" style={s.areaSearchDock}><Pressable accessibilityRole="button" accessibilityLabel={areaBounds ? 'Desfijar zona' : 'Fijar zona'} accessibilityState={{ selected: Boolean(areaBounds) }} onPress={areaBounds ? clearArea : searchThisArea} hitSlop={6} style={s.areaSearch}><Ionicons name="board-pin" size={14} color={ui.text} /><View style={s.areaLabelSlot}><Text accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={[s.areaSearchLabel, s.areaLabelMeasure]}>Desfijar zona</Text><Text style={[s.areaSearchLabel, s.areaLabelVisible]}>{areaBounds ? 'Desfijar zona' : 'Fijar zona'}</Text></View></Pressable></View>}
      </View>
    </View>
    {showNavigation && <DiscoveryNavigation active="map" onExplore={p.onHome ?? p.onBack} onMap={clearSelection} onParches={() => router.push('/today')} onContribute={() => router.push('/contribute')} onAccount={() => router.push('/account')} />}
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
  areaSearchDock: { minHeight: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  areaSearch: { minHeight: 32, borderRadius: 999, backgroundColor: ui.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, ...discoverySurfaceShadow },
  areaSearchLabel: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: ui.text },
  areaLabelSlot: { position: 'relative' },
  areaLabelMeasure: { opacity: 0 },
  areaLabelVisible: { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, zIndex: 2, gap: 12 },
  tools: { alignItems: 'flex-end', paddingHorizontal: 16, gap: 12, zIndex: 11 },
  branchesButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.surface },
  selectedCard: { alignSelf: 'center', height: 190 },
  badge: { position: 'absolute', right: -5, top: -5, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 4, borderWidth: 2, borderColor: ui.surface, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14, color: ui.surface, fontWeight: '700' },
  empty: { backgroundColor: ui.surface, padding: 20, marginHorizontal: 16, borderRadius: 12, gap: 12 },
});

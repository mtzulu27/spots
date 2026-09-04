import { usePlaceUpdates } from '@/lib/place-updates-store';
import { DiscoveryNavigation } from './discovery-navigation';
import { ExploreGridCard } from './explore-grid-card';
import { GridColumnSelector } from './grid-column-selector';
import { DiscoveryPlaceCard } from './discovery-place-card';
import { useUserPreferences } from '@/lib/user-preferences';
import { ExploreMapDiscovery } from './explore-map-discovery';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryIcon } from './category-icon';
import { Entrance } from './entrance';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAvatar, AppIconButton, SearchField } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { type Spot } from '@/lib/mock-spots';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocationStore } from '@/lib/location-store';
import { getSuggestedZones, rankDiscovery, rankSearchResults } from '@/lib/discovery-ranking';

import { shortcuts } from '@/lib/explore-categories';

export type ExploreDiscoveryProps = {
  resultsMode?: boolean;
  listing?: boolean;
  avatar: string | null;
  name: string;
  query: string;
  onQuery: (value: string) => void;
  onSearchBack?: () => void;
  onFilters: () => void;
  activeFiltersCount?: number;
  onNotifications: () => void;
  onCategory: (value: string) => void;
  selected: string[];
  spots: Spot[];
  searchSpots?: Spot[];
  mapSearchSpots?: Spot[];
  isSaved: (id: string | number) => boolean;
  toggleSaved: (id: string | number) => Promise<void>;
  href: (spot: Spot) => string;
  onAll: () => void;
  onMap: () => void;
  onSuggest: () => void;
  onFeedback?: () => void;
};

export function ExploreDiscovery(p: ExploreDiscoveryProps) {
  const { unreadCount } = usePlaceUpdates();
  const { preferences } = useUserPreferences();
  const params = useLocalSearchParams<{ view?: string }>();
  const [mapOpen, setMapOpen] = useState(params.view === 'map');
  useEffect(() => { if (params.view === 'map') setMapOpen(true); }, [params.view]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Keep the notch outside the scrolling/animated content; CSS responds directly
  // to iOS safe-area changes even when the React inset measurement is stale.
  const safeTopStyle = Platform.OS === 'web'
    ? { paddingTop: 'env(safe-area-inset-top, 0px)' as unknown as number }
    : { paddingTop: insets.top };
  const scroll = useRef<ScrollView>(null);
  const [columns, setColumns] = useState(1);
  const [gridWidth, setGridWidth] = useState(0);
  const [searchWidth, setSearchWidth] = useState(0);
  const [visibleCount, setVisibleCount] = useState(18);
  const [searchFocused, setSearching] = useState(() => p.query.trim().length > 0);
  const searching = searchFocused || Boolean(p.resultsMode);
  const returnedFromSearch = useRef(false);
  const [searchLimit, setSearchLimit] = useState(20);
  useEffect(() => setSearchLimit(20), [p.query]);
  const { userLocation } = useLocationStore();
  const [zone, setZone] = useState('');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const { featured, today: nearby } = useMemo(() => {
    const ranked = rankDiscovery(p.spots, userLocation, zone, now);
    return { ...ranked, today: userLocation ? ranked.today.filter(item => item.distance == null || item.distance <= preferences.radius) : ranked.today };
  }, [p.spots, userLocation, zone, now, preferences.radius]);
  const searchCatalog = p.searchSpots ?? p.spots;
  const deferredSearchQuery = useDeferredValue(p.query);
  const searchRanking = useMemo(() => searching ? rankDiscovery(searchCatalog, userLocation, '', now) : { featured: [], today: [] }, [searching, searchCatalog, userLocation, now]);
  const sortedSearchResults = useMemo(() => searching ? rankSearchResults(searchCatalog, deferredSearchQuery, now) : [], [searching, searchCatalog, deferredSearchQuery, now]);
  const today = p.listing ? [...nearby].sort((a, b) => a.availability - b.availability || (a.spot.feedPriorityRank || Infinity) - (b.spot.feedPriorityRank || Infinity) || (Date.parse(b.spot.createdAt || '') || 0) - (Date.parse(a.spot.createdAt || '') || 0)) : nearby;
  const zones = useMemo(() => getSuggestedZones(p.spots, userLocation), [p.spots, userLocation]);
  const validZone = !zone || zones.includes(zone);
  useEffect(() => {
    if (!validZone) setZone('');
  }, [validZone]);
  const open = (spot: Spot) => router.push(p.href(spot));
  const resultsKey = p.spots.map(spot => spot.id).join('|');
  function renderCards(items: typeof today, columnCount: number, width: number) {
    return (width > 0 && items.map(({ spot, distance, label }, index) => <Entrance key={spot.id} index={index} trigger={`${resultsKey}:${zone}:${columnCount}`} style={{ width: (width - 16 * (columnCount - 1)) / columnCount }}><ExploreGridCard spot={spot} columnCount={columnCount} distance={distance} label={label} bookmarked={p.isSaved(spot.likeTargetId)} onPress={() => router.push(`/spot/${spot.id}`)} onToggleBookmark={() => p.toggleSaved(spot.likeTargetId)} /></Entrance>));
  }
  function renderDiscoveryCards(items: Spot[]) {
    return items.map((spot, index) => <Entrance key={spot.id} index={index} trigger={resultsKey}>
      <DiscoveryPlaceCard spot={spot} now={now} bookmarked={p.isSaved(spot.likeTargetId)} onPress={() => open(spot)} onToggleBookmark={() => p.toggleSaved(spot.likeTargetId)} />
    </Entrance>);
  }
  if (mapOpen) return <ExploreMapDiscovery {...p} onBack={() => setMapOpen(false)} />;
  if (searching) {
    const hasQuery = p.query.trim().length > 0;
    const hasResults = hasQuery || Boolean(p.resultsMode) || (p.activeFiltersCount ?? 0) > 0;
    const results = hasResults ? sortedSearchResults.slice(0, searchLimit) : searchRanking.featured.slice(0, 6);
    return (
      <Entrance style={s.screen} trigger="search">
        <View style={[s.searchHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <AppIconButton name="arrow-back" accessibilityLabel="Volver a explorar" tone="light" size={42} onPress={() => { returnedFromSearch.current = true; setSearching(false); setZone(''); setVisibleCount(18); setSearchLimit(20); p.onQuery(''); p.onSearchBack?.(); }} />
          <View style={[s.search, { flex: 1 }]}>
            <View style={s.searchInput}><SearchField autoFocus={!p.resultsMode} value={p.query} onChangeText={p.onQuery} placeholder="Busca un lugar para hoy" height={48} backgroundColor={ui.surface} showClearButton={hasQuery} /></View>
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.searchResults, { paddingTop: hasResults ? 8 : 16, paddingBottom: insets.bottom + 24 }]}>
          <View style={s.searchTools}>
            <Text accessibilityLiveRegion="polite" style={s.heading}>{hasResults ? `${searchCatalog.length} ${searchCatalog.length === 1 ? 'resultado' : 'resultados'}` : 'Podría interesarte'}</Text>
            <View style={s.searchActions}>
              {hasResults && <GridColumnSelector columns={columns} onChange={setColumns} />}
              <Pressable accessibilityRole="button" accessibilityLabel={p.activeFiltersCount ? `Abrir filtros, ${p.activeFiltersCount} activos` : 'Abrir filtros'} onPress={p.onFilters} style={s.filter}>
                <Ionicons name="options-outline" size={20} color={ui.text} />
                {(p.activeFiltersCount ?? 0) > 0 && <View pointerEvents="none" style={s.filterBadge}><Text style={s.filterBadgeText}>{p.activeFiltersCount}</Text></View>}
              </Pressable>
            </View>
          </View>
          {hasResults ? <View style={s.grid} onLayout={event => setSearchWidth(event.nativeEvent.layout.width)}>{renderCards(results.flatMap(place => {
            const item = searchRanking.today.find(entry => entry.spot.likeTargetId === place.likeTargetId);
            return item ? [item] : rankDiscovery([place], userLocation, '', now).today;
          }), columns, searchWidth)}</View> : <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={s.rail} contentContainerStyle={s.railContent}>{renderDiscoveryCards(results)}</ScrollView>}
          {!results.length && <Text style={s.empty}>{hasResults ? 'No encontramos lugares. Prueba otro nombre, zona o tipo de plan.' : 'Aún no hay lugares para sugerirte.'}</Text>}
          {hasResults && searchCatalog.length > searchLimit && <Pressable accessibilityRole="button" style={s.loadMore} onPress={() => setSearchLimit(value => value + 20)}><Text style={s.placeTitle}>Ver más resultados</Text></Pressable>}
        </ScrollView>
      </Entrance>
    );
  }
  return (
    <View style={[s.screen, safeTopStyle]}><Entrance style={s.screen} trigger="home" disabled={returnedFromSearch.current}>
      <ScrollView ref={scroll} stickyHeaderIndices={p.listing ? undefined : [1]} showsVerticalScrollIndicator={false} contentContainerStyle={[s.page, { paddingTop: 20, paddingBottom: 112 + insets.bottom }]}>
        {p.listing ? <AppIconButton name="arrow-back" accessibilityLabel="Volver a explorar" tone="light" size={42} onPress={() => router.canGoBack() ? router.back() : router.replace('/explore')} /> : <View style={s.profile}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a mi cuenta" onPress={() => router.push('/account')}>
            <AppAvatar uri={p.avatar} size={42} />
          </Pressable>
          <View style={s.profileText}>
            <Text style={s.greeting}>Hola, {p.name}</Text>
            <View style={s.inline}><Ionicons name="location-outline" size={12} color={ui.textSecondary} /><Text style={s.meta}>Cali, Colombia</Text></View>
          </View>
          <View><AppIconButton name="notifications-outline" tone="light" size={42} accessibilityLabel={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`} onPress={p.onNotifications} />{unreadCount > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: ui.surface, fontSize: 10, fontWeight: '600' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}</View>
        </View>}
        {!p.listing && <View style={[s.stickySearch, { paddingTop: 8 }]}>
        <View style={s.search}>
          <View style={s.searchInput}><SearchField onFocus={() => setSearching(true)} value={p.query} onChangeText={p.onQuery} placeholder="Busca un lugar para hoy" height={48} backgroundColor={ui.surface} showClearButton={p.query.length > 0} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={p.activeFiltersCount ? `Abrir filtros, ${p.activeFiltersCount} activos` : 'Abrir filtros'} onPress={p.onFilters} style={s.filter}>
            <Ionicons name="options-outline" size={20} color={ui.text} />
            {(p.activeFiltersCount ?? 0) > 0 && <View pointerEvents="none" style={s.filterBadge}><Text style={s.filterBadgeText}>{p.activeFiltersCount}</Text></View>}
          </Pressable>
        </View>
        </View>}
        {!p.listing && <>
        <View style={s.section}>
          <Text style={s.heading}>¿Qué te provoca?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail} contentContainerStyle={s.shortcuts}>{shortcuts.map(item => {
            const active = p.selected.includes(item.value);
            return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => p.onCategory(item.value)} style={s.shortcut}>
              <View style={[s.circle, active && { backgroundColor: item.activeBg }]}><CategoryIcon category={item.value} size={22} color={ui.text} /></View>
              <Text numberOfLines={1} style={s.shortcutLabel}>{item.label}</Text>
            </Pressable>;
          })}</ScrollView>
        </View>
        <View style={s.section}>
          <View style={s.sectionHead}><Text style={s.heading}>Lugares para descubrir</Text><Pressable onPress={p.onAll} accessibilityRole="button"><Text style={s.more}>Ver todos</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail} contentContainerStyle={s.railContent}>
            {renderDiscoveryCards(featured)}
          </ScrollView>
          {!p.spots.length && <Text style={s.empty}>No encontramos lugares. Prueba otra categoría o ajusta los filtros.</Text>}
        </View>
        </>}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.heading}>{p.listing ? 'Lugares para descubrir' : 'Para visitar hoy'}</Text>
            {!p.listing && <GridColumnSelector columns={columns} onChange={setColumns} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent}>
            {['', ...zones].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: zone === value }} onPress={() => { setZone(value); setVisibleCount(18); }} style={[s.zone, zone === value && s.circleActive]}><Text style={s.meta}>{value || 'Todas las zonas'}</Text></Pressable>)}
          </ScrollView>
          <View style={s.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
            {renderCards(today.slice(0, visibleCount), columns, gridWidth)}
          </View>
          {!today.length && <Text style={s.empty}>No hay lugares en esta zona con los filtros actuales.</Text>}
          {today.length > visibleCount && <Pressable accessibilityRole="button" onPress={() => setVisibleCount(count => count + 18)} style={s.loadMore}><Text style={s.placeTitle}>Mostrar más lugares</Text></Pressable>}
        </View>
      </ScrollView>
      {!p.listing && <DiscoveryNavigation active="explore" onExplore={() => scroll.current?.scrollTo({ y: 0, animated: true })} onMap={() => setMapOpen(true)} onParches={() => router.push('/today')} onFeedback={p.onFeedback} onSuggest={p.onSuggest} />}
    </Entrance></View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  searchResults: { paddingHorizontal: 20, gap: 12 },
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ui.surfaceMuted },
  searchThumbnail: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  page: { paddingHorizontal: 20, gap: 28 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: -12 },
  profileText: { flex: 1, gap: 4 },
  greeting: { fontSize: 18, fontWeight: '600', color: ui.text },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary },
  search: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#d6d6dc', backgroundColor: ui.surface, paddingRight: 4 },
  searchInput: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 999 },
  filter: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stickySearch: { backgroundColor: ui.bg, marginHorizontal: -20, paddingHorizontal: 20, paddingBottom: 8, marginBottom: -12, zIndex: 10 },
  filterBadge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: ui.accent, borderWidth: 2, borderColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: ui.surface, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  section: { gap: 16 },
  zone: { backgroundColor: ui.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  heading: { fontSize: 18, fontWeight: '600', color: ui.text, flexShrink: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  searchTools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: { fontSize: 12, color: ui.textSecondary, paddingVertical: 8 },
  shortcuts: { gap: 8, paddingRight: 20 },
  shortcut: { width: 78, alignItems: 'center', gap: 8, flexShrink: 0 },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: ui.accentSoft },
  shortcutLabel: { fontSize: 11, color: ui.text, textAlign: 'center' },
  rail: { marginRight: -20 },
  railContent: { gap: 12, paddingRight: 20 },
  feature: { width: 250, height: 190 },
  cover: { flex: 1, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  caption: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10, gap: 0 },
  discoveryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: -2 },
  discoveryMetaItem: { flexShrink: 1, minWidth: 0 },
  placeTitle: { fontSize: 15, fontWeight: '600', color: ui.text, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  discoverySave: { width: 22, flexShrink: 0 },
  loadMore: { padding: 16, alignItems: 'center', borderRadius: 20, backgroundColor: ui.surface },
  nav: { position: 'absolute', left: 20, right: 20, height: 68, borderRadius: 34, backgroundColor: ui.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  navButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  navActive: { backgroundColor: ui.accentSoft },
  empty: { fontSize: 14, color: ui.textSecondary, lineHeight: 21 },
});

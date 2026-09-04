import { useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, SearchField } from '@/components/app-ui';
import { ParchesFiltersSheet } from '@/components/parches-filters-sheet';
import { Entrance } from '@/components/entrance';
import { ExploreGridCard } from '@/components/explore-grid-card';
import { GridColumnSelector } from '@/components/grid-column-selector';
import { DiscoveryNavigation } from '@/components/discovery-navigation';
import { accountUi as ui } from '@/lib/account-ui';
import { useSpotsStore } from '@/lib/spots-store';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import { cityDate, matchesEventPeriod, eventTimestamp, normalizeEventQuery, type EventPeriod } from '@/lib/parches';

const periods: [EventPeriod, string][] = [['today', 'Hoy'], ['tomorrow', 'Mañana'], ['weekend', 'Este fin de semana'], ['date', 'Elegir fecha'], ['upcoming', 'Próximos']];
const budgets = [['all', 'Cualquier precio'], ['free', 'Gratis'], ['25000', 'Hasta $25.000'], ['50000', 'Hasta $50.000'], ['100000', 'Hasta $100.000']] as const;
type Criteria = { category: string; zone: string; budget: string };
const noFilters: Criteria = { category: '', zone: '', budget: 'all' };

export default function ParchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { spots, loading, error, refresh } = useSpotsStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useMemo(() => () => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []));
  const today = cityDate(now);
  const [period, setPeriod] = useState<EventPeriod>('today');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sheet, setSheet] = useState<'filters' | 'date' | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Criteria>(noFilters);
  const [draft, setDraft] = useState<Criteria>(noFilters);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [width, setWidth] = useState(0);
  const [limit, setLimit] = useState(18);
  const events = useMemo(() => spots.filter(spot => spot.type === 'event'), [spots]);
  const categories = useMemo(() => [...new Set(events.map(e => e.category).filter(Boolean))].sort(), [events]);
  const zones = useMemo(() => [...new Set(events.map(e => e.neighborhood || e.hubName).filter(Boolean))].sort(), [events]);
  const criteriaCount = Number(Boolean(filters.category)) + Number(Boolean(filters.zone)) + Number(filters.budget !== 'all');
  const matchingEvents = (criteria: Criteria) => {
    const words = normalizeEventQuery(query).split(/\s+/).filter(Boolean);
    return events.filter(event => {
      const haystack = normalizeEventQuery([event.name, event.shortDescription, event.category, event.neighborhood, event.hubName, ...event.tags].join(' '));
      const price = event.ticketPrice ?? (event.minBudget > 0 ? event.minBudget : null);
      return words.every(word => haystack.includes(word)) && (!criteria.category || event.category === criteria.category)
        && (!criteria.zone || (event.neighborhood || event.hubName) === criteria.zone)
        && (criteria.budget === 'all' || (criteria.budget === 'free' ? price === 0 : price !== null && price <= Number(criteria.budget)));
    }).sort((a, b) => (eventTimestamp(a.startsAt) ?? Infinity) - (eventTimestamp(b.startsAt) ?? Infinity));
  };
  const matches = matchingEvents(filters);
  const draftCount = matchingEvents(draft).filter(event => matchesEventPeriod(event, period, date, now)).length;
  const results = matches.filter(event => matchesEventPeriod(event, period, date, now));
  const upcoming = matches.filter(event => matchesEventPeriod(event, 'upcoming', date, now) && eventTimestamp(event.startsAt) !== null);
  const reset = () => { setQuery(''); setFilters(noFilters); setLimit(18); };
  const choosePeriod = (value: EventPeriod) => { if (value === 'date') { setMonth(date.slice(0, 7)); setSheet('date'); } else { setPeriod(value); setLimit(18); } };
  const heading = period === 'today' ? 'Parches para hoy' : period === 'tomorrow' ? 'Parches para mañana' : period === 'weekend' ? 'Este fin de semana' : period === 'date' ? `Parches del ${new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(`${date}T12:00:00-05:00`))}` : 'Próximos parches';
  const monthStart = new Date(`${month}-01T12:00:00-05:00`);
  const offset = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const moveMonth = (amount: number) => { const next = new Date(monthStart); next.setUTCMonth(next.getUTCMonth() + amount); setMonth(cityDate(next).slice(0, 7)); };
  function chip(label: string, selected: boolean, onPress: () => void, key = label) {
    return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.selected]}><Text style={[s.chipLabel, selected && s.selectedLabel]}>{label}</Text></Pressable>;
  }
  return <View style={s.screen}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[s.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 112 }]}>
      <View style={s.header}>
        <AppIconButton name="chevron-back" tone="light" size={42} accessibilityLabel="Volver a Explore" onPress={() => router.replace('/explore')} />
        <Text accessibilityRole="header" style={s.title}>Parches</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={s.search}>
        <View style={s.searchInput}><SearchField value={query} onChangeText={value => { setQuery(value); setLimit(18); }} placeholder="Busca un evento o un plan" height={48} backgroundColor={ui.surface} showClearButton={Boolean(query)} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Filtrar parches${criteriaCount ? `, ${criteriaCount} filtros activos` : ''}`} onPress={() => { setDraft(filters); setSheet('filters'); }} style={s.filter}><Ionicons name="options-outline" size={20} color={ui.text} />{criteriaCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{criteriaCount}</Text></View>}</Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail} contentContainerStyle={s.railContent}>{periods.map(([value, label]) => chip(value === 'date' && period === 'date' ? date.split('-').reverse().slice(0, 2).join('/') : label, period === value, () => choosePeriod(value), value))}</ScrollView>
      {categories.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail} contentContainerStyle={s.railContent}>{chip('Todos', !filters.category, () => { setFilters(f => ({ ...f, category: '' })); setLimit(18); })}{categories.map(category => chip(category, filters.category === category, () => { setFilters(f => ({ ...f, category })); setLimit(18); }))}</ScrollView>}
      <View style={s.section}>
        <View style={s.sectionHeader}><View style={s.sectionCopy}><Text accessibilityRole="header" style={s.title}>{heading}</Text>{results.length > 0 && <Text style={s.meta}>{results.length} {results.length === 1 ? 'evento' : 'eventos'}</Text>}</View>{results.length > 0 && <GridColumnSelector columns={columns} onChange={setColumns} />}</View>
        {loading ? <ActivityIndicator accessibilityLabel="Cargando parches" color={ui.textSecondary} /> : error && !events.length ? <View style={s.empty}><Ionicons name="cloud-offline-outline" size={56} color={ui.textTertiary} /><Text style={s.title}>No pudimos cargar los parches</Text><Text style={s.emptyText}>Revisa tu conexión e inténtalo de nuevo.</Text>{chip('Reintentar', true, () => { void refresh(); })}</View> : !results.length ? <View style={s.empty}>
          <Ionicons name={query || criteriaCount ? 'search-outline' : 'calendar-outline'} size={64} color={ui.textTertiary} />
          <Text style={[s.title, s.center]}>{!events.length ? 'Pronto habrá parches por aquí' : query || criteriaCount ? 'No encontramos ese parche' : 'No hay parches para esta fecha'}</Text>
          <Text style={s.emptyText}>{!events.length ? 'Aquí encontrarás conciertos, ferias, talleres y otros eventos locales cuando estén disponibles.' : query || criteriaCount ? 'Prueba otro nombre, zona o presupuesto.' : 'Prueba otra fecha para descubrir qué viene.'}</Text>
          <View style={s.actions}>{(query || criteriaCount > 0) ? chip('Limpiar búsqueda y filtros', true, reset) : null}{period !== 'upcoming' && events.length > 0 ? chip(upcoming.length ? `Ver próximos (${upcoming.length})` : 'Ver todos los parches', true, () => { setPeriod('upcoming'); setLimit(18); }) : null}</View>
        </View> : <View style={s.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>{width > 0 && results.slice(0, limit).map(event => <Entrance key={event.id} trigger={`${period}:${date}:${columns}`} style={{ width: (width - 16 * (columns - 1)) / columns }}><ExploreGridCard spot={event} columnCount={columns} label="" distance={null} bookmarked={isBookmarked(event.likeTargetId)} onToggleBookmark={() => toggleBookmark(event.likeTargetId)} onPress={() => router.push(`/spot/${event.id}`)} /></Entrance>)}</View>}
        {results.length > limit && chip('Mostrar más parches', false, () => setLimit(value => value + 18))}
      </View>
    </ScrollView>
    <DiscoveryNavigation active="parches" onExplore={() => router.replace('/explore')} onMap={() => router.replace('/explore?view=map')} onParches={() => { setPeriod('today'); reset(); }} onFeedback={() => router.replace('/explore?action=feedback')} onSuggest={() => router.replace('/explore?action=suggest')} />
    {sheet === 'filters' && <ParchesFiltersSheet draft={draft} onChange={setDraft} categories={categories} zones={zones} budgets={budgets} resultsCount={draftCount} onClear={() => setDraft(noFilters)} onClose={() => setSheet(null)} onApply={() => { setFilters(draft); setLimit(18); setSheet(null); }} />}
    <Modal visible={sheet === 'date'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <View style={s.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar panel" style={s.backdrop} onPress={() => setSheet(null)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.sectionHeader}><Text style={s.title}>{'Elige una fecha'}</Text><AppIconButton name="close" tone="light" size={42} accessibilityLabel="Cerrar panel" onPress={() => setSheet(null)} /></View>
          <View style={s.section}>
            <View style={s.sectionHeader}><AppIconButton name="chevron-back" tone="light" size={42} accessibilityLabel="Mes anterior" onPress={() => moveMonth(-1)} /><Text style={s.title}>{new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(monthStart)}</Text><AppIconButton name="chevron-forward" tone="light" size={42} accessibilityLabel="Mes siguiente" onPress={() => moveMonth(1)} /></View>
            <View style={s.calendar}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <View key={index} style={s.day}><Text style={s.meta}>{day}</Text></View>)}{Array.from({ length: offset }, (_, index) => <View key={`space-${index}`} style={s.day} />)}{Array.from({ length: daysInMonth }, (_, index) => { const value = `${month}-${String(index + 1).padStart(2, '0')}`; return <Pressable key={value} disabled={value < today} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{ selected: date === value, disabled: value < today }} onPress={() => { setDate(value); setPeriod('date'); setLimit(18); setSheet(null); }} style={[s.day, date === value && s.selected, value < today && s.disabled]}><Text style={s.chipLabel}>{index + 1}</Text></Pressable>; })}</View>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg }, page: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: ui.text }, meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary },
  search: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#d6d6dc', backgroundColor: ui.surface, paddingRight: 4 }, searchInput: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 999 }, filter: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }, badgeText: { fontSize: 10, color: ui.surface, fontWeight: '700' },
  rail: { marginRight: -20 }, railContent: { paddingRight: 20, gap: 8 }, chip: { minHeight: 42, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: ui.accentSoft }, chipLabel: { fontSize: 12, color: ui.textSecondary }, selectedLabel: { fontWeight: '600', color: ui.text },
  section: { gap: 16 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, sectionCopy: { flex: 1, gap: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  empty: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 24 }, emptyText: { maxWidth: 320, textAlign: 'center', fontSize: 14, lineHeight: 21, color: ui.textSecondary }, center: { textAlign: 'center' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,8,13,0.52)' }, sheet: { maxHeight: '88%', backgroundColor: ui.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 20 }, filterSections: { gap: 16, paddingVertical: 12 }, calendar: { flexDirection: 'row', flexWrap: 'wrap' }, day: { width: '14.285714%', minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.3 },
});

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'react-native';
import type { ExploreDiscoveryProps } from './explore-discovery';
import { ExploreMap } from './explore-map';
import { DiscoveryPlaceCard } from './discovery-place-card';
import { FeedPlacePhoto, getFeedPlaceGrayscaleStyle } from './place-photo';
import { AppAvatar } from './app-ui';
import { FlatSpotsMark } from './spots-logo';
import { CategoryIcon } from './category-icon';
import { SpotsIcon } from './spots-icon';
import { categoryOptions, sortOptions, whenPresetOptions, dayOptions, budgetPresetOptions, peoplePresetOptions, distancePresetOptions } from './filters-sheet';
import { DEFAULT_FILTERS, createSpotFilter, formatApproxBudgetPerPersonLabel, getContextualSpotCategory, serializeFilters, type ExploreFilters } from '@/lib/explore-filters';
import { aggregatePlaceSpotsFromList, getSpotsByTypeFromList, getSpotFeedSubtitle, normalizeCommercialCenterLabel, type Spot } from '@/lib/mock-spots';
import { getDiscoveryStatus, rankSearchResults } from '@/lib/discovery-ranking';
import { isInsideMapArea, type MapSearchBounds } from '@/lib/explore-map-search';
import { canPinMapZone, type MapSearchViewport } from '@/lib/map-zone-policy';
import { fixedZoneForAction } from '@/lib/desktop-explore-policy';
import { useSpotsStore } from '@/lib/spots-store';
import { useLocationStore } from '@/lib/location-store';
import { usePlaceUpdates } from '@/lib/place-updates-store';
import { registeredCommercialCenters } from '@/lib/commercial-centers';
import { accountUi as ui } from '@/lib/account-ui';
import { shortcuts } from '@/lib/explore-categories';
import './desktop-explore.css';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(x => x !== value) : [...values, value];
const categoryRail = shortcuts.flatMap(shortcut => categoryOptions.filter(option => option.label === shortcut.value));
const selectedMapInsets = { top: 24, bottom: 224 + 80 + 24 };
type Option = {
    label: string;
    value: string;
};
function Glyph({ name, size = 18 }: {
    name: ComponentProps<typeof SpotsIcon>['name'];
    size?: number;
}) { return <SpotsIcon name={name} size={size} color="currentColor"/>; }
function Pills({ options, selected, onSelect, limit = 8, disabled = false }: {
    options: Option[];
    selected: string[];
    onSelect: (value: string) => void;
    limit?: number;
    disabled?: boolean;
}) {
    const [all, setAll] = useState(false);
    return <><div className="sde-pills">{(all ? options : options.slice(0, limit)).map(x => <button key={x.value} disabled={disabled} aria-pressed={selected.includes(x.value)} onClick={() => onSelect(x.value)}>{x.label}</button>)}</div>{options.length > limit && <button className="sde-text-action" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Ver menos' : 'Ver todos'}</button>}</>;
}
function PlaceCard({ spot, selected, saved, onSelect, onOpen, onSave, category }: {
    spot: Spot;
    selected: boolean;
    saved: boolean;
    onSelect: () => void;
    onOpen: () => void;
    onSave: () => void;
    category: string;
}) {
    const now = new Date(), status = getDiscoveryStatus(spot, now);
    const [failedLogo, setFailedLogo] = useState<string>();
    return <article className={'sde-card' + (selected ? ' is-selected' : '')}>
    <button className="sde-card-image" aria-label={'Ubicar ' + (spot.brandName || spot.name) + ' en el mapa'} onClick={onSelect}>
      <FeedPlacePhoto spot={spot} now={now} style={{ width: '100%', height: '100%' }}/>
      {spot.logoUrl && failedLogo !== spot.logoUrl && <span className="sde-card-logo"><Image source={{ uri: spot.logoUrl }} resizeMode="contain" style={[{ width: '100%', height: '100%' }, getFeedPlaceGrayscaleStyle(spot, now)]} onError={() => setFailedLogo(spot.logoUrl)}/></span>}
    </button>
    <div className="sde-card-title"><CategoryIcon category={category} size={18} color={ui.textSecondary}/><button onClick={onOpen}>{spot.brandName || spot.name}</button><button className="sde-save" aria-label={(saved ? 'Quitar de guardados ' : 'Guardar ') + (spot.brandName || spot.name)} aria-pressed={saved} onClick={onSave}><Glyph name={saved ? 'heart' : 'heart-outline'} size={20}/></button></div>
    <div className="sde-card-meta"><span title={status.label}><i style={{ background: status.availability === 0 ? '#26834a' : status.label === 'Abre en la próxima hora' ? '#a56a12' : '#8b8b94' }}/>{status.label === 'Abierto ahora' ? 'Abierto' : status.label === 'Cerrado ahora' ? 'Cerrado' : status.label === 'Abre en la próxima hora' ? 'Abre pronto' : status.label}</span><span><Glyph name="location-outline" size={13}/>{getSpotFeedSubtitle(spot)}</span><span><Glyph name="wallet-outline" size={13}/>{formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget, spot.typicalBudget, spot.budgetPilot, spot.budgetBasis, false).replace(' COP', '')}</span></div>
  </article>;
}
export function DesktopExplore(p: ExploreDiscoveryProps) {
    const router = useRouter();
    const { spots, loading: catalogLoading, error: catalogError, refresh } = useSpotsStore();
    const { userLocation, locationLabel, requestLocation, loading: locating, error: locationError } = useLocationStore();
    const { unreadCount } = usePlaceUpdates();
    const [filters, setFilters] = useState(p.filters ?? DEFAULT_FILTERS);
    const deferredQuery = useDeferredValue(p.query), deferredFilters = useDeferredValue(filters);
    const [area, setArea] = useState<MapSearchBounds | null>(null), [viewport, setViewport] = useState<MapSearchViewport | null>(null);
    const [selectedId, setSelectedId] = useState<string>(), [selectedBranch, setSelectedBranch] = useState<Spot>(), [focusSpot, setFocusSpot] = useState<Spot>();
    const [showBranches, setShowBranches] = useState(false), [recenter, setRecenter] = useState(0), [frameNonce, setFrameNonce] = useState(0), [focusKey, setFocusKey] = useState(0);
    const [advancedWhen, setAdvancedWhen] = useState(false), [advancedDistance, setAdvancedDistance] = useState(false), [locationSearch, setLocationSearch] = useState('');
    const [mapWidth, setMapWidth] = useState(500), [renderLimit, setRenderLimit] = useState(40);
    const mapRef = useRef<HTMLElement>(null), listRef = useRef<HTMLElement>(null);
    useEffect(() => setFilters(p.filters ?? DEFAULT_FILTERS), [p.filters]);
    useEffect(() => {
        const timer = window.setTimeout(() => { router.setParams({ query: p.query }); }, 450);
        return () => window.clearTimeout(timer);
    }, [p.query, router]);
    useEffect(() => {
        if (!mapRef.current)
            return;
        const observer = new ResizeObserver(([entry]) => setMapWidth(entry.contentRect.width));
        observer.observe(mapRef.current);
        return () => observer.disconnect();
    }, []);
    const catalog = useMemo(() => getSpotsByTypeFromList(spots, 'place'), [spots]);
    const results = useMemo(() => {
        const match = createSpotFilter(deferredFilters, deferredQuery, userLocation);
        // Apply every condition to individual sedes before grouping the visible brands.
        const branches = catalog.flatMap(s => s.branches?.length ? s.branches : [s]);
        return rankSearchResults(aggregatePlaceSpotsFromList(branches.filter(s => (!area || isInsideMapArea(s, area)) && match(s))), deferredQuery, new Date(), deferredFilters.sortBy, p.getLikesCount);
    }, [catalog, deferredFilters, deferredQuery, userLocation, area, p.getLikesCount]);
    const mapResults = useMemo(() => results.filter(s => (s.branches?.length ? s.branches : [s]).some(b => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))), [results]);
    const resultKey = results.map(s => s.id).join('|');
    const criteria = JSON.stringify([deferredQuery, serializeFilters(deferredFilters)]);
    useEffect(() => { setSelectedId(undefined); setSelectedBranch(undefined); setShowBranches(false); setFocusSpot(undefined); setRenderLimit(40); }, [resultKey]);
    const selected = results.find(s => s.id === selectedId);
    const cardSpot = selected && selectedBranch ? { ...selected, ...selectedBranch, branches: undefined } : selected;
    const canPin = canPinMapZone(viewport), cardWidth = Math.max(240, Math.min(360, mapWidth - 110));
    const primary = categoryOptions.find(c => c.filterTokens.some(token => filters.interests.includes(token))) ?? categoryOptions.find(c => c.subcategories.some(s => filters.interests.includes(s.value)));
    const related = Array.from(new Map((primary?.momentOptions ?? []).filter(m => filters.interests.includes(m.value)).flatMap(m => primary?.relatedOptionsByMoment?.[m.value] ?? []).map(x => [x.value, x])).values());
    const locations = useMemo(() => {
        const zones = new Map<string, string>(), malls = new Map<string, Set<string>>();
        const match = createSpotFilter({ ...deferredFilters, hubName: [] }, deferredQuery, userLocation);
        catalog.forEach(s => { if (!match(s) || area && !isInsideMapArea(s, area))
            return; const zone = s.neighborhood.trim(), mall = normalizeCommercialCenterLabel(s.hubName.trim()); if (zone) {
            const key = normalize(zone);
            if (!zones.has(key) || /[^\x00-\x7F]/.test(zone))
                zones.set(key, zone);
        } if (mall) {
            const set = malls.get(mall) ?? new Set();
            if (zone)
                set.add(zone);
            malls.set(mall, set);
        } });
        registeredCommercialCenters.forEach(c => { const set = malls.get(c.name) ?? new Set(); set.add(c.neighborhood); malls.set(c.name, set); });
        return { zones: [...zones.values()].sort((a, b) => a.localeCompare(b, 'es')), malls: [...malls].sort(([a], [b]) => a.localeCompare(b, 'es')) };
    }, [catalog, deferredFilters, deferredQuery, userLocation, area]);
    const selectedZones = filters.hubName.filter(v => v.startsWith('zone|||')).map(v => v.slice(7));
    const locationNeedle = normalize(locationSearch);
    function apply(next: ExploreFilters) { setFilters(next); startTransition(() => p.onApplyFilters?.(next)); }
    function patch(next: Partial<ExploreFilters>) { apply({ ...filters, ...next }); }
    function clearSelection() { setSelectedId(undefined); setSelectedBranch(undefined); setShowBranches(false); setFocusSpot(undefined); }
    function clear() {
        setArea(null);
        clearSelection();
        setLocationSearch('');
        const defaults = { ...DEFAULT_FILTERS, interests: [], hubName: [], days: [] };
        setFilters(defaults);
        if (p.onHome) p.onHome();
        else {
            p.onQuery('');
            p.onApplyFilters?.(defaults);
        }
        setFrameNonce(n => n + 1);
        listRef.current?.scrollTo({ top: 0 });
    }
    function chooseCategory(key: string) { const option = categoryOptions.find(c => c.key === key)!; patch({ interests: primary?.key === key ? [] : [...option.filterTokens] }); }
    function chooseSubcategory(value: string) {
        const momentValues = new Set(primary?.momentOptions?.map(x => x.value) ?? []);
        const values = momentValues.has(value) ? filters.interests.filter(x => !momentValues.has(x)) : filters.interests;
        patch({ interests: filters.interests.includes(value) ? values.filter(x => x !== value) : [...values, value] });
    }
    function chooseWhen(value: string) { const active = value === 'now' ? filters.openNowOnly : value === 'weekend' ? filters.days.length === 2 && filters.days.includes('Sab') && filters.days.includes('Dom') : filters.days.includes('Festivos'); patch({ openNowOnly: !active && value === 'now', days: active || value === 'now' ? [] : value === 'weekend' ? ['Sab', 'Dom'] : ['Festivos'], time: '', period: '' }); }
    function chooseLocation(value: string) { const next = toggle(filters.hubName, value); patch({ hubName: value.startsWith('zone|||') ? next.filter(v => !v.startsWith('mall|||')) : next }); }
    function select(id: string, branch?: Spot) { setSelectedId(id); setSelectedBranch(branch); setShowBranches(false); if (branch)
        setFocusSpot(undefined); }
    function locatePlace(spot: Spot) { select(spot.id); const branch = spot.branches?.find(b => Number.isFinite(b.latitude) && Number.isFinite(b.longitude)) ?? spot; if (Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude)) {
        setFocusSpot(branch);
        setFocusKey(n => n + 1);
    }
    else
        router.push(p.href(spot) as never); }
    function pin() { setArea(fixedZoneForAction(area, viewport, canPin)); clearSelection(); setFrameNonce(n => n + 1); }
    const pending = p.query !== deferredQuery || filters !== deferredFilters;
    const activeCount = [filters.interests.length, filters.hubName.length, filters.people, filters.openNowOnly, filters.days.length, filters.time, filters.minBudget !== 0 || filters.maxBudget !== DEFAULT_FILTERS.maxBudget, filters.distance !== DEFAULT_FILTERS.distance].filter(Boolean).length;
    const budgetIndex = budgetPresetOptions.findIndex(x => filters.minBudget === x.min && filters.maxBudget === x.max);
    return <div className="spots-desktop-explore" style={{ '--sde-bg': ui.bg, '--sde-surface': ui.surface, '--sde-ink': ui.text, '--sde-secondary': ui.textSecondary, '--sde-muted': ui.textTertiary, '--sde-border': ui.border } as CSSProperties}>
    <header className="sde-header">
      <button className="sde-brand" aria-label="Spots, volver a Explorar" onClick={clear}><FlatSpotsMark color="#EF3857" width={28} height={37}/></button>
      <form className="sde-search" role="search" onSubmit={e => { e.preventDefault(); router.setParams({ query: p.query }); listRef.current?.scrollTo({ top: 0 }); }}><Glyph name="search-outline"/><input aria-label="Buscar lugares" placeholder="Busca un lugar para hoy" value={p.query} onChange={e => p.onQuery(e.target.value)}/>{p.query && <button type="button" aria-label="Borrar búsqueda" onClick={() => p.onQuery('')}><Glyph name="close" size={16}/></button>}</form>
      <span className="sde-header-location"><Glyph name="location-outline" size={13}/>{locationLabel || 'Cali y alrededores'}</span>
      <nav aria-label="Principal">{[{ label: 'Explorar', icon: 'home-outline', action: clear }, { label: 'Parches', icon: 'ticket-outline', action: () => router.push('/today') }, { label: 'Contribuir', icon: 'chatbox-ellipses-outline', action: () => router.push('/contribute') }].map((item, i) => <button key={item.label} aria-label={item.label} aria-current={i === 0 ? 'page' : undefined} className={i === 0 ? 'active' : ''} onClick={item.action}><Glyph name={item.icon as ComponentProps<typeof SpotsIcon>['name']} size={20}/><span className="sde-nav-label"><span>{item.label}</span></span></button>)}</nav>
      <button className="sde-round sde-bell" aria-label={'Notificaciones' + (unreadCount ? ', ' + unreadCount + ' sin leer' : '')} onClick={p.onNotifications}><Glyph name="notifications-outline" size={20}/>{unreadCount > 0 && <i />}</button>
      <button className="sde-profile" aria-label="Ir a mi cuenta" onClick={() => router.push('/account')}><AppAvatar uri={p.avatar} size={34}/><span className="sde-profile-label"><span><strong>Hola, {p.name || 'parce'}</strong><small><Glyph name="location-outline" size={12}/>{locationLabel || 'Cali y alrededores'}</small></span></span></button>
    </header>
    <div className="sde-categories" role="group" aria-label="Categorías">{categoryRail.map(c => <button key={c.key} aria-pressed={primary?.key === c.key} onClick={() => chooseCategory(c.key)}><CategoryIcon category={c.label} size={18} color={ui.text}/><span>{c.label}</span></button>)}</div>
    <main className="sde-workspace">
      <aside className="sde-filters" aria-label="Filtros de lugares"><h2>Filtros</h2><div className="sde-filter-scroll">
        <section><h3>Disponibilidad</h3>{!advancedWhen ? <><div className="sde-pills">{whenPresetOptions.map(x => <button key={x.value} aria-pressed={x.value === 'now' ? filters.openNowOnly : x.value === 'weekend' ? filters.days.includes('Sab') && filters.days.includes('Dom') : filters.days.includes('Festivos')} onClick={() => chooseWhen(x.value)}>{x.label}</button>)}</div><button className="sde-text-action" onClick={() => setAdvancedWhen(true)}>Búsqueda avanzada</button></> : <><div className="sde-days">{dayOptions.filter(x => x.value !== 'Any' && x.value !== 'Festivos').map(x => <button key={x.value} aria-label={x.label} aria-pressed={filters.days.includes(x.value)} onClick={() => patch({ days: toggle(filters.days, x.value), openNowOnly: false })}>{x.shortLabel}</button>)}</div><div className="sde-time"><input aria-label="Hora" placeholder="7:00" value={filters.time} disabled={!filters.days.length} onChange={e => patch({ time: e.target.value, period: filters.period || 'PM', openNowOnly: false })}/>{(['AM', 'PM'] as const).map(period => <button disabled={!filters.days.length} key={period} aria-pressed={filters.period === period} onClick={() => patch({ period })}>{period}</button>)}<button onClick={() => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date()); const get = (key: string) => parts.find(p => p.type === key)?.value || ''; const codes: Record<string, string> = { Sun: 'Dom', Mon: 'Lun', Tue: 'Mar', Wed: 'Mie', Thu: 'Jue', Fri: 'Vie', Sat: 'Sab' }; patch({ time: get('hour') + ':' + get('minute'), period: get('dayPeriod') as 'AM' | 'PM', days: filters.days.length ? filters.days : [codes[get('weekday')]], openNowOnly: false }); }}>Hora actual</button></div><button className="sde-text-action" onClick={() => setAdvancedWhen(false)}>Volver a sugeridos</button></>}</section>
        {primary && <section><h3>{primary.momentOptions ? 'Momentos' : 'Subcategorías'}</h3><Pills key={primary.key} options={primary.momentOptions ?? primary.subcategories} selected={filters.interests} onSelect={chooseSubcategory}/>{related.length > 0 && <><h4>Relacionadas</h4><Pills options={related} selected={filters.interests} onSelect={chooseSubcategory}/></>}</section>}
        <section><h3>Ubicación</h3><div className="sde-location-search"><Glyph name="search-outline" size={16}/><input aria-label="Buscar sector o mall" placeholder="Buscar sector o mall" value={locationSearch} onChange={e => setLocationSearch(e.target.value)}/></div><h4>Sectores</h4><Pills options={locations.zones.filter(x => normalize(x).includes(locationNeedle)).map(label => ({ label, value: 'zone|||' + label }))} selected={filters.hubName} onSelect={chooseLocation}/><h4>Centro comercial o mall</h4><Pills options={locations.malls.filter(([label, sectors]) => (!selectedZones.length || selectedZones.some(s => [...sectors].some(zone => normalize(zone) === normalize(s)))) && normalize(label).includes(locationNeedle)).map(([label]) => ({ label, value: 'mall||||||' + label }))} selected={filters.hubName} onSelect={chooseLocation} limit={6}/></section>
        <section><h3>Presupuesto / persona</h3><div className="sde-pills sde-budget"><button aria-pressed={filters.minBudget === 0 && filters.maxBudget === DEFAULT_FILTERS.maxBudget} onClick={() => patch({ minBudget: 0, maxBudget: DEFAULT_FILTERS.maxBudget })}>Todos</button>{budgetPresetOptions.map((x, i) => <button key={x.label} aria-pressed={budgetIndex === i} onClick={() => patch({ minBudget: x.min, maxBudget: x.max })}>{x.label}</button>)}</div></section>
        <section><h3>Personas</h3><div className="sde-pills">{peoplePresetOptions.map(x => <button key={x.value} aria-pressed={filters.people === x.value} onClick={() => patch({ people: filters.people === x.value ? 0 : x.value })}>{x.label}</button>)}</div></section>
        <section><h3>Distancia</h3>{!userLocation && <button className="sde-text-action" onClick={requestLocation}>Activar mi ubicación</button>}{locationError && <p role="status">{locationError}</p>}{!advancedDistance ? <><div className="sde-pills">{distancePresetOptions.map(x => <button disabled={!userLocation} key={x.value} aria-pressed={filters.distance === x.value} onClick={() => patch({ distance: filters.distance === x.value ? DEFAULT_FILTERS.distance : x.value })}>{x.label}</button>)}</div><button className="sde-text-action" onClick={() => setAdvancedDistance(true)}>Búsqueda avanzada</button></> : <><label htmlFor="sde-distance">{filters.distance === 50 ? 'Cualquier distancia' : 'Hasta ' + Math.abs(filters.distance) + ' km'}</label><input id="sde-distance" type="range" min={1} max={50} disabled={!userLocation} value={Math.abs(filters.distance)} onChange={e => patch({ distance: Number(e.target.value) })}/><button className="sde-text-action" onClick={() => setAdvancedDistance(false)}>Volver a sugeridos</button></>}</section>
      </div><div className="sde-filter-footer"><button onClick={clear}>Limpiar {activeCount > 0 ? '(' + activeCount + ')' : ''}</button><button className="sde-apply" onClick={() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>Mostrar {results.length} {results.length === 1 ? 'resultado' : 'resultados'}</button></div></aside>
      <section className="sde-results" aria-label="Resultados de lugares" ref={listRef} aria-busy={pending || catalogLoading} onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400)
        setRenderLimit(n => Math.min(n + 30, results.length)); }}>
        <div className="sde-results-toolbar"><p className="sde-count" aria-live="polite">{catalogLoading && !results.length ? 'Cargando lugares…' : results.length + ' ' + (results.length === 1 ? 'lugar' : 'lugares')}{area ? ' en la zona fijada' : ''}</p><label className="sde-sort-select"><select aria-label="Ordenar lugares" value={filters.sortBy} onChange={e => patch({ sortBy: e.target.value as ExploreFilters['sortBy'] })}>{filters.sortBy === 'relevance' && <option value="relevance">Relevancia</option>}{sortOptions.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select><Glyph name="chevron-down" size={13}/></label></div>
        {catalogError && <div className="sde-error" role="status"><p>{catalogError}</p><button onClick={() => void refresh().catch(() => {})}>Reintentar</button></div>}
        {results.slice(0, renderLimit).map(spot => <PlaceCard key={spot.id} spot={spot} category={getContextualSpotCategory(spot, filters.interests, deferredQuery)} selected={selectedId === spot.id} saved={p.isSaved(spot.likeTargetId)} onSave={() => void p.toggleSaved(spot.likeTargetId)} onOpen={() => router.push(p.href(spot) as never)} onSelect={() => locatePlace(spot)}/>)}
        {!catalogLoading && !results.length && <div className="sde-empty"><Glyph name="search-outline" size={28}/><h3>{area ? 'No hay resultados en esta zona' : 'No encontramos ese parche'}</h3><p>{area ? 'Cambia la búsqueda o usa Desfijar zona en el mapa para ampliar los resultados.' : 'Prueba con otra búsqueda o ajusta los filtros.'}</p>{!area && <button onClick={clear}>Limpiar filtros</button>}</div>}
        <footer>© {new Date().getFullYear()} Spots</footer>
      </section>
      <section className="sde-map" aria-label="Mapa de lugares" ref={mapRef}>
        <ExploreMap spots={mapResults} fullscreen desktopZoomControls fitResults={!area && !focusSpot} resultsFitKey={criteria + ':' + frameNonce} preserveViewport={Boolean(area)} resultsFitInsets={{ top: 44, bottom: 90 }} selectionInsets={selectedMapInsets} onViewportChange={setViewport} selectedSpotId={selectedId} initialFocusSpot={focusSpot} focusKey={focusKey} onSelectSpot={select} showAllBranches={showBranches} userLocation={userLocation} recenterKey={recenter} locationFocusKey={filters.hubName.join('|')} onOpenSpot={id => router.push(('/spot/' + id) as never)} onBackgroundPress={clearSelection}/>
        <div className="sde-map-actions">{(selected?.branchCount ?? selected?.branches?.length ?? 0) > 1 && <button className="sde-round" aria-label={showBranches ? 'Volver al zoom anterior' : 'Ver todas las sedes de este lugar'} aria-pressed={showBranches} onClick={() => setShowBranches(v => !v)}><Glyph name={showBranches ? 'contract-outline' : 'expand-outline'} size={20}/></button>}<button className="sde-round" disabled={locating} aria-label={locating ? 'Buscando tu ubicación' : 'Centrar en mi ubicación'} onClick={() => { if (!userLocation)
        requestLocation(); setRecenter(n => n + 1); }}><Glyph name="locate-outline" size={20}/></button></div>
        {cardSpot && selected && <div className="sde-map-card" style={{ width: cardWidth }}><button className="sde-card-close sde-round" aria-label="Cerrar selección" onClick={clearSelection}><Glyph name="close" size={16}/></button><DiscoveryPlaceCard spot={cardSpot} displayCategory={getContextualSpotCategory(cardSpot, filters.interests, deferredQuery)} width={cardWidth} height={224} bookmarked={p.isSaved(selected.likeTargetId)} onToggleBookmark={() => p.toggleSaved(selected.likeTargetId)} onPress={() => router.push(p.href(cardSpot) as never)}/></div>}
        {!selected && (area || canPin) && <div className="sde-pin-dock"><button className="sde-pin" aria-label={area ? 'Desfijar zona' : 'Fijar zona'} aria-pressed={Boolean(area)} onClick={pin}><Glyph name="board-pin" size={14}/><span>{area ? 'Desfijar zona' : 'Fijar zona'}</span></button></div>}
      </section>
    </main>
  </div>;
}

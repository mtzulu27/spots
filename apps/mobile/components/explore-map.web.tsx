import { getCategoryLabel } from '@/lib/category-icons';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
// Leaflet is already used by the web map; this workspace has no Leaflet declarations.
// @ts-expect-error Missing upstream declarations in the current workspace.
import { Browser, divIcon, latLngBounds } from 'leaflet';
import { createPortal } from 'react-dom';
import { CategoryIcon } from './category-icon';
import { separateMapMarkers } from '@/lib/map-marker-layout';
import 'leaflet/dist/leaflet.css';
import { getBranchLocationLabel, type Spot } from '@/lib/mock-spots';
import { getOpenStatusFromSchedule } from '@/lib/schedule-status';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
// Bump after publishing style changes so browsers request fresh raster tiles.
const mapboxStyleRevision = '20260904-labels';
const mapboxTiles = `https://api.mapbox.com/styles/v1/mtzulu27/cmtnipajy00hc01s20uyd89lz/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}&v=${mapboxStyleRevision}`;

// Use Leaflet's pointer-to-touch adapter so map gestures do not also enter
// React Native Web's native-touch responder on iOS/Android browsers.
if (typeof window !== 'undefined' && window.PointerEvent) Browser.touchNative = false;

type ExploreMapProps = {
  spots: Spot[];
  onOpenSpot: (spotId: string) => void;
  onVisibleSpotsChange?: (spotIds: string[]) => void;
  fullscreen?: boolean;
  selectedSpotId?: string;
  initialFocusSpot?: Spot;
  focusKey?: number;
  showAllBranches?: boolean;
  onSelectSpot?: (id: string, branch?: Spot) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  recenterKey?: number;
  locationFocusKey?: string;
  onBackgroundPress?: () => void;
  onUserMove?: () => void;
};

export function ExploreMap({ spots, onOpenSpot, onVisibleSpotsChange, fullscreen, selectedSpotId, initialFocusSpot, focusKey, showAllBranches, onSelectSpot, userLocation, recenterKey, locationFocusKey, onBackgroundPress, onUserMove }: ExploreMapProps) {
  const WebMapContainer = MapContainer as any;
  const WebTileLayer = TileLayer as any;
  const WebCircleMarker = CircleMarker as any;
  const WebTooltip = Tooltip as any;
  const branches = useMemo(() => spots.flatMap(place => (place.branches?.length ? place.branches : [place]).filter(branch => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude)).map(branch => ({ branch, placeId: place.id }))), [spots]);

  const mappedSpots = useMemo(
    () =>
      spots.filter(
        (spot) => typeof spot.latitude === 'number' && typeof spot.longitude === 'number',
      ),
    [spots],
  );

  const center = useMemo<[number, number]>(() => {
    if (!mappedSpots.length) {
      return [3.4516, -76.5320];
    }

    const latitudeAverage =
      mappedSpots.reduce((sum, spot) => sum + (spot.latitude ?? 0), 0) / mappedSpots.length;
    const longitudeAverage =
      mappedSpots.reduce((sum, spot) => sum + (spot.longitude ?? 0), 0) / mappedSpots.length;

    return [latitudeAverage, longitudeAverage];
  }, [mappedSpots]);

  if (!mappedSpots.length && !fullscreen) {
    return (
      <div style={emptyStateStyle}>
        <h3 style={emptyTitleStyle}>No hay spots ubicables todavía</h3>
        <p style={emptyCopyStyle}>
          Completa latitude y longitude de más lugares para usar el mapa con precisión.
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...shellStyle, ...(fullscreen ? { borderRadius: 0, border: 0, position: 'relative', zIndex: 0 } : {}) }}>
      <WebMapContainer
        center={Number.isFinite(initialFocusSpot?.latitude) && Number.isFinite(initialFocusSpot?.longitude)
          ? [initialFocusSpot!.latitude!, initialFocusSpot!.longitude!]
          : userLocation
            ? [userLocation.latitude, userLocation.longitude]
            : center}
        zoom={Number.isFinite(initialFocusSpot?.latitude) && Number.isFinite(initialFocusSpot?.longitude)
          ? 19
          : userLocation
            ? 16
            : fullscreen ? 14 : 12}
        scrollWheelZoom
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={100}
        bounceAtZoomLimits={false}
        zoomControl={!fullscreen}
        style={mapStyle}
        className={fullscreen ? 'spots-discovery-map' : undefined}
      >
        <VisibleSpotsSync spots={mappedSpots} onVisibleSpotsChange={onVisibleSpotsChange} />
        <SelectionSync spot={mappedSpots.find(spot => spot.id === selectedSpotId)} showAllBranches={showAllBranches} userLocation={userLocation} recenterKey={recenterKey} />
        <LocationFilterSync spots={mappedSpots} locationFocusKey={locationFocusKey} />
        <InitialPlaceFocus spot={initialFocusSpot} />
        <InitialUserLocationFocus userLocation={userLocation} disabled={Boolean(initialFocusSpot)} />
        <ZoomIndicator />
        <MapInteractions onBackgroundPress={onBackgroundPress} onUserMove={onUserMove} />
        {userLocation && <WebCircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3988ef', fillOpacity: 1 }} interactive={false} />}
        <WebTileLayer
          attribution={mapboxToken ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/">Improve this map</a>' : '&copy; OpenStreetMap contributors'}
          url={mapboxToken ? mapboxTiles : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          tileSize={mapboxToken ? 512 : 256}
          zoomOffset={mapboxToken ? -1 : 0}
          maxZoom={22}
          maxNativeZoom={mapboxToken ? 22 : 19}
        />
        {fullscreen && <style>{`
          .spots-discovery-map .leaflet-tile-pane { filter: ${mapboxToken ? 'none' : 'grayscale(1) contrast(.65) brightness(1.2)'}; transition: filter 360ms ease; }
          :root[data-spots-theme="dark"] .spots-discovery-map .leaflet-tile-pane { filter: grayscale(1) invert(.9) contrast(.72) brightness(.72); }
          .spots-category-marker { border: 0; background: none; }
          @keyframes spots-marker-enter {
            from { opacity: 0; transform: scale(.45); }
            to { opacity: 1; transform: scale(1); }
          }
          .spots-category-marker > div > div {
            animation: spots-marker-enter 320ms cubic-bezier(.22,1,.36,1) both;
            animation-delay: var(--marker-delay, 0ms);
            transform-origin: center;
            transition: background-color 280ms ease, box-shadow 280ms ease;
          }
          @media (prefers-reduced-motion: reduce) {
            .spots-category-marker > div > div { animation: none; transition: none; }
          }
          .spots-place-tooltip.leaflet-tooltip {
            margin-top: 0;
            padding: 8px 10px;
            border: 0;
            border-radius: 10px;
            box-shadow: 0 3px 12px rgba(20, 20, 23, .16);
            font-family: Montserrat, sans-serif;
          }
          .spots-place-tooltip.leaflet-tooltip-bottom::before { border-bottom-color: var(--spots-surface, #fff); }
          .spots-place-tooltip.leaflet-tooltip { background: var(--spots-surface, #fff); color: var(--spots-text, #141417); }
        `}</style>}
        {fullscreen && <ClusteredPlaces branches={branches} selectedSpotId={selectedSpotId} onSelectSpot={onSelectSpot} onExpand={onUserMove} />}
        {!fullscreen && mappedSpots.map((spot) => (
          <WebCircleMarker
            key={spot.id}
            center={[spot.latitude!, spot.longitude!]}
            radius={spot.id === selectedSpotId ? 16 : 9}
            eventHandlers={onSelectSpot ? { click: () => onSelectSpot(spot.id) } : undefined}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: spot.id === selectedSpotId ? '#141417' : '#ef3857',
              fillOpacity: 1,
            }}
          >
            {fullscreen && <WebTooltip direction="bottom" permanent={spot.id === selectedSpotId}>{spot.brandName || spot.name}</WebTooltip>}
            {!onSelectSpot && <Popup>
              <div style={popupStyle}>
                <strong style={popupTitleStyle}>
                  {spot.type === 'event' ? spot.name : spot.brandName}
                </strong>
                <span style={popupMetaStyle}>{getBranchLocationLabel(spot)}</span>
                <span style={popupMetaStyle}>
                  {getCategoryLabel(spot.category)}
                </span>
                <button style={popupButtonStyle} onClick={() => onOpenSpot(spot.id)}>
                  Ver detalle
                </button>
              </div>
            </Popup>}
          </WebCircleMarker>
        ))}
      </WebMapContainer>
    </div>
  );
}

type MappedBranch = { branch: Spot; placeId: string };

function ClusteredPlaces({ branches, selectedSpotId, onSelectSpot, onExpand }: { branches: MappedBranch[]; selectedSpotId?: string; onSelectSpot?: (id: string, branch?: Spot) => void; onExpand?: () => void }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [opened, setOpened] = useState<{ ids: Set<string>; origin: [number, number]; zoom: number } | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
      if (opened && map.getZoom() < opened.zoom - .25) setOpened(null);
    },
    dragstart: () => { if (pending.current) { map.off('moveend', pending.current); pending.current = null; } },
  });
  useEffect(() => () => { if (pending.current) map.off('moveend', pending.current); }, [map]);
  const currentZoom = zoom ?? map.getZoom();
  const groups = useMemo(() => {
    // Release nearby markers earlier while keeping room for their 40px circles.
    const clusterRadius = Math.max(44, Math.min(64, 64 - (currentZoom - 12) * 10));
    const result: { items: MappedBranch[]; x: number; y: number }[] = [];
    for (const item of branches) {
      if (selectedSpotId && item.placeId !== selectedSpotId) continue;
      const point = map.project([item.branch.latitude!, item.branch.longitude!], currentZoom);
      const expanded = opened?.ids.has(`${item.placeId}:${item.branch.id}`);
      const group = currentZoom < 16 && !selectedSpotId && !expanded
        ? result.find(group => !opened?.ids.has(`${group.items[0].placeId}:${group.items[0].branch.id}`) && Math.hypot(group.x - point.x, group.y - point.y) < clusterRadius)
        : undefined;
      if (group) {
        const count = group.items.length;
        group.x = (group.x * count + point.x) / (count + 1);
        group.y = (group.y * count + point.y) / (count + 1);
        group.items.push(item);
      } else result.push({ items: [item], x: point.x, y: point.y });
    }
    const positions = separateMapMarkers(result);
    return result.map((group, index) => ({ ...group, ...positions[index] }));
  }, [branches, map, currentZoom, selectedSpotId, opened]);
  const visibleGroups = groups.filter(group =>
    map.getBounds().contains(map.unproject([group.x, group.y], currentZoom)),
  );
  const viewportCenter = map.project(map.getCenter(), currentZoom);
  visibleGroups.sort((a, b) =>
    Math.hypot(a.x - viewportCenter.x, a.y - viewportCenter.y)
    - Math.hypot(b.x - viewportCenter.x, b.y - viewportCenter.y),
  );
  const appearanceDelays = new Map(visibleGroups.map((group, index) => [
    group,
    index * Math.min(90, 900 / Math.max(1, visibleGroups.length - 1)),
  ]));
  return <>{groups.map(group => {
    const delay = selectedSpotId ? 0 : appearanceDelays.get(group) ?? 0;
    const first = group.items[0];
    const key = group.items.map(item => `${item.placeId}:${item.branch.id}`).join('|');
    const center = map.unproject([group.x, group.y], currentZoom);
    if (group.items.length === 1) return <CategoryMapMarker key={`${key}:${opened?.ids.has(key) ? 'opened' : 'normal'}`} position={[center.lat, center.lng]} delay={delay} spot={first.branch} selected={first.placeId === selectedSpotId} onSelect={() => onSelectSpot?.(first.placeId, first.branch)} />;
    return <PlaceCluster key={key} delay={delay} count={group.items.length} position={[center.lat, center.lng]} onPress={() => {
      const height = map.getSize().y;
      if (pending.current) map.off('moveend', pending.current);
      map.stop();
      const coordinates = group.items.map(({ branch }) => [branch.latitude!, branch.longitude!] as [number, number]);
      const bounds = latLngBounds(coordinates);
      const reveal = () => {
        pending.current = null;
        setOpened({ ids: new Set(group.items.map(item => `${item.placeId}:${item.branch.id}`)), origin: [center.lat, center.lng], zoom: map.getZoom() });
      };
      pending.current = reveal;
      map.once('moveend', reveal);
      // Frame every member, including outliers, instead of zooming into the closest pair.
      map.flyToBounds(bounds, {
        paddingTopLeft: [50, Math.min(180, height * .23)],
        paddingBottomRight: [50, Math.min(330, height * .4)],
        maxZoom: Math.min(22, map.getZoom() + 2),
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: .55,
      });
      onExpand?.();
    }} />;
  })}</>;
}

function PlaceCluster({ count, position, onPress, delay }: { delay: number; count: number; position: [number, number]; onPress: () => void }) {
  const element = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(() => divIcon({ html: element, className: 'spots-category-marker spots-place-cluster', iconSize: [44, 44], iconAnchor: [22, 22] }), [element]);
  const WebMarker = Marker as any;
  return <WebMarker position={position} icon={icon} bubblingMouseEvents={false} title={`Acercar a ${count} sedes`} alt={`Acercar a ${count} sedes`} eventHandlers={{ click: onPress }}>
    {createPortal(<div style={{ animationDelay: `${delay}ms`, width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ededf0', color: '#141417', border: '3px solid white', boxShadow: '0 2px 8px #14141726', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{count}</div>, element)}
  </WebMarker>;
}

function MapInteractions({ onBackgroundPress, onUserMove }: { onBackgroundPress?: () => void; onUserMove?: () => void }) {
  const userGesture = useRef(false);
  const map = useMapEvents({
    click: (event: { originalEvent: MouseEvent }) => {
      const target = event.originalEvent.target;
      if (target instanceof Element && target.closest('.leaflet-marker-icon, .leaflet-control, .leaflet-popup, .leaflet-tooltip')) return;
      onBackgroundPress?.();
    },
    dragstart: () => { userGesture.current = true; },
    moveend: () => { if (userGesture.current) { userGesture.current = false; onUserMove?.(); } },
  });
  useEffect(() => {
    const container = map.getContainer();
    // Leaflet uses Pointer Events on modern mobile browsers. Keep the parallel
    // native Touch Events out of RN Web's document-level responder history.
    const isolateTouch = (event: TouchEvent) => event.stopPropagation();
    const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
    if (window.PointerEvent) touchEvents.forEach(type => container.addEventListener(type, isolateTouch, { passive: true }));
    const markWheel = () => { userGesture.current = true; };
    const markPinch = (event: TouchEvent) => { if (event.touches.length > 1) userGesture.current = true; };
    container.addEventListener('wheel', markWheel, { passive: true });
    container.addEventListener('touchmove', markPinch, { passive: true });
    return () => {
      touchEvents.forEach(type => container.removeEventListener(type, isolateTouch));
      container.removeEventListener('wheel', markWheel);
      container.removeEventListener('touchmove', markPinch);
    };
  }, [map]);
  return null;
}

function CategoryMapMarker({ spot, selected, onSelect, delay, position }: { spot: Spot; selected: boolean; onSelect: () => void; delay: number; position: [number, number] }) {
  const [failedLogo, setFailedLogo] = useState<string>();
  const map = useMapEvents({});
  const element = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(() => divIcon({ html: element, className: 'spots-category-marker', iconSize: [36, 36], iconAnchor: [18, 18] }), [element]);
  const WebMarker = Marker as any;
  const WebTooltip = Tooltip as any;
  const status = getOpenStatusFromSchedule(spot.hours, new Date(), spot.businessStatus);
  const branchName = getBranchLocationLabel(spot);
  return <>
    <WebMarker position={position} icon={icon} bubblingMouseEvents={false} eventHandlers={{ click: () => {
    map.fire('spots:individual-selection');
    onSelect();
    map.stop();
    map.flyTo([spot.latitude!, spot.longitude!], 19, {
      animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: .6,
    });
  } }} title={`Seleccionar ${spot.brandName || spot.name}`} zIndexOffset={selected ? 1000 : 0}>
    {createPortal(<div style={{ animationDelay: `${delay}ms`, width: 36, height: 36, borderRadius: '50%', background: selected ? '#141417' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: selected ? '0 0 0 3px #141417, 0 2px 8px #14141726' : '0 2px 8px #14141726', border: '2px solid white' } as CSSProperties}>
      {spot.logoUrl && failedLogo !== spot.logoUrl
        ? <img src={spot.logoUrl} alt="" width={36} height={36} draggable={false} decoding="async" onError={() => setFailedLogo(spot.logoUrl)} style={{ borderRadius: '50%', objectFit: 'cover', pointerEvents: 'none' }} />
        : <CategoryIcon category={spot.category} size={19} color={selected ? '#fff' : '#141417'} />}
    </div>, element)}
    {selected && <WebTooltip direction="bottom" offset={[0, 27]} permanent interactive={false} opacity={1} className="spots-place-tooltip">
      <div style={{ minWidth: 120, maxWidth: 210, color: 'var(--spots-text, #141417)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, lineHeight: '16px', fontWeight: 700 }}>{spot.brandName || spot.name}</span>
          <span role="img" aria-label={getCategoryLabel(spot.category)} style={{ display: 'inline-flex', flex: '0 0 auto' }}>
            <CategoryIcon category={spot.category} size={16} color="var(--spots-text, #141417)" />
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 10, lineHeight: '14px', fontWeight: 500, color: 'var(--spots-text-secondary, #5f5f67)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>{branchName || 'Sede principal'}</span>
          <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: status?.tone === 'open' ? '#238652' : status?.tone === 'closed' ? '#8b3b47' : '#777780' }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: status?.tone === 'open' ? '#2e9b61' : status?.tone === 'closed' ? '#bc5968' : '#a4a4ac' }} />
            {status?.label === 'Cerrado temporalmente' ? status.label : status?.tone === 'open' ? 'Abierto' : status?.tone === 'closed' ? 'Cerrado' : 'Sin horario'}
          </span>
        </div>
      </div>
    </WebTooltip>}
  </WebMarker></>;
}

function ZoomIndicator() {
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({ zoom: () => setZoom(map.getZoom()) });
  return <div aria-label="Nivel de zoom" style={{
    position: 'absolute', left: 16, top: '45%', zIndex: 1000,
    pointerEvents: 'none', padding: '6px 10px', borderRadius: 12,
    background: 'var(--spots-surface, #fff)', color: 'var(--spots-text, #141417)',
    fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
    boxShadow: '0 2px 8px #14141726',
  }}>Zoom {(zoom ?? map.getZoom()).toFixed(1)}</div>;
}

function InitialPlaceFocus({ spot }: { spot?: Spot }) {
  const map = useMapEvents({});
  const focused = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!spot || focused.current === spot.id || !Number.isFinite(spot.latitude) || !Number.isFinite(spot.longitude)) return;
    // Resolve late-loaded catalog data once, without hijacking subsequent map gestures.
    focused.current = spot.id;
    map.stop();
    map.flyTo([spot.latitude!, spot.longitude!], 19, {
      animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: .75,
    });
  }, [map, spot]);
  return null;
}

function InitialUserLocationFocus({ userLocation, disabled }: { userLocation?: { latitude: number; longitude: number } | null; disabled?: boolean }) {
  const map = useMapEvents({});
  const focused = useRef(false);
  useEffect(() => {
    if (disabled || focused.current || !userLocation || !Number.isFinite(userLocation.latitude) || !Number.isFinite(userLocation.longitude)) return;
    focused.current = true;
    map.stop();
    map.flyTo([userLocation.latitude, userLocation.longitude], 16, {
      animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: .75,
    });
  }, [disabled, map, userLocation]);
  return null;
}

function SelectionSync({ spot, showAllBranches, userLocation, recenterKey }: { spot?: Spot; showAllBranches?: boolean; userLocation?: { latitude: number; longitude: number } | null; recenterKey?: number }) {
  const map = useMapEvents({});
  const previousView = useRef<{ placeId: string; center: [number, number]; zoom: number } | null>(null);
  useEffect(() => {
    // A marker tap replaces the saved view; only the toggle should restore it.
    const discardPreviousView = () => { previousView.current = null; };
    map.on('spots:individual-selection', discardPreviousView);
    return () => { map.off('spots:individual-selection', discardPreviousView); };
  }, [map]);
  useEffect(() => {
    if (!spot || (previousView.current && previousView.current.placeId !== spot.id)) {
      previousView.current = null;
    }
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!showAllBranches) {
      if (previousView.current) {
        const view = previousView.current;
        previousView.current = null;
        map.stop();
        map.flyTo(view.center, view.zoom, { animate, duration: .8 });
      }
      return;
    }
    if (!spot || previousView.current) return;
    const targets = (spot.branches?.length ? spot.branches : [spot]).filter(branch => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude));
    if (targets.length < 2) return;
    map.stop();
    const center = map.getCenter();
    previousView.current = { placeId: spot.id, center: [center.lat, center.lng], zoom: map.getZoom() };
    const height = map.getSize().y;
    map.flyToBounds(targets.map(branch => [branch.latitude!, branch.longitude!]), {
      paddingTopLeft: [44, Math.min(170, height * .23)],
      paddingBottomRight: [44, Math.min(330, height * .4)],
      maxZoom: 16,
      animate,
      duration: .8,
    });
  }, [map, spot, showAllBranches]);
  useEffect(() => {
    if (recenterKey && userLocation) map.setView([userLocation.latitude, userLocation.longitude], 14);
  }, [map, recenterKey, userLocation]);
  return null;
}

function LocationFilterSync({ spots, locationFocusKey }: { spots: Spot[]; locationFocusKey?: string }) {
  const map = useMapEvents({});
  const previousKey = useRef('');

  useEffect(() => {
    if (!locationFocusKey) {
      previousKey.current = '';
      return;
    }
    if (previousKey.current === locationFocusKey) return;
    previousKey.current = locationFocusKey;

    const coordinates = spots
      .flatMap(spot => spot.branches?.length ? spot.branches : [spot])
      .filter(spot => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude))
      .map(spot => [spot.latitude!, spot.longitude!] as [number, number]);
    if (!coordinates.length) return;

    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.stop();
    if (coordinates.length === 1) {
      map.flyTo(coordinates[0], 16, { animate, duration: .7 });
      return;
    }

    const height = map.getSize().y;
    map.flyToBounds(coordinates, {
      paddingTopLeft: [44, Math.min(170, height * .23)],
      paddingBottomRight: [44, Math.min(250, height * .32)],
      maxZoom: 16,
      animate,
      duration: .7,
    });
  }, [locationFocusKey, map, spots]);

  return null;
}

function VisibleSpotsSync({
  spots,
  onVisibleSpotsChange,
}: {
  spots: Spot[];
  onVisibleSpotsChange?: (spotIds: string[]) => void;
}) {
  const previousIdsRef = useRef('');
  const map = useMapEvents({
    moveend: syncVisibleSpots,
    zoomend: syncVisibleSpots,
    resize: syncVisibleSpots,
  });

  useEffect(() => {
    syncVisibleSpots();
  }, [map, onVisibleSpotsChange, spots]);

  function syncVisibleSpots() {
    if (!onVisibleSpotsChange) return;
    const bounds = map.getBounds();
    const nextIds = spots
      .filter(
        (spot) =>
          (spot.branches?.length ? spot.branches : [spot]).some(branch =>
            Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude) && bounds.contains([branch.latitude!, branch.longitude!])),
      )
      .map((spot) => spot.id);
    const nextSignature = nextIds.join('|');
    if (previousIdsRef.current === nextSignature) {
      return;
    }

    previousIdsRef.current = nextSignature;
    onVisibleSpotsChange(nextIds);
  }

  return null;
}

const shellStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 320,
  borderRadius: 28,
  overflow: 'hidden',
  backgroundColor: 'var(--spots-bg, #f5f5f7)',
  border: '1px solid var(--spots-border, #d6d6dc)',
};

const mapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
};

const emptyStateStyle: CSSProperties = {
  minHeight: 420,
  borderRadius: 28,
  backgroundColor: 'var(--spots-bg, #f5f5f7)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '10px',
};

const emptyTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--spots-text, #141417)',
  fontSize: '22px',
  fontWeight: 800,
};

const emptyCopyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--spots-text-secondary, #5f5f67)',
  fontSize: '14px',
  lineHeight: 1.5,
  maxWidth: '320px',
};

const popupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minWidth: '160px',
};

const popupTitleStyle: CSSProperties = {
  color: '#231725',
  fontSize: '14px',
};

const popupMetaStyle: CSSProperties = {
  color: '#6e6072',
  fontSize: '12px',
};

const popupButtonStyle: CSSProperties = {
  marginTop: '4px',
  border: 0,
  borderRadius: '999px',
  backgroundColor: '#ef3857',
  color: '#ffffff',
  fontWeight: 700,
  padding: '8px 12px',
  cursor: 'pointer',
};

import { getCategoryLabel } from '@/lib/category-icons';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
// Leaflet is already used by the web map; this workspace has no Leaflet declarations.
// @ts-expect-error Missing upstream declarations in the current workspace.
import { Browser, divIcon } from 'leaflet';
import { createPortal } from 'react-dom';
import { CategoryIcon } from './category-icon';
import 'leaflet/dist/leaflet.css';
import { getBranchLocationLabel, type Spot } from '@/lib/mock-spots';

// Use Leaflet's pointer-to-touch adapter so map gestures do not also enter
// React Native Web's native-touch responder on iOS/Android browsers.
if (typeof window !== 'undefined' && window.PointerEvent) Browser.touchNative = false;

type ExploreMapProps = {
  spots: Spot[];
  onOpenSpot: (spotId: string) => void;
  onVisibleSpotsChange?: (spotIds: string[]) => void;
  fullscreen?: boolean;
  selectedSpotId?: string;
  focusKey?: number;
  onSelectSpot?: (id: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  recenterKey?: number;
  onBackgroundPress?: () => void;
  onUserMove?: () => void;
};

export function ExploreMap({ spots, onOpenSpot, onVisibleSpotsChange, fullscreen, selectedSpotId, focusKey, onSelectSpot, userLocation, recenterKey, onBackgroundPress, onUserMove }: ExploreMapProps) {
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
        center={center}
        zoom={fullscreen ? 14 : 12}
        scrollWheelZoom
        zoomControl={!fullscreen}
        style={mapStyle}
        className={fullscreen ? 'spots-discovery-map' : undefined}
      >
        <VisibleSpotsSync spots={mappedSpots} onVisibleSpotsChange={onVisibleSpotsChange} />
        <SelectionSync spot={mappedSpots.find(spot => spot.id === selectedSpotId)} focusKey={focusKey} userLocation={userLocation} recenterKey={recenterKey} />
        <MapInteractions onBackgroundPress={onBackgroundPress} onUserMove={onUserMove} />
        {userLocation && <WebCircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3988ef', fillOpacity: 1 }} interactive={false} />}
        <WebTileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fullscreen && <style>{`.spots-discovery-map .leaflet-tile-pane { filter: grayscale(1) contrast(.65) brightness(1.2); } .spots-category-marker { border: 0; background: none; }`}</style>}
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

function ClusteredPlaces({ branches, selectedSpotId, onSelectSpot, onExpand }: { branches: MappedBranch[]; selectedSpotId?: string; onSelectSpot?: (id: string) => void; onExpand?: () => void }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const currentZoom = zoom ?? map.getZoom();
  const groups = useMemo(() => {
    const result: { items: MappedBranch[]; x: number; y: number }[] = [];
    for (const item of branches) {
      const point = map.project([item.branch.latitude!, item.branch.longitude!], currentZoom);
      // Keep the carousel's selected branches visible, even when their neighbours cluster.
      const group = currentZoom < 17 && item.placeId !== selectedSpotId
        ? result.find(group => group.items[0].placeId !== selectedSpotId && Math.hypot(group.x - point.x, group.y - point.y) < 64)
        : undefined;
      if (group) {
        const count = group.items.length;
        group.x = (group.x * count + point.x) / (count + 1);
        group.y = (group.y * count + point.y) / (count + 1);
        group.items.push(item);
      } else result.push({ items: [item], x: point.x, y: point.y });
    }
    return result;
  }, [branches, map, currentZoom, selectedSpotId]);
  return <>{groups.map(group => {
    const first = group.items[0];
    const key = group.items.map(item => `${item.placeId}:${item.branch.id}`).join('|');
    if (group.items.length === 1) return <CategoryMapMarker key={key} spot={first.branch} selected={first.placeId === selectedSpotId} onSelect={() => onSelectSpot?.(first.placeId)} />;
    const center = map.unproject([group.x, group.y], currentZoom);
    return <PlaceCluster key={key} count={group.items.length} position={[center.lat, center.lng]} onPress={() => {
      const height = map.getSize().y;
      map.fitBounds(group.items.map(({ branch }) => [branch.latitude!, branch.longitude!]), {
        paddingTopLeft: [50, Math.min(180, height * .23)],
        paddingBottomRight: [50, Math.min(330, height * .4)],
        maxZoom: Math.min(17, currentZoom + 2),
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: .5,
      });
      onExpand?.();
    }} />;
  })}</>;
}

function PlaceCluster({ count, position, onPress }: { count: number; position: [number, number]; onPress: () => void }) {
  const element = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(() => divIcon({ html: element, className: 'spots-category-marker spots-place-cluster', iconSize: [44, 44], iconAnchor: [22, 22] }), [element]);
  const WebMarker = Marker as any;
  return <WebMarker position={position} icon={icon} bubblingMouseEvents={false} title={`Acercar a ${count} sedes`} alt={`Acercar a ${count} sedes`} eventHandlers={{ click: onPress }}>
    {createPortal(<div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ededf0', color: '#141417', border: '3px solid white', boxShadow: '0 2px 8px #14141726', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{count}</div>, element)}
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

function CategoryMapMarker({ spot, selected, onSelect }: { spot: Spot; selected: boolean; onSelect: () => void }) {
  const element = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(() => divIcon({ html: element, className: 'spots-category-marker', iconSize: [36, 36], iconAnchor: [18, 18] }), [element]);
  const WebMarker = Marker as any;
  const WebTooltip = Tooltip as any;
  return <WebMarker position={[spot.latitude!, spot.longitude!]} icon={icon} bubblingMouseEvents={false} eventHandlers={{ click: onSelect }} title={`Seleccionar ${spot.brandName || spot.name}`} zIndexOffset={selected ? 1000 : 0}>
    {createPortal(<div style={{ width: 36, height: 36, borderRadius: '50%', background: selected ? '#141417' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #14141726', border: '2px solid white' }}><CategoryIcon category={spot.category} size={19} color={selected ? '#fff' : '#141417'} /></div>, element)}
    {selected && <WebTooltip direction="bottom" permanent>{spot.brandName || spot.name}</WebTooltip>}
  </WebMarker>;
}

function SelectionSync({ spot, focusKey, userLocation, recenterKey }: { spot?: Spot; focusKey?: number; userLocation?: { latitude: number; longitude: number } | null; recenterKey?: number }) {
  const map = useMapEvents({});
  const firstFocus = useRef(true);
  useEffect(() => {
    if (!spot) return;
    const targets = (spot.branches?.length ? spot.branches : [spot]).filter(branch => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude));
    if (!targets.length) return;
    const height = map.getSize().y;
    map.fitBounds(targets.map(branch => [branch.latitude!, branch.longitude!]), {
      paddingTopLeft: [44, Math.min(170, height * .23)],
      paddingBottomRight: [44, Math.min(330, height * .4)],
      maxZoom: 16,
      animate: !firstFocus.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: .6,
    });
    firstFocus.current = false;
  }, [map, spot, focusKey]);
  useEffect(() => {
    if (recenterKey && userLocation) map.setView([userLocation.latitude, userLocation.longitude], 14);
  }, [map, recenterKey, userLocation]);
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
  backgroundColor: '#f7f2f7',
  border: '1px solid rgba(94, 66, 98, 0.08)',
};

const mapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
};

const emptyStateStyle: CSSProperties = {
  minHeight: 420,
  borderRadius: 28,
  backgroundColor: '#f7f2f7',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '10px',
};

const emptyTitleStyle: CSSProperties = {
  margin: 0,
  color: '#231725',
  fontSize: '22px',
  fontWeight: 800,
};

const emptyCopyStyle: CSSProperties = {
  margin: 0,
  color: '#7d6e80',
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

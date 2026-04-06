import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getBranchLocationLabel, type Spot } from '@/lib/mock-spots';

type ExploreMapProps = {
  spots: Spot[];
  onOpenSpot: (spotId: string) => void;
  onVisibleSpotsChange?: (spotIds: string[]) => void;
};

export function ExploreMap({ spots, onOpenSpot, onVisibleSpotsChange }: ExploreMapProps) {
  const WebMapContainer = MapContainer as any;
  const WebTileLayer = TileLayer as any;
  const WebCircleMarker = CircleMarker as any;

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

  if (!mappedSpots.length) {
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
    <div style={shellStyle}>
      <WebMapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={mapStyle}
      >
        <VisibleSpotsSync spots={mappedSpots} onVisibleSpotsChange={onVisibleSpotsChange} />
        <WebTileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedSpots.map((spot) => (
          <WebCircleMarker
            key={spot.id}
            center={[spot.latitude!, spot.longitude!]}
            radius={10}
            pathOptions={{
              color: '#ef3857',
              weight: 2,
              fillColor: '#ef3857',
              fillOpacity: 0.78,
            }}
          >
            <Popup>
              <div style={popupStyle}>
                <strong style={popupTitleStyle}>
                  {spot.type === 'event' ? spot.name : spot.brandName}
                </strong>
                <span style={popupMetaStyle}>{getBranchLocationLabel(spot)}</span>
                <span style={popupMetaStyle}>
                  {spot.category}
                </span>
                <button style={popupButtonStyle} onClick={() => onOpenSpot(spot.id)}>
                  Ver detalle
                </button>
              </div>
            </Popup>
          </WebCircleMarker>
        ))}
      </WebMapContainer>
    </div>
  );
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
          typeof spot.latitude === 'number' &&
          typeof spot.longitude === 'number' &&
          bounds.contains([spot.latitude, spot.longitude]),
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

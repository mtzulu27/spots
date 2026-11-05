import type { MapSearchBounds } from './explore-map-search';

export type MapSearchViewport = MapSearchBounds & { zoom: number };
export const MIN_ZONE_PIN_ZOOM = 15;
export const MAX_ZONE_PIN_SPAN_KM = 3;

export function canPinMapZone(viewport: MapSearchViewport | null) {
  if (!viewport || !Object.values(viewport).every(Number.isFinite) || viewport.zoom < MIN_ZONE_PIN_ZOOM) return false;
  const { south, north, west, east } = viewport;
  if (north <= south || south < -90 || north > 90) return false;
  const longitudeSpan = east >= west ? east - west : 360 + east - west;
  if (longitudeSpan <= 0 || longitudeSpan >= 360) return false;
  const heightKm = (north - south) * 111.32;
  const widthKm = longitudeSpan * 111.32 * Math.cos(((north + south) / 2) * Math.PI / 180);
  return Math.max(heightKm, widthKm) <= MAX_ZONE_PIN_SPAN_KM;
}

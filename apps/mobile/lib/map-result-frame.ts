import type { Spot } from './mock-spots';

export type MapResultInsets = { top: number; bottom: number };

export function getMapSelectionOffset(height: number, insets?: MapResultInsets) {
  if (!insets || height <= 0) return 0;
  const top = Math.max(0, insets.top);
  const bottom = Math.max(0, insets.bottom);
  const scale = Math.min(1, Math.max(0, height - 96) / Math.max(1, top + bottom));
  return (bottom - top) * scale / 2;
}

export function getMapResultFrame(spots: Spot[], width: number, height: number, insets: MapResultInsets) {
  const coordinates = spots.flatMap(spot => spot.branches?.length ? spot.branches : [spot])
    .filter(spot => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude) &&
      Math.abs(spot.latitude!) <= 90 && Math.abs(spot.longitude!) <= 180)
    .map(spot => [spot.latitude!, spot.longitude!] as [number, number]);
  if (!coordinates.length || width <= 0 || height <= 0) return null;
  const latitudes = coordinates.map(point => point[0]);
  const longitudes = coordinates.map(point => point[1]);
  const availablePadding = Math.max(0, height - 96);
  const desiredTop = Math.max(0, insets.top);
  const desiredBottom = Math.max(0, insets.bottom);
  const scale = Math.min(1, availablePadding / Math.max(1, desiredTop + desiredBottom));
  const side = Math.max(0, Math.min(32, (width - 64) / 2));
  return {
    bounds: [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]] as [[number, number], [number, number]],
    paddingTopLeft: [side, desiredTop * scale] as [number, number],
    paddingBottomRight: [side, desiredBottom * scale] as [number, number],
    maxZoom: 16,
  };
}

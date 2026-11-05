import type { MapSearchBounds } from './explore-map-search';

export const DESKTOP_EXPLORE_MIN_WIDTH = 1024;
export function isDesktopExplore(platform: string, width: number) {
  return platform === 'web' && width >= DESKTOP_EXPLORE_MIN_WIDTH;
}
export function fixedZoneForAction(current: MapSearchBounds | null, viewport: MapSearchBounds | null, canPin: boolean) {
  if (current) return null;
  if (!canPin || !viewport) return null;
  return { south: viewport.south, west: viewport.west, north: viewport.north, east: viewport.east };
}

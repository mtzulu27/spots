import { aggregatePlaceSpotsFromList, type Spot } from './mock-spots';
import { createSpotFilter, type ExploreFilters } from './explore-filters';
import type { UserLocation } from './location-store';

export type MapSearchBounds = { south: number; west: number; north: number; east: number };

export function isInsideMapArea(spot: Spot, area: MapSearchBounds) {
  const lat = spot.latitude;
  const lng = spot.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Also support a viewport crossing the antimeridian.
  const longitudeMatches = area.west <= area.east
    ? lng! >= area.west && lng! <= area.east
    : lng! >= area.west || lng! <= area.east;
  return lat! >= area.south && lat! <= area.north && longitudeMatches;
}

export function selectMapSearchResults(catalog: Spot[], filters: ExploreFilters, query: string, location?: UserLocation | null, area?: MapSearchBounds | null) {
  const matches = createSpotFilter(filters, query, location);
  // Filter before grouping so a matching sede cannot reveal unrelated siblings.
  const branches = catalog.flatMap(spot => spot.branches?.length ? spot.branches : [spot]);
  return aggregatePlaceSpotsFromList(branches.filter(spot =>
    Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude) &&
      (!area || isInsideMapArea(spot, area)) && matches(spot),
  ));
}

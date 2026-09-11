import type { Spot } from './mock-spots';
import type { UserLocation } from './location-store';
import { getEffectiveSpotDistanceKm, sortSpots, type ExploreSort } from './explore-filters';
import { getOpenStatusFromSchedule } from './schedule-status';

export function getSuggestedZones(spots: Spot[], location: UserLocation | null) {
  const zones = new Map<string, { distance: number; count: number }>();
  const seen = new Set<string>();
  for (const spot of spots) {
    for (const branch of spot.branches?.length ? spot.branches : [spot]) {
      const name = branch.neighborhood?.trim();
      if (!name || seen.has(branch.id)) continue;
      seen.add(branch.id);
      const distance = location && Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude)
        ? getEffectiveSpotDistanceKm({ ...branch, branches: undefined }, location)
        : null;
      if (location && (distance === null || !Number.isFinite(distance))) continue;
      const current = zones.get(name) ?? { distance: Infinity, count: 0 };
      zones.set(name, { distance: Math.min(current.distance, distance ?? Infinity), count: current.count + 1 });
    }
  }
  // Proximity is measured to the nearest catalogued venue, not a zone centroid.
  return [...zones].sort((a, b) => (location ? a[1].distance - b[1].distance : b[1].count - a[1].count) || a[0].localeCompare(b[0]))
    .slice(0, 5).map(([name]) => name);
}

function availabilityFor(spot: Spot, now: Date) {
  const status = getOpenStatusFromSchedule(spot.hours, now, spot.businessStatus);
  const soon = status?.tone === 'closed' && [30, 60].some(minutes => getOpenStatusFromSchedule(spot.hours, new Date(now.getTime() + minutes * 60000), spot.businessStatus)?.tone === 'open');
  return { availability: status?.tone === 'open' ? 0 : soon ? 1 : status ? 3 : 2, label: soon ? 'Abre en la próxima hora' : status?.label ?? 'Horario por confirmar' };
}

export function getDiscoveryStatus(place: Spot, instant: Date) {
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return (place.branches?.length ? place.branches : [place])
    .map(branch => availabilityFor(branch, now))
    .sort((a, b) => a.availability - b.availability)[0];
}

const recentPlaceWindowMs = 40 * 60 * 1000;
const futurePublishToleranceMs = 15 * 60 * 1000;

export function isRecentlyAdded(place: Spot, instant: Date) {
  if (place.type !== 'place') return false;
  const createdAt = Date.parse(place.createdAt || '');
  if (!Number.isFinite(createdAt)) return false;

  const age = instant.getTime() - createdAt;
  // Allow a small clock skew between the catalog publisher and the device.
  return age >= -futurePublishToleranceMs && age <= recentPlaceWindowMs;
}

export function rankSearchResults(spots: Spot[], query: string, instant: Date, sortBy?: ExploreSort, getLikesCount?: (id: string | number) => number) {
  // An explicit order must win over availability and search relevance.
  if (sortBy && sortBy !== 'relevance') return sortSpots(spots, sortBy, getLikesCount);
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const scheduleCache = new Map<string, number>();
  const availability = (place: Spot) => Math.min(...(place.branches?.length ? place.branches : [place]).map(branch => {
    const key = `${branch.businessStatus ?? ''}:${branch.hours}`;
    let rank = scheduleCache.get(key);
    if (rank === undefined) {
      rank = availabilityFor(branch, now).availability;
      scheduleCache.set(key, rank);
    }
    return rank;
  }));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const search = normalize(query);
  const terms = search.split(' ').filter(Boolean);
  return spots.map((spot, index) => {
    // Search the name shown in the card first. Some aggregated branches carry
    // a separate brandName, so keep both values in the name signal instead of
    // letting a branch label hide an exact match in the displayed name.
    const displayName = normalize(spot.name || '');
    const brandName = normalize(spot.brandName || '');
    const name = displayName || brandName;
    const nameMatches = [displayName, brandName].filter(Boolean);
    const bestNameScore = nameMatches.reduce((best, value) => {
      if (value === search) return Math.max(best, 1000);
      if (value.startsWith(search)) return Math.max(best, 800);
      const wordStart = value.indexOf(` ${search}`);
      if (wordStart >= 0) return Math.max(best, 600);
      const position = value.indexOf(search);
      return position >= 0 ? Math.max(best, 400 - Math.min(position, 300)) : best;
    }, 0);
    const relevance = !search ? 0 : bestNameScore
      + terms.reduce((score, term) => score + (nameMatches.some(value => value.includes(term)) ? 40 : 0), 0);
    return { spot, index, relevance, availability: availability(spot) };
  }).sort((a, b) => b.relevance - a.relevance || a.availability - b.availability || a.index - b.index)
    .map(entry => entry.spot);
}

export function rankDiscovery(spots: Spot[], location: UserLocation | null, zone: string, instant: Date) {
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const scheduleCache = new Map<string, ReturnType<typeof availabilityFor>>();
  const statusFor = (spot: Spot) => {
    const key = `${spot.businessStatus ?? ''}:${spot.hours}`;
    let status = scheduleCache.get(key);
    if (!status) { status = availabilityFor(spot, now); scheduleCache.set(key, status); }
    return status;
  };
  const availability = new Map(spots.map(place => [place.id, Math.min(...(place.branches?.length ? place.branches : [place]).map(branch => statusFor(branch).availability))]));
  const featured = [...spots].sort((a, b) =>
    Number(availability.get(a.id) === 3) - Number(availability.get(b.id) === 3)
    || Number(isRecentlyAdded(b, instant)) - Number(isRecentlyAdded(a, instant))
    || availability.get(a.id)! - availability.get(b.id)!
    || (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)
    || (a.feedPriorityRank || Infinity) - (b.feedPriorityRank || Infinity)
  ).slice(0, 10);
  const featuredIds = new Set(featured.map(spot => spot.likeTargetId));
  const today = spots.flatMap(place => {
    const candidates = (place.branches?.length ? place.branches : [place]).filter(branch => !zone || branch.neighborhood === zone).map(spot => {
      const { availability, label } = statusFor(spot);
      const distance = location ? getEffectiveSpotDistanceKm({ ...spot, branches: undefined }, location) : null;
      return { spot, availability, distance, label };
    }).sort((a, b) => a.availability - b.availability || (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return candidates[0] ? [candidates[0]] : [];
  });
  // Avoid repeats only among similarly available and nearby alternatives.
  today.sort((a, b) => a.availability - b.availability || Math.floor((a.distance ?? 1e6) / 2) - Math.floor((b.distance ?? 1e6) / 2) || Number(featuredIds.has(a.spot.likeTargetId)) - Number(featuredIds.has(b.spot.likeTargetId)) || (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return { featured, today };
}

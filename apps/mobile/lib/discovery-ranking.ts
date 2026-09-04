import type { Spot } from './mock-spots';
import type { UserLocation } from './location-store';
import { getEffectiveSpotDistanceKm } from './explore-filters';
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
  const status = getOpenStatusFromSchedule(spot.hours, now);
  const soon = status?.tone === 'closed' && [30, 60].some(minutes => getOpenStatusFromSchedule(spot.hours, new Date(now.getTime() + minutes * 60000))?.tone === 'open');
  return { availability: status?.tone === 'open' ? 0 : soon ? 1 : status ? 3 : 2, label: soon ? 'Abre en la próxima hora' : status?.label ?? 'Horario por confirmar' };
}

export function getDiscoveryStatus(place: Spot, instant: Date) {
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return (place.branches?.length ? place.branches : [place])
    .map(branch => availabilityFor(branch, now))
    .sort((a, b) => a.availability - b.availability)[0];
}

export function rankSearchResults(spots: Spot[], query: string, instant: Date) {
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const scheduleCache = new Map<string, number>();
  const availability = (place: Spot) => Math.min(...(place.branches?.length ? place.branches : [place]).map(branch => {
    let rank = scheduleCache.get(branch.hours);
    if (rank === undefined) {
      rank = availabilityFor(branch, now).availability;
      scheduleCache.set(branch.hours, rank);
    }
    return rank;
  }));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const search = normalize(query);
  const terms = search.split(' ').filter(Boolean);
  return spots.map((spot, index) => {
    const name = normalize(spot.brandName || spot.name);
    const details = normalize([spot.category, spot.neighborhood, ...spot.tags, ...(spot.branches ?? []).map(branch => branch.neighborhood)].join(' '));
    const description = normalize(spot.description || '');
    const relevance = !search ? 0 :
      (name === search ? 1000 : name.startsWith(search) ? 500 : name.includes(search) ? 250 : 0)
      + terms.reduce((score, term) => score + (name.includes(term) ? 40 : 0) + (details.includes(term) ? 15 : 0) + (description.includes(term) ? 2 : 0), 0);
    return { spot, index, relevance, availability: availability(spot) };
  }).sort((a, b) => a.availability - b.availability || b.relevance - a.relevance || a.index - b.index)
    .map(entry => entry.spot);
}

export function rankDiscovery(spots: Spot[], location: UserLocation | null, zone: string, instant: Date) {
  const now = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const scheduleCache = new Map<string, ReturnType<typeof availabilityFor>>();
  const statusFor = (spot: Spot) => {
    let status = scheduleCache.get(spot.hours);
    if (!status) { status = availabilityFor(spot, now); scheduleCache.set(spot.hours, status); }
    return status;
  };
  const availability = new Map(spots.map(place => [place.id, Math.min(...(place.branches?.length ? place.branches : [place]).map(branch => statusFor(branch).availability))]));
  const featured = [...spots].sort((a, b) => availability.get(a.id)! - availability.get(b.id)! || (a.feedPriorityRank || Infinity) - (b.feedPriorityRank || Infinity) || (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)).slice(0, 10);
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

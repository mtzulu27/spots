export const normalizeName = (value = '') => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const generic = new Set(['restaurante', 'restaurant', 'pizzeria', 'cafe', 'bar', 'parque', 'museo', 'pradera', 'antigua']);
export function isCandidate(placeName, element) {
  const tags = element.tags ?? {};
  if (tags.highway || tags.place || tags.boundary || tags.amenity === 'bicycle_parking') return false;
  const name = normalizeName(placeName);
  if (!name) return false;
  const alternatives = [tags.name, tags.brand, tags.alt_name, tags['name:es']].filter(Boolean).map(normalizeName);
  return alternatives.some((other) => !generic.has(other) && (name === other
    || (Math.min(name.length, other.length) >= 7 && (name.includes(other) || other.includes(name)))));
}

export function validCoordinates({ latitude, longitude }) {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function distanceMeters(a, b) {
  if (!validCoordinates(a) || !validCoordinates(b)) return null;
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad)
    * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// Matching creates candidates only. Only the explicitly reviewed pairs below can change data.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/review-osm-coordinates.mjs <overpass.json> [--apply]');
const osm = JSON.parse(readFileSync(input, 'utf8'));
if (!Array.isArray(osm.elements) || osm.remark) throw new Error('Incomplete Overpass response');
const root = new URL('../', import.meta.url);
const file = new URL('apps/mobile/public/spots-catalog.json', root);
const catalog = JSON.parse(readFileSync(file, 'utf8'));
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const reviewed = new Map([
  ['carpaneto-cali', 6247423685],
  ['montallegro-gelateria-italiana-san-antonio', 6228890786],
  ['platillos-voladores-centenario', 5043725621],
  ['domingo-san-antonio', 11433040269],
  ['la-topa-tolondra-centro', 4226415992],
  ['fusion-wok-granada-cali', 4300571992],
]);
const now = new Date().toISOString();
const rows = catalog.branches.map((branch) => {
  const place = catalog.spots.find((p) => p.id === branch.spot_id);
  const name = normalize(place?.name ?? '');
  const candidates = osm.elements.filter((e) => {
    const other = normalize(e.tags?.name ?? '');
    return name && other && (name === other || (Math.min(name.length, other.length) > 5
      && (other.includes(name) || name.includes(other))));
  });
  const match = candidates.find((e) => e.type === 'node' && e.id === reviewed.get(branch.slug));
  if (reviewed.has(branch.slug) && (!match || !Number.isFinite(match.lat) || !Number.isFinite(match.lon))) {
    throw new Error(`Reviewed node missing: ${branch.slug}`);
  }
  return {
    slug: branch.slug, place: place?.name, address: branch.address,
    previous: { latitude: branch.latitude, longitude: branch.longitude },
    status: match ? 'matched_name_and_address' : 'pending_verification',
    reason: match ? 'Named establishment node; address matches catalog. Not surveyed accuracy.'
      : candidates.length ? 'Candidates require branch identity/address confirmation.' : 'No name candidate in this bounded OSM extract; not proof of absence.',
    proposed: match ? { latitude: match.lat, longitude: match.lon } : null,
    source: match ? `https://www.openstreetmap.org/node/${match.id}` : null,
    candidates: candidates.map((e) => ({ url: `https://www.openstreetmap.org/${e.type}/${e.id}`, tags: e.tags,
      latitude: e.lat ?? e.center?.lat, longitude: e.lon ?? e.center?.lon })),
  };
});
const changes = rows.filter((r) => r.proposed && (r.previous.latitude !== r.proposed.latitude || r.previous.longitude !== r.proposed.longitude));
const apply = process.argv.includes('--apply');
const report = { reviewedAt: now, applied: apply, license: 'ODbL-1.0', attribution: 'OpenStreetMap contributors',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  scope: 'All catalog branches compared with named food/drink/nightlife POIs in bbox 3.2,-76.65,3.65,-76.4; other categories and unmatched branches need further sources.',
  summary: { branches: rows.length, matched: reviewed.size, changed: changes.length, pending: rows.length - reviewed.size }, rows };
if (apply) {
  writeFileSync(new URL('docs/catalog-review/coordinates-before-osm.json', root), `${JSON.stringify(changes.map(({ slug, previous }) => ({ slug, ...previous })), null, 2)}\n`);
  for (const row of changes) {
    Object.assign(catalog.branches.find((b) => b.slug === row.slug), row.proposed);
  }
  const json = `${JSON.stringify(catalog, null, 2)}\n`;
  writeFileSync(file, json);
  const dist = new URL('apps/mobile/dist/spots-catalog.json', root);
  if (existsSync(dist)) writeFileSync(dist, json);
}
writeFileSync(new URL('docs/catalog-review/coordinate-source-review.json', root), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isCandidate, validCoordinates, distanceMeters } from './coordinate-review-lib.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/resolve-branch-coordinates.mjs <overpass.json> [--apply]');
const root = new URL('../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const osm = JSON.parse(readFileSync(input, 'utf8'));
if (!Array.isArray(osm.elements) || osm.remark) throw new Error('Incomplete OSM response');
const catalogFile = new URL('apps/mobile/public/spots-catalog.json', root);
const beforeText = readFileSync(catalogFile, 'utf8');
const catalog = JSON.parse(beforeText);
const prior = read('docs/catalog-review/coordinate-source-review.json');
const decisions = read('docs/catalog-review/coordinate-decisions.json');
const ownerDecisions = read('docs/catalog-review/coordinate-owner-decisions.json');
const menuDecisions = read('docs/catalog-review/coordinate-menupp-decisions.json');
const menuEvidence = read('docs/catalog-review/coordinate-menupp-review.json');
for (const [slug, restaurant, id] of menuDecisions.accepted) {
  const evidence = menuEvidence.results.find(r => r.restaurant === restaurant);
  const location = evidence?.locations?.find(l => l.id === id);
  if (!location?.coordinate || !evidence.branches.includes(slug)) throw new Error(`Missing menu evidence ${slug}`);
  ownerDecisions.decisions.push({ slug, ...location.coordinate, source: `${evidence.source}/venue/${id}`, sourceRecord: id,
    reason: `Reviewed owner menu branch: ${location.name}; ${location.address || 'named branch matches catalog'}.`,
    evidenceCheckedAt: menuEvidence.checkedAt });
}
const searchesFile = new URL('docs/catalog-review/coordinate-web-searches.json', root);
const searches = existsSync(searchesFile) ? read('docs/catalog-review/coordinate-web-searches.json').results : [];
const bySource = new Map(osm.elements.map((e) => [`${e.type}/${e.id}`, e]));
const bySlug = new Map(catalog.branches.map((b) => [b.slug, b]));
const accepted = new Map(prior.rows.filter((r) => r.proposed).map((r) => [r.slug, {
  ...r.proposed, source: r.source, precision: 'mapped_poi', reason: r.reason, reviewedAt: prior.reviewedAt,
}]));
for (const decision of decisions.decisions) {
  if (!bySlug.has(decision.slug)) throw new Error(`Unknown branch ${decision.slug}`);
  const node = bySource.get(`${decision.osmType}/${decision.osmId}`);
  const coordinate = { latitude: node?.lat, longitude: node?.lon };
  if (!node || !validCoordinates(coordinate) || node.tags?.fixme) throw new Error(`Invalid reviewed POI ${decision.slug}`);
  accepted.set(decision.slug, { ...coordinate, source: `https://www.openstreetmap.org/${node.type}/${node.id}`,
    precision: decision.precision, reason: decision.reason, corroboration: decision.corroboration,
    sourceModifiedAt: node.timestamp, reviewedAt: new Date().toISOString() });
}
const now = new Date().toISOString();
for (const decision of ownerDecisions.decisions) {
  if (!bySlug.has(decision.slug) || !validCoordinates(decision) || !decision.source.startsWith('https://')) {
    throw new Error(`Invalid reviewed owner point ${decision.slug}`);
  }
  if (accepted.has(decision.slug)) throw new Error(`Conflicting source approvals ${decision.slug}`);
  const { slug, ...data } = decision;
  accepted.set(slug, { ...data, precision: ownerDecisions.precision, reviewedAt: ownerDecisions.reviewedAt,
    sourceType: 'owner_published', license: 'not_asserted' });
}
for (const data of accepted.values()) {
  if (!data.sourceType) Object.assign(data, { sourceType: 'openstreetmap', license: 'ODbL-1.0',
    attribution: 'OpenStreetMap contributors', licenseUrl: 'https://www.openstreetmap.org/copyright' });
}
const rows = catalog.branches.map((b) => {
  const p = catalog.spots.find((p) => p.id === b.spot_id);
  const approved = accepted.get(b.slug);
  const conflict = [...decisions.conflicts, ...ownerDecisions.conflicts, ...menuDecisions.conflicts].find((c) => c.slug === b.slug);
  const search = searches.find((s) => s.slug === p?.slug);
  const candidates = osm.elements.filter((e) => isCandidate(p?.name, e)).map((e) => ({
    source: `https://www.openstreetmap.org/${e.type}/${e.id}`, name: e.tags.name,
    latitude: e.lat ?? e.center?.lat, longitude: e.lon ?? e.center?.lon,
    geometryKind: e.type === 'node' ? 'point' : 'bounds_center_not_entrance',
    sourceModifiedAt: e.timestamp, tags: e.tags,
  }));
  return { slug: b.slug, place: p?.name, placeSlug: p?.slug, address: b.address, active: b.is_active,
    status: approved ? 'source_matched' : conflict ? 'conflicting_evidence' : 'unresolved',
    reason: approved?.reason ?? conflict?.reason ?? 'No branch-specific coordinate accepted; name candidates/search results are not verification.',
    previous: { latitude: b.latitude, longitude: b.longitude },
    accepted: approved ?? null, displacementMeters: approved ? distanceMeters(b, approved) : null,
    webSearch: search ? { query: search.query, file: 'coordinate-web-searches.json', succeeded: !search.error && !search.response?.isError } : null,
    candidates,
  };
});
const changes = rows.filter((r) => r.accepted && (r.previous.latitude !== r.accepted.latitude || r.previous.longitude !== r.accepted.longitude));
const apply = process.argv.includes('--apply');
if (apply) {
  // Validate the optional exported catalog before touching either file.
  const distFile = new URL('apps/mobile/dist/spots-catalog.json', root);
  const distText = existsSync(distFile) ? readFileSync(distFile, 'utf8') : null;
  const dist = distText ? JSON.parse(distText) : null;
  for (const row of changes) {
    if (dist) {
      const b = dist.branches.find((b) => b.slug === row.slug);
      if (!b || b.latitude !== row.previous.latitude || b.longitude !== row.previous.longitude) {
        throw new Error(`Export differs for ${row.slug}; refusing to overwrite`);
      }
    }
  }
  if (readFileSync(catalogFile, 'utf8') !== beforeText) throw new Error('Catalog changed during review');
  const backupDir = new URL('docs/catalog-review/coordinate-history/', root);
  mkdirSync(backupDir, { recursive: true });
  if (changes.length) {
    writeFileSync(new URL(`${now.replaceAll(':', '-')}-${randomUUID()}.json`, backupDir),
      `${JSON.stringify({ appliedAt: now, changes }, null, 2)}\n`, { flag: 'wx' });
    for (const row of changes) {
      const { latitude, longitude } = row.accepted;
      Object.assign(bySlug.get(row.slug), { latitude, longitude });
      if (dist) Object.assign(dist.branches.find((b) => b.slug === row.slug), { latitude, longitude });
    }
    writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
    if (dist) writeFileSync(distFile, `${JSON.stringify(dist, null, 2)}\n`);
  }
  const attribution = { note: 'Provenance and licensing are recorded per source. Owner points are not surveyed or relicensed as OSM data.',
    records: [...accepted].map(([slug, data]) => ({ slug, ...data })) };
  writeFileSync(new URL('apps/mobile/public/coordinate-sources.json', root), `${JSON.stringify(attribution, null, 2)}\n`);
  if (dist) writeFileSync(new URL('apps/mobile/dist/coordinate-sources.json', root), `${JSON.stringify(attribution, null, 2)}\n`);
}
const report = { reviewedAt: now, applied: apply, source: 'OpenStreetMap and reviewed owner-published branch points; see per-record provenance',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  scope: 'All catalog branches compared with named OSM elements in Cali/Yumbo/Jamundi bbox. Search coverage is reported separately from accepted coordinates.',
  summary: { total: rows.length, sourceMatched: accepted.size, changedThisRun: changes.length,
    unresolved: rows.filter((r) => !r.accepted).length, conflicts: rows.filter((r) => r.status === 'conflicting_evidence').length,
    branchesWithWebSearch: rows.filter((r) => r.webSearch?.succeeded).length }, rows };
writeFileSync(new URL('docs/catalog-review/coordinate-resolution.json', root), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));

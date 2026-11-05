import fs from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import crypto from 'node:crypto';
import { searchPlaces, getPlaceDetails } from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-google-places.mjs';

const root = process.cwd();
const dir = path.join(root, 'docs/catalog-review/lago-verde-coordinates-20261101');
const catalogPath = path.join(root, 'apps/mobile/public/spots-catalog.json');
const source = await fs.readFile(catalogPath, 'utf8');
const catalog = JSON.parse(source);
const spots = new Map(catalog.spots.map(spot => [spot.id, spot]));
const branches = catalog.branches.filter(branch => /lago\s*verde/i.test(branch.mall || ''));
await fs.mkdir(dir, { recursive: true });
if (!process.env.GOOGLE_PLACES_API_KEY) process.loadEnvFile(path.join(homedir(), '.config/spots/google-places.env'));
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!apiKey) throw new Error('Google Places credentials unavailable');

const startedAt = new Date().toISOString();
let requests = 0;
let blocked = false;
const detailCache = new Map();
async function request(call) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    requests++;
    try { return await call(); }
    catch (error) {
      if (/40[13]|429/.test(error.message)) { blocked = true; throw error; }
      if (attempt === 4 || /404/.test(error.message)) throw error;
    }
  }
}
async function details(placeId) {
  if (!detailCache.has(placeId)) detailCache.set(placeId, await request(() => getPlaceDetails({ placeId, apiKey })));
  return detailCache.get(placeId);
}
// Observed in the existing catalog and the mall's public Maps link.
const mall = await details('ChIJV81hu-2hMI4R07Q7dgEZvzE');
if (!/lago\s*verde/i.test(mall.name) || !Number.isFinite(mall.latitude)) throw new Error('Mall reference identity could not be validated');
await fs.writeFile(path.join(dir, 'mall-google.json'), JSON.stringify(mall, null, 2));
const rows = [];
for (const branch of branches) {
  const spot = spots.get(branch.spot_id);
  const name = spot.name;
  const query = `${name.split('|')[0].trim()} Lago Verde Cali`;
  const row = {
    branchId: branch.id, spotId: spot.id, name, slug: branch.slug,
    active: spot.is_active !== false && branch.is_active !== false
      && spot.business_status !== 'permanently_closed' && branch.business_status !== 'permanently_closed',
    current: {
      latitude: branch.latitude, longitude: branch.longitude, address: branch.address,
      mall: branch.mall, neighborhood: branch.neighborhood,
      placeId: branch.google_place_id || null, googleMapsUrl: branch.google_maps_url || null,
    },
    query, candidates: [], existingIdResult: null, errors: [], checkedAt: null,
  };
  const start = performance.now();
  if (!blocked) {
    if (branch.google_place_id) {
      try { row.existingIdResult = await details(branch.google_place_id); }
      catch (error) { row.errors.push(`Existing Place ID: ${error.message}`); }
    }
    if (!blocked) {
      try {
        row.candidates = await request(() => searchPlaces({ query, apiKey,
          latitude: mall.latitude, longitude: mall.longitude, radiusMeters: 2000 }));
        row.checkedAt = new Date().toISOString();
      } catch (error) { row.errors.push(error.message); }
    }
  } else row.errors.push('Not queried after provider auth/quota failure');
  row.elapsedMs = Math.round(performance.now() - start);
  rows.push(row);
  await fs.writeFile(path.join(dir, `${branch.slug}.json`), JSON.stringify(row, null, 2));
  console.log(JSON.stringify({ progress: `${rows.length}/${branches.length}`, name, candidates: row.candidates.length,
    existingIdName: row.existingIdResult?.name, errors: row.errors }));
}
const sourceUnchanged = await fs.readFile(catalogPath, 'utf8') === source;
const audit = { scope: 'All catalog branches assigned to Lago Verde, including inactive branches',
  startedAt, finishedAt: new Date().toISOString(), requests, sourceUnchanged,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), mall, rows };
await fs.writeFile(path.join(dir, 'audit.json'), JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ completed: rows.length, active: rows.filter(row => row.active).length,
  requests, sourceUnchanged, output: path.join(dir, 'audit.json') }));

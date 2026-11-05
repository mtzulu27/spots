import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const catalog = JSON.parse(readFileSync('apps/mobile/public/spots-catalog.json', 'utf8'));
const restaurants = new Map();
for (const branch of catalog.branches) {
  if (!branch.menu_url) continue;
  const url = new URL(branch.menu_url);
  if (!['menupp.co', 'app.menupp.co'].includes(url.hostname)) continue;
  const parts = url.pathname.split('/').filter(Boolean);
  const id = url.hostname === 'menupp.co' ? parts[0] : parts[1];
  if (!id || !/^[a-z0-9_-]+$/i.test(id)) continue;
  if (!restaurants.has(id)) restaurants.set(id, []);
  restaurants.get(id).push(branch.slug);
}
const results = [];
for (const [id, branches] of restaurants) {
  // The public diner app reads this collection. Request only public location fields.
  const url = new URL(`https://firestore.googleapis.com/v1/projects/menupp-next/databases/(default)/documents/restaurants/${id}/locations`);
  url.searchParams.set('pageSize', '100');
  for (const field of ['name', 'address', 'location', 'visibility', 'available']) url.searchParams.append('mask.fieldPaths', field);
  const row = { restaurant: id, source: `https://menupp.co/${id}`, branches };
  try {
    const response = JSON.parse(execFileSync('curl', ['-fsSL', '--max-time', '20', url.href], { encoding: 'utf8', timeout: 22000, maxBuffer: 2000000 }));
    if (response.nextPageToken) throw new Error('Incomplete location list');
    row.locations = (response.documents ?? []).filter(d => d.fields?.visibility?.stringValue !== 'hidden').map(d => ({
      id: d.name.split('/').at(-1), name: d.fields?.name?.stringValue,
      address: d.fields?.address?.stringValue, coordinate: d.fields?.location?.geoPointValue ?? null,
      available: d.fields?.available?.booleanValue,
    }));
    console.log(`${id}: ${row.locations.length} public branches, ${row.locations.filter(l => l.coordinate).length} points`);
  } catch (error) { row.error = error.message; console.log(`${id}: unavailable`); }
  results.push(row);
  writeFileSync('docs/catalog-review/coordinate-menupp-review.json', `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
}

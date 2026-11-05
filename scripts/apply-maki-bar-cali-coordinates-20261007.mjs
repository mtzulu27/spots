import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const query = 'Hotel Intercontinental Cali, Avenida Colombia 2-72, Cali, Colombia';
const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
  headers: { 'User-Agent': 'CodexSpots/1.0', Accept: 'application/json' },
});
if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
const result = (await response.json())[0];
if (!result) throw new Error('No coordinate result');
const latitude = Number(result.lat);
const longitude = Number(result.lon);
const now = new Date().toISOString();
for (const file of [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`]) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const branch = catalog.branches.find((item) => item.slug === 'maki-bar-cali-el-penon');
  if (!branch) throw new Error(`Branch not found in ${file}`);
  branch.latitude = latitude;
  branch.longitude = longitude;
  branch.google_maps_url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
  branch.coordinates_source = query;
  branch.updated_at = now;
  catalog.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
}
console.log(JSON.stringify({ query, latitude, longitude }));

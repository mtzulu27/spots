import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const latitude = 3.4504737;
const longitude = -76.5397555;
const source = 'https://analdex.org/locations/hotel-intercontinental-2/';
const now = new Date().toISOString();

for (const file of [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`]) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const branch = catalog.branches.find((item) => item.slug === 'maki-bar-cali-el-penon');
  if (!branch) throw new Error(`Branch not found in ${file}`);
  branch.latitude = latitude;
  branch.longitude = longitude;
  branch.google_maps_url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  branch.coordinates_source = source;
  branch.updated_at = now;
  catalog.generatedAt = now;
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'maki-bar-cali', branch: 'maki-bar-cali-el-penon', latitude, longitude, source }, null, 2));

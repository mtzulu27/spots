import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const paths = [
  new URL('apps/mobile/public/spots-catalog.json', root),
  new URL('apps/mobile/dist/spots-catalog.json', root),
];
const mapUrl = 'https://www.waze.com/live-map/directions/co/valle-del-cauca/cali/la-romanezca-cafe-restaurante-campanella-plaza?to=place.ChIJhXexTa-hMI4RoRSx0CsrlK0';
const now = new Date().toISOString();

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.slug === 'la-romanezca-pance');
  if (!branch) throw new Error(`La Romanezca Pance not found in ${path.pathname}`);
  branch.google_maps_url = mapUrl;
  branch.source_url = mapUrl;
  branch.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'la-romanezca-pance', mapUrl, updatedAt: now }, null, 2));

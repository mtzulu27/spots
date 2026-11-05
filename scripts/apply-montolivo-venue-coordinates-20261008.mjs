import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const coords = {
  'montolivo-jardin-plaza-cali': [3.36702, -76.527525],
  'montolivo-palmetto-cali': [3.39872, -76.513289],
  'montolivo-unico-outlet-cali': [3.4649791, -76.5008319],
  'montolivo-mallplaza-cali': [3.4126651, -76.5485981],
};
for (const file of [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`]) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches) {
    const pair = coords[branch.slug];
    if (!pair) continue;
    branch.latitude = pair[0];
    branch.longitude = pair[1];
    branch.coordinates_source = 'matched shopping-centre venue coordinate';
    branch.updated_at = new Date().toISOString();
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ updated: Object.keys(coords) }));

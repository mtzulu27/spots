import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const catalogs = [
  `${root}/apps/mobile/public/spots-catalog.json`,
  `${root}/apps/mobile/dist/spots-catalog.json`,
];
const sourceUrl = 'https://photon.komoot.io/api/?q=Campanella%20Plaza%20Pance%20Cali%20Colombia&limit=5';
const latitude = 3.3321416;
const longitude = -76.5331152;

for (const file of catalogs) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const branch = catalog.branches.find((item) => item.slug === 'la-romanezca-pance');
  if (!branch) throw new Error(`Missing branch in ${file}`);
  Object.assign(branch, {
    latitude,
    longitude,
    google_maps_url: sourceUrl,
    coordinates_source: 'Campanella Plaza venue centroid; business-level coordinate unavailable',
    updated_at: new Date().toISOString(),
  });
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'la-romanezca-pance', latitude, longitude, sourceUrl }));

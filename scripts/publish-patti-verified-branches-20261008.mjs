import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const sourceUrl = 'https://www.tripadvisor.es/Restaurant_Review-g297475-d11809606-Reviews-Patti_Gelateria-Cali_Valle_del_Cauca_Department.html';
const verified = new Set([
  'patti-gelateria-el-penon',
  'patti-gelateria-san-antonio',
  'patti-gelateria-ciudad-jardin',
]);

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'patti-gelateria');
  if (!spot) throw new Error(`No se encontro Patti Gelateria en ${path}`);
  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    if (!verified.has(branch.slug)) continue;
    branch.is_active = true;
    branch.source_url = sourceUrl;
    branch.updated_at = now;
  }
  spot.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ spot: 'patti-gelateria', activated: [...verified], sourceUrl }, null, 2));

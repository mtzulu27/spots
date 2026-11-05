import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
for (const file of [
  `${root}/apps/mobile/public/spots-catalog.json`,
  `${root}/apps/mobile/dist/spots-catalog.json`,
]) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((item) => item.slug === 'la-romanezca');
  if (!spot) throw new Error(`Missing La Romanezca in ${file}`);
  spot.is_active = true;
  spot.catalog_status = 'reviewed_with_pending';
  for (const branch of catalog.branches.filter((item) => item.spot_id === spot.id)) {
    branch.is_active = true;
    branch.catalog_status = 'reviewed_with_pending';
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'la-romanezca', active: true }));

import fs from 'node:fs';

for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'cofi-bakery');
  if (!spot) throw new Error(`No se encontró Cofi Bakery en ${file}`);
  spot.is_active = true;
  spot.catalog_status = 'reviewed_with_pending';
  spot.updated_at = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'cofi-bakery', is_active: true }, null, 2));

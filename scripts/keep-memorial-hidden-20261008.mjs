import fs from 'node:fs';

for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'memorial');
  if (!spot) throw new Error(`No se encontró Memorial Cervecería en ${file}`);
  spot.is_active = false;
  spot.business_status = 'permanently_closed';
  spot.catalog_status = 'discontinued';
  spot.updated_at = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'memorial', is_active: false, business_status: 'permanently_closed' }, null, 2));

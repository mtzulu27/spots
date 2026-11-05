import fs from 'node:fs';

for (const path of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((item) => item.slug === 'mugari-lago-verde');
  if (!branch) throw new Error('Mugari branch not found');
  branch.is_active = true;
  branch.business_status = 'OPERATIONAL';
  branch.source_url = 'https://restaurantguru.com/Mugari-Alta-Cocina-Cali';
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'mugari-lago-verde', is_active: true }));

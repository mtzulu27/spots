import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const whatsapp = 'https://wa.me/573193192433';

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((item) => item.slug === 'parisina');
  if (!spot) throw new Error('Parisina spot not found');
  for (const branch of catalog.branches.filter((item) => item.spot_id === spot.id)) {
    branch.whatsapp = whatsapp;
    branch.whatsapp_source = 'https://laparisina.co/wp-content/uploads/2025/06/Catalogo-de-refrigerios-Parisina-2025.pdf';
  }
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ spot: 'parisina', whatsapp }));

import fs from 'node:fs';

const logo = '/place-media/chuzo-de-nando/logo-instagram-cef9f631bb27e5340d14bdc628fc381f5eafd432ae4eec9c6a563eb492743386.jpg';

for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'el-chuzo-de-nando');
  if (!spot) throw new Error(`No se encontró el Chuzo de Nando en ${file}`);
  spot.logo_url = logo;
  spot.is_active = true;
  spot.catalog_status = 'reviewed_with_pending';
  spot.updated_at = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'el-chuzo-de-nando', logo, is_active: true }, null, 2));

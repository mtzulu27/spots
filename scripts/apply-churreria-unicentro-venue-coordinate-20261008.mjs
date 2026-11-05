import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const sourceUrl = 'https://www.rappi.com.co/restaurantes/900386670-la-churreria-antigua';
const latitude = 3.3736;
const longitude = -76.5392;

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.slug === 'la-churreria-antigua-unicentro');
  if (!branch) throw new Error(`No se encontro la sede de La Churreria en ${path}`);
  branch.latitude = latitude;
  branch.longitude = longitude;
  branch.coordinates_source = 'Centro Comercial Unicentro Cali; coordenada de recinto, local EC-21 no geocodificado por separado';
  branch.coordinates_source_url = sourceUrl;
  branch.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'la-churreria-antigua-unicentro', latitude, longitude, sourceUrl }, null, 2));

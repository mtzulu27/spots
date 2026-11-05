import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const sourceUrl = 'https://es.restaurantguru.com/MARANELLO-PASTA-Cali';
const latitude = 3.4351605;
const longitude = -76.5451746;

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.slug === 'maranello-parque-del-perro');
  if (!branch) throw new Error(`No se encontro Maranello Parque del Perro en ${path}`);
  branch.phone = '3136506065';
  branch.latitude = latitude;
  branch.longitude = longitude;
  branch.coordinates_source = 'Parque del Perro, coordenada de recinto cercana a Cra. 34 #3A-83';
  branch.coordinates_source_url = sourceUrl;
  branch.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'maranello-parque-del-perro', phone: '3136506065', latitude, longitude, sourceUrl }, null, 2));

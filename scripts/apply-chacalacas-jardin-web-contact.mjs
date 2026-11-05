import fs from 'node:fs';

const data = {
  address: 'Centro Comercial Jardín Plaza, Cra. 98A #16-200, locales 149-151, Cali',
  phone: '+57 310 4699608',
  website_url: 'https://www.chacalacas.com/contactenos/',
  source_url: 'https://www.waze.com/es/live-map/directions/co/valle-del-cauca/cali/chacalacas-jardin-plaza',
  latitude: 3.36906,
  longitude: -76.52727,
  coordinate_precision: 'shopping_center_reference',
  coordinate_source: 'https://colombia.worldplaces.me/es/shopping-and-retail-in-santiago-de-cali/52187279-jardin-plaza-pagina-oficial.html',
};

for (const path of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((row) => row.slug === 'taqueria-chalacas-jardin-plaza');
  if (!branch) throw new Error('No existe la sede objetivo de Jardín Plaza');
  Object.assign(branch, data, { updated_at: new Date().toISOString() });
  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log('Applied verified Jardín Plaza contact data for Chacalacas.');

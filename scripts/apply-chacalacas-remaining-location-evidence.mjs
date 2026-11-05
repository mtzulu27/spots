import fs from 'node:fs';

const updates = {
  'taqueria-chalacas-granada': {
    address: 'Calle 17 Norte #9-38, Santa Monica Residential, Cali',
    coordinate_precision: 'residential_complex_reference',
    source_url: 'https://www.rappi.com.co/restaurantes/delivery/10978-chacalacas-mexicana',
  },
  'taqueria-chalacas-jairo-varela': {
    address: 'Av. 2 Nte #10-70, tercer nivel, Plazoleta Jairo Varela, Cali',
    latitude: 3.455822,
    longitude: -76.531045,
    coordinate_precision: 'plaza_reference',
    coordinate_source: 'https://commons.wikimedia.org/wiki/File%3APlazoleta_Jairo_Varela.jpg',
    source_url: 'https://web.didiglobal.com/co/food/cali/chacalacas-granada/5764607587006546969/',
  },
};

for (const path of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const [slug, data] of Object.entries(updates)) {
    const branch = catalog.branches.find((row) => row.slug === slug);
    if (!branch) throw new Error(`No existe ${slug}`);
    Object.assign(branch, data, { updated_at: new Date().toISOString() });
  }
  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log('Applied remaining Chacalacas location evidence.');

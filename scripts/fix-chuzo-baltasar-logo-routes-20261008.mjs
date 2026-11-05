import fs from 'node:fs';

const files = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const logoBySlug = {
  'chuzo-de-nando': '/place-media/chuzo-de-nando/logo-instagram-cef9f631bb27e5340d14bdc628fc381f5eafd432ae4eec9c6a563eb492743386.jpg',
  'baltazar-y-siete-lunas': '/place-media/baltazar-y-siete-lunas/logo-instagram-dfcfd2c8a3525da2a845e9692ce73cb3c710073637cd60115a2ef1f5bb4e72c3.jpg',
};

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [slug, logo] of Object.entries(logoBySlug)) {
    const spot = catalog.spots.find((entry) => entry.slug === slug);
    if (!spot) throw new Error(`No se encontró ${slug} en ${file}`);
    spot.logo_url = logo;
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify(logoBySlug, null, 2));

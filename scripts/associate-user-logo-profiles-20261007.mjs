import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const items = [
  ['diletto', 'diletto.pasticceria'],
  ['la-libelula-hotel', 'lalibelula_hotel'],
  ['brunch-duquesa', 'duquesacafebrunch'],
  ['tribal-llanero-lago-verde', 'triballlanero'],
  ['new-anchor-caffe', 'newanchorcaffe'],
  ['guadalupe-cafe', 'guadalupecafe__'],
  ['montallegro-gelateria-italiana', 'montallegro_gelateria_italiana'],
  ['nuevo-leon', 'nuevoleonrooftop'],
  ['huna-huna-social-club', 'hunahunaclub'],
  ['pampa-malbec', 'pampamalbec'],
  ['penelope-martini', 'penelopemartini'],
  ['tom-glen', 'tomglenmex'],
  ['lengua-de-mariposa', 'lenguademariposa'],
  ['hacienda-del-bosque', 'haciendadelbosque'],
  ['saipan-airsoft', 'saipan.airsoft'],
  ['storia-damore', 'storiadamoreco'],
  ['karens-pizza', 'karenspizzaoficial'],
  ['mister-wings', 'misterwings'],
  ['greens-bolos-club', 'greensbolosclub'],
  ['la-fugitiva', 'lafugitiva.co'],
  ['platillos-voladores', 'restauranteplatillosvoladores'],
  ['turk-house', 'turkhousecol'],
  ['vital-bistro', 'vitalbistro.col'],
  ['purist-cafe', 'purist.cafe'],
  ['hoi-an-cocina-vietnamita', 'hoianrestaurante'],
  ['lakasia', 'lakasiaorientalhouse'],
  ['izumi', 'izumirestaurantco'],
];
const now = new Date().toISOString();
for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const path = `${root}/${file}`;
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const [slug, username] of items) {
    const spot = catalog.spots.find((entry) => entry.slug === slug);
    if (!spot) throw new Error(`Missing spot ${slug}`);
    const instagram = `https://www.instagram.com/${username}/`;
    spot.instagram = instagram;
    spot.updated_at = now;
    for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) branch.instagram = instagram;
  }
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(`Associated ${items.length} Instagram profiles.`);

import fs from 'node:fs';

const paths = ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json'];
const map = {
  'chacalacas-pacific-center': 'pacific-center',
  'chacalacas-unicentro': 'unicentro',
  'chacalacas-puerto-125': 'puerto-125',
  'chacalacas-ciudad-jardin': 'ciudad-jardin',
};

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const branch of catalog.branches.filter((row) => map[row.slug])) {
    const key = map[branch.slug];
    const selected = JSON.parse(fs.readFileSync(`docs/catalog-review/benchmarks/chacalacasco/google-${key}.json`, 'utf8')).selected;
    Object.assign(branch, {
      address: selected.address || branch.address,
      phone: selected.internationalPhone || selected.phone || branch.phone,
      latitude: selected.latitude,
      longitude: selected.longitude,
      google_maps_url: selected.googleMapsUrl,
      google_place_id: selected.placeId,
      business_status: selected.businessStatus,
      updated_at: new Date().toISOString(),
    });
  }
  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log('Applied Google Places contacts and coordinates to 4 Chacalacas branches.');

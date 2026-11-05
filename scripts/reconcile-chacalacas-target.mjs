import fs from 'node:fs';

for (const path of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const sourceSpot = catalog.spots.find((spot) => spot.slug === 'chacalacas');
  const targetSpot = catalog.spots.find((spot) => spot.slug === 'taqueria-chalacas');
  if (!sourceSpot || !targetSpot) throw new Error('No se encontraron ambas fichas de Chacalacas');
  const sourceBranches = new Map(catalog.branches.filter((branch) => branch.spot_id === sourceSpot.id).map((branch) => [branch.slug.replace(/^chacalacas-/, ''), branch]));
  for (const branch of catalog.branches.filter((candidate) => candidate.spot_id === targetSpot.id)) {
    const key = branch.slug.replace(/^taqueria-chalacas-/, '');
    const source = sourceBranches.get(key);
    if (!source) continue;
    for (const field of ['menu_url', 'menu_items', 'budget_scenarios', 'min_budget', 'typical_budget', 'max_budget', 'budget_basis', 'menu_calculation_note', 'phone', 'latitude', 'longitude', 'google_maps_url', 'google_place_id', 'business_status']) {
      if (source[field] !== undefined) branch[field] = source[field];
    }
    const googleKey = ['pacific-center', 'unicentro', 'puerto-125', 'ciudad-jardin'].includes(key) ? key : null;
    if (googleKey) {
      const selected = JSON.parse(fs.readFileSync(`docs/catalog-review/benchmarks/chacalacasco/google-${googleKey}.json`, 'utf8')).selected;
      Object.assign(branch, {
        address: selected.address || branch.address,
        phone: selected.internationalPhone || selected.phone || branch.phone,
        latitude: selected.latitude,
        longitude: selected.longitude,
        google_maps_url: selected.googleMapsUrl,
        google_place_id: selected.placeId,
        business_status: selected.businessStatus,
      });
    }
    branch.updated_at = new Date().toISOString();
  }
  targetSpot.updated_at = new Date().toISOString();
  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log('Reconciled Chacalacas data into the target taqueria-chalacas record.');

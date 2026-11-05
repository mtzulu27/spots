import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const catalogPaths = [
  new URL('apps/mobile/public/spots-catalog.json', root),
  new URL('apps/mobile/dist/spots-catalog.json', root),
];
const trackerPath = new URL('docs/spots-ingestion-tracker.json', root);
const reviewedAt = new Date().toISOString();

for (const path of catalogPaths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'joes');
  if (!spot) throw new Error(`Joe's not found in ${path.pathname}`);

  spot.is_active = false;
  spot.business_status = 'permanently_closed';
  spot.updated_at = reviewedAt;

  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    branch.is_active = false;
    branch.business_status = 'permanently_closed';
    branch.updated_at = reviewedAt;
  }

  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
const notes = [
  "El usuario confirmó el 2026-10-07 que Joe's está descontinuado.",
  "Se conserva la ficha histórica, carta y datos de contacto, pero se retira del feed activo.",
  "Restaurant Guru también lo reporta como permanentemente cerrado: https://es.restaurantguru.com/amp/Joes-Diner-Cali",
];
const entry = {
  slug: 'joes',
  name: "Joe's",
  instagram: 'https://www.instagram.com/joesretrodiner/',
  status: 'draft',
  internalTag: 'discontinued-user-confirmed',
  missingFields: [],
  notes,
  lastReviewedAt: reviewedAt,
};
const index = tracker.entries.findIndex((item) => item.slug === 'joes');
if (index === -1) tracker.entries.push(entry);
else tracker.entries[index] = entry;
tracker.updatedAt = reviewedAt;
fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);

console.log(JSON.stringify({ slug: 'joes', status: 'discontinued', reviewedAt }, null, 2));

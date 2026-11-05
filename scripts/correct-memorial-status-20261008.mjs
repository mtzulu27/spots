import fs from 'node:fs';

for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'memorial');
  if (!spot) throw new Error(`No se encontró Memorial Cervecería en ${file}`);
  spot.is_active = true;
  spot.business_status = 'unknown';
  spot.catalog_status = 'reviewed_with_pending';
  spot.updated_at = new Date().toISOString();
  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    branch.is_active = true;
    branch.business_status = 'unknown';
    branch.updated_at = new Date().toISOString();
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

const trackerPath = 'docs/spots-ingestion-tracker.json';
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
const entry = tracker.entries.find((item) => item.slug === 'memorial');
if (entry) {
  entry.status = 'incomplete';
  entry.internalTag = 'followup-contact-menu';
  entry.notes = [...new Set([...(entry.notes || []), 'No se encontró evidencia vigente de cierre; estado reabierto como pendiente de confirmar.'])];
  entry.lastReviewedAt = new Date().toISOString();
}
tracker.updatedAt = new Date().toISOString();
fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);

console.log(JSON.stringify({ slug: 'memorial', is_active: true, business_status: 'unknown' }, null, 2));

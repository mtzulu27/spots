import fs from 'node:fs';

const tracker = JSON.parse(fs.readFileSync('docs/spots-ingestion-tracker.json', 'utf8'));
const discontinued = new Set(
  tracker.entries
    .filter((entry) => entry.internalTag === 'discontinued-user-confirmed')
    .map((entry) => entry.slug),
);

for (const file of ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  let activated = 0;
  for (const spot of catalog.spots) {
    if (discontinued.has(spot.slug)) continue;
    if (spot.business_status === 'permanently_closed') continue;
    if (!spot.logo_url || !spot.cover_image_url) continue;
    if (!spot.is_active) activated += 1;
    spot.is_active = true;
    spot.updated_at = new Date().toISOString();
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`${file}: activated ${activated} targets with verified logo and cover`);
}

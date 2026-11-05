import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const catalogPaths = [
  new URL('apps/mobile/public/spots-catalog.json', root),
  new URL('apps/mobile/dist/spots-catalog.json', root),
];
const report = JSON.parse(fs.readFileSync(new URL('docs/spots-target-completeness-2026-10-07.json', root), 'utf8'));
const tracker = JSON.parse(fs.readFileSync(new URL('docs/spots-ingestion-tracker.json', root), 'utf8'));
const now = new Date().toISOString();
const excluded = new Set(['joes', 'memorial']);
const publishable = report.places
  .filter((place) => place.status === 'complete' && place.slug && !excluded.has(place.slug))
  .map((place) => place.slug);

for (const path of catalogPaths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const spot of catalog.spots) {
    if (!publishable.includes(spot.slug)) continue;
    spot.is_active = true;
    spot.updated_at = now;
    for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
      branch.is_active = true;
      branch.updated_at = now;
    }
  }
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

for (const slug of publishable) {
  const entry = tracker.entries.find((item) => item.slug === slug);
  if (entry) {
    entry.internalTag = 'published-complete';
    entry.lastReviewedAt = now;
  }
}
tracker.updatedAt = now;
fs.writeFileSync(new URL('docs/spots-ingestion-tracker.json', root), `${JSON.stringify(tracker, null, 2)}\n`);
console.log(JSON.stringify({ published: publishable, excluded }, null, 2));

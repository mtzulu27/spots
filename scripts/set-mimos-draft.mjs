import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const NOW = new Date().toISOString();
const SPOT_SLUG = 'mimos';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

for (const catalogPath of CATALOG_PATHS) {
  const catalog = readJson(catalogPath);
  const spot = catalog.spots.find((entry) => entry.slug === SPOT_SLUG);

  if (!spot) {
    throw new Error(`No se encontró ${SPOT_SLUG} en ${catalogPath}`);
  }

  spot.is_active = false;
  spot.updated_at = NOW;

  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    branch.is_active = false;
    branch.updated_at = NOW;
  }

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

if (entry) {
  entry.status = 'draft';
  entry.internalTag = 'draft-low-confidence';
  entry.notes = [
    "Se dejó Mimo's en draft por ahora para sacarlo de la app pública mientras se reevalúa la calidad de la ficha.",
    ...((entry.notes ?? []).filter((note) => !note.toLowerCase().includes('draft'))),
  ];
  entry.lastReviewedAt = NOW;
}

tracker.updatedAt = NOW;
writeJson(TRACKER_PATH, tracker);

console.log(
  JSON.stringify(
    {
      slug: SPOT_SLUG,
      status: 'draft',
      updatedAt: NOW,
    },
    null,
    2,
  ),
);

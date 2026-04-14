import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'combo-burgers';
const REVIEWED_AT = new Date().toISOString();

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
  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    branch.is_active = false;
  }

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

if (entry) {
  entry.status = 'draft';
  entry.internalTag = 'draft';
  entry.lastReviewedAt = REVIEWED_AT;
  entry.notes = [
    'Se pasó Combo a draft por decisión editorial del usuario.',
  ];
}

tracker.updatedAt = REVIEWED_AT;
writeJson(TRACKER_PATH, tracker);

console.log(JSON.stringify({ slug: SPOT_SLUG, status: 'draft' }, null, 2));

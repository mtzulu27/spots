import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'cima-del-viento';
const NEW_NAME = 'Cima del Viento';

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

  // Preserve feed order by keeping timestamps intact.
  spot.name = NEW_NAME;
  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

if (entry) {
  entry.name = NEW_NAME;
  entry.lastReviewedAt = new Date().toISOString();
}

tracker.updatedAt = new Date().toISOString();
writeJson(TRACKER_PATH, tracker);

console.log(JSON.stringify({ slug: SPOT_SLUG, name: NEW_NAME }, null, 2));

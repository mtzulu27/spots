import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
const NOW = '2026-04-14T01:08:00.000Z';

function updateCatalog(catalogPath) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'diletto');

  if (!spot) {
    throw new Error(`No se encontró diletto en ${catalogPath}`);
  }

  spot.is_active = false;
  spot.updated_at = NOW;

  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) {
    branch.is_active = false;
    branch.updated_at = NOW;
  }

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}

function updateTracker() {
  const tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf8'));
  const entries = Array.isArray(tracker.entries) ? tracker.entries : [];
  let entry = entries.find((item) => item.slug === 'diletto');

  if (!entry) {
    entry = {
      slug: 'diletto',
      name: 'Diletto',
      instagram: '',
      status: 'draft',
      internalTag: 'draft-low-confidence',
      missingFields: ['instagram', 'full_address', 'hours', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos'],
      notes: [],
      lastReviewedAt: NOW,
    };
    entries.push(entry);
    tracker.entries = entries;
  }

  entry.status = 'draft';
  entry.internalTag = 'draft-low-confidence';
  entry.lastReviewedAt = NOW;
  entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
  entry.notes.push(
    'Se dejó en draft por baja confianza en la ficha actual y para sacarlo de la app pública hasta revisarlo mejor.',
  );
  tracker.updatedAt = NOW;

  writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n');
}

for (const catalogPath of CATALOG_PATHS) {
  updateCatalog(catalogPath);
}

updateTracker();

console.log(
  JSON.stringify(
    {
      slug: 'diletto',
      status: 'draft',
      updatedAt: NOW,
    },
    null,
    2,
  ),
);

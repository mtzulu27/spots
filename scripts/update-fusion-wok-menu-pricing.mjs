import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
const MENU_URL =
  'https://menupp.co/aldeaasiatica/venue/cJmrnBbRFjYpXqOrbmvh/menu/4a3ed064-fbed-4a8c-877c-b61b585c25f3?category=2EsCIV3obOHZlYmX0CTK';
const NOW = '2026-04-14T01:32:00.000Z';

for (const catalogPath of CATALOG_PATHS) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'fusion-wok');

  if (!spot) {
    throw new Error(`No se encontró fusion-wok en ${catalogPath}`);
  }

  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id && entry.is_active)) {
    branch.menu_url = MENU_URL;
    branch.min_budget = 45000;
    branch.updated_at = NOW;
  }

  spot.updated_at = NOW;

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}

const tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'fusion-wok');

if (entry) {
  entry.lastReviewedAt = NOW;
  entry.internalTag = 'followup-hours-max-budget-brand-scope';
  entry.missingFields = ['hours_by_branch', 'max_budget'];
  entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
  entry.notes.push(
    'Se actualizó el menú a un link específico de Fusion Wok dentro de Aldea Asiática y se aterrizó el presupuesto aproximado por persona a 45.000 COP.',
  );
}

tracker.updatedAt = NOW;
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n');

console.log(
  JSON.stringify(
    {
      slug: 'fusion-wok',
      menu_url: MENU_URL,
      min_budget: 45000,
      updatedAt: NOW,
    },
    null,
    2,
  ),
);

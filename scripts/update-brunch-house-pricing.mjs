import { readFileSync, writeFileSync } from 'node:fs';

const catalogPaths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];
const trackerPath =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const now = new Date().toISOString();

for (const catalogPath of catalogPaths) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const branches = catalog.branches.filter(
    (branch) =>
      branch.slug === 'brunch-house-santa-elena-cali' ||
      branch.slug === 'brunch-house-bio-mall-cali',
  );

  for (const branch of branches) {
    branch.min_budget = 38000;
    branch.max_budget = 65000;
    branch.updated_at = now;
  }

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}

const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
const entry = tracker.entries.find((item) => item.slug === 'brunch-house');

if (entry) {
  entry.internalTag = 'followup-whatsapp';
  entry.missingFields = entry.missingFields.filter(
    (field) => field !== 'min_budget' && field !== 'max_budget',
  );
  entry.notes = [
    'El presupuesto mínimo se aterrizó a 38.000 COP por persona como visita realista de plato fuerte + bebida, no como el ítem más barato del menú.',
    ...entry.notes.filter((note) => !note.toLowerCase().includes('presupuesto')),
  ];
  entry.lastReviewedAt = now;
  tracker.updatedAt = now;
  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
}

console.log('Brunch’s House pricing actualizado.');

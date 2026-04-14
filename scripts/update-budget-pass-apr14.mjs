import fs from 'node:fs';

const catalogPaths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const branchBudgetBySlug = new Map([
  ['natal-coffee-cali', 32000],
  ['hamburgo-palmas-mall-cali', 30000],
  ['hamburgo-jamundi', 30000],
  ['baoku-cali', 37000],
  ['baoku-puerto-125-cali', 37000],
  ['baoku-granada-cali', 37000],
  ['baoku-las-velas-cali', 37000],
  ['baoku-parque-del-perro-cali', 37000],
  ['baoku-pacific-mall-cali', 37000],
  ['sabor-gourmet-cali', 30000],
  ['don-samuel-cali', 30000],
]);

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

for (const catalogPath of catalogPaths) {
  const catalog = readJson(catalogPath);

  for (const branch of catalog.branches) {
    const nextMinBudget = branchBudgetBySlug.get(branch.slug);
    if (!nextMinBudget) continue;
    branch.min_budget = nextMinBudget;
  }

  writeJson(catalogPath, catalog);
}

const tracker = readJson(trackerPath);
const entries = tracker.entries ?? [];

function updateEntry(slug, updater) {
  const entry = entries.find((item) => item.slug === slug);
  if (!entry) return;
  updater(entry);
}

function removeMissingField(entry, field) {
  entry.missingFields = (entry.missingFields ?? []).filter((item) => item !== field);
}

function upsertNote(entry, note) {
  const notes = entry.notes ?? [];
  if (!notes.includes(note)) notes.push(note);
  entry.notes = notes;
}

updateEntry('natal-coffee', (entry) => {
  removeMissingField(entry, 'min_budget');
  upsertNote(
    entry,
    'Se ajustó el min_budget a ~32.000 COP / pers. usando la lectura parcial del menú renderizado y un criterio editorial de visita realista.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

updateEntry('hamburgo', (entry) => {
  upsertNote(
    entry,
    'El scraper ya logró leer precios útiles de Menüpp y se ajustó el min_budget a ~30.000 COP / pers.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

updateEntry('baoku', (entry) => {
  removeMissingField(entry, 'min_budget');
  upsertNote(
    entry,
    'Se ajustó el min_budget a ~37.000 COP / pers. con base en los precios visibles que sí soltó el menú específico de Baoku.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

updateEntry('sabor-gourmet', (entry) => {
  removeMissingField(entry, 'min_budget');
  entry.internalTag = 'followup-max-budget-coordinates-order-preserved';
  upsertNote(
    entry,
    'El scraper ya logró leer precios útiles de Menüpp y se ajustó el min_budget a ~30.000 COP / pers. con criterio editorial de comida + bebida.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

updateEntry('namaste', (entry) => {
  upsertNote(
    entry,
    'Se reintentó la lectura del menú de Canva y sigue bloqueada en la capa de loading, así que el budget quedó pendiente por falta de precios confiables.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

updateEntry('don-samuel', (entry) => {
  removeMissingField(entry, 'min_budget');
  upsertNote(
    entry,
    'Se revisaron precios visibles del menú y se ajustó el min_budget a ~30.000 COP / pers. con criterio editorial de postre/porción + bebida.',
  );
  entry.lastReviewedAt = new Date().toISOString();
});

tracker.updatedAt = new Date().toISOString();
writeJson(trackerPath, tracker);

console.log('Budget pass applied for Natal, Hamburgo, Baoku, Sabor Gourmet, Namaste, and Don Samuel tracker notes.');

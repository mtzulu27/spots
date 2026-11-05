import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const catalogPaths = [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`];
const trackerPath = `${root}/docs/spots-ingestion-tracker.json`;
const now = new Date().toISOString();

const source = {
  natal: 'https://www.rappi.com.co/restaurantes/900402850-natal-coffee',
  montolivo: 'https://preweb.didiglobal.com/co/food/cali/montolivo-unicentro-cali/5764609705629189886/',
  chocolatada: 'https://www.rappi.com.co/restaurantes/900428603-la-chocolatada',
};

const sets = {
  natal: [
    ['Combo Bowl', 41900, 'combos'],
    ['Camarones Apanados', 29500, 'entradas'],
    ['Spring Roll', 29000, 'entradas'],
    ['Clásica', 28000, 'hamburguesas'],
  ],
  montolivo: [
    ['Arma tu Plato con Solomo en Salsa de Champiñones', 40000, 'armatuplato'],
    ['Arma tu Plato con Cordon Bleu', 33500, 'armatuplato'],
    ['Arma tu Plato con Milanesa de Pollo', 33000, 'armatuplato'],
    ['Pescado al Limón', 27000, 'armatuplato'],
    ['Lombarda', 30500, 'combinados'],
    ['Torta de Chocolate', 7500, 'postres'],
  ],
  chocolatada: [
    ['Calentado tradicional + Sprite 400 ml', 11300, 'combos'],
    ['Papa rellena + Coca-Cola 400 ml', 12500, 'combos'],
    ['Chorizo santarrosano + Coca-Cola 400 ml', 12500, 'combos'],
    ['Omelete especial + Del Valle', 26300, 'combos'],
    ['Aborrajado + Coca-Cola 400 ml', 12500, 'combos'],
  ],
};

function menuItems(items, url) {
  return items.map(([name, price, category]) => ({ name, price, category, menuSection: category, sourceUrl: url, verifiedAt: now, calculationIncluded: true }));
}
function scenarios(items, name) {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  return [
    ['Plan ligero', sorted[0]],
    ['Plan completo', sorted[Math.floor(sorted.length / 2)]],
    ['Plan especial', sorted[sorted.length - 1]],
  ].map(([concept, item]) => ({ concept: `${concept} en ${name}`, note: 'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.', lines: [{ name: item.name, category: item.category, quantity: 1, groupSize: 1 }] }));
}

for (const catalogPath of catalogPaths) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const updates = [
    ['natal-coffee', 'natal-coffee-cali', 'natal', 'Natal Coffee'],
    ['montolivo', 'montolivo-unico-outlet-cali', 'montolivo', 'Montolivo'],
    ['la-chocolatada', 'la-chocolatada-ciudad-jardin', 'chocolatada', 'La Chocolatada'],
  ];
  for (const [slug, branchSlug, key, name] of updates) {
    const branch = catalog.branches.find((entry) => entry.slug === branchSlug);
    if (!branch) continue;
    const items = menuItems(sets[key], source[key]);
    branch.menu_items = items;
    branch.budget_scenarios = scenarios(sets[key].map(([itemName, price, category]) => ({ name: itemName, price, category })), name);
    branch.budget_basis = `Precios públicos consultados en ${source[key]}; escenarios de referencia editorial.`;
    branch.menu_url = source[key];
    branch.updated_at = now;
  }
  catalog.generatedAt = now;
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
for (const slug of ['natal-coffee', 'montolivo', 'la-chocolatada']) {
  const entry = tracker.entries?.find((item) => item.slug === slug);
  if (!entry) continue;
  entry.lastReviewedAt = now;
  entry.notes = [...new Set([...(entry.notes || []), 'Carta y escenarios integrados desde fuente pública con precios visibles.'])];
}
tracker.updatedAt = now;
fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);
console.log(JSON.stringify({ updated: ['natal-coffee', 'montolivo', 'la-chocolatada'], sources: source }));

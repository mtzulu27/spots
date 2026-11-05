import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const paths = [
  `${root}/apps/mobile/public/spots-catalog.json`,
  `${root}/apps/mobile/dist/spots-catalog.json`,
];
const now = new Date().toISOString();
const menuUrl = 'https://www.rappi.com.co/restaurantes/900095888-maki-bar';
const venueUrl = 'https://www.tripadvisor.co/Restaurant_Review-g297475-d26660845-Reviews-Maki_Bar_Cali-Cali_Valle_del_Cauca_Department.html';
const rows = [
  ['Philadelphia roll', 46000, 'sushi'],
  ['California roll', 46000, 'sushi'],
  ['Dynamite roll', 46000, 'sushi'],
  ['Salmón skin roll', 46000, 'sushi'],
  ['Veggie roll', 46000, 'sushi'],
  ['Ebi fry roll', 52000, 'sushi'],
];
const menu = rows.map(([name, price, category]) => ({
  name,
  price,
  category,
  menuSection: category,
  sourceUrl: menuUrl,
  verifiedAt: now,
  calculationIncluded: true,
}));
const sorted = [...rows].sort((a, b) => a[1] - b[1]);
const budget = [
  ['Plan ligero', sorted[0]],
  ['Plan completo', sorted[3]],
  ['Plan especial', sorted.at(-1)],
].map(([label, row]) => ({
  concept: `${label} en Maki Bar Cali`,
  note: 'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.',
  lines: [{ name: row[0], category: row[2], quantity: 1, groupSize: 1 }],
}));

for (const file of paths) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches || []) {
    if (branch.slug !== 'maki-bar-cali-el-penon') continue;
    branch.menu_items = menu;
    branch.budget_scenarios = budget;
    branch.budget_basis = `Precios públicos consultados en ${menuUrl}; dirección, teléfono y horarios contrastados en ${venueUrl}.`;
    branch.menu_url = menuUrl;
    branch.phone = '+57 318 626 5449';
    branch.hours = 'Lun-Sáb 12:00-21:30 · Dom cerrado';
    branch.address = 'Av. Colombia #2-72, Hotel Intercontinental Cali, El Peñón, Cali';
    branch.updated_at = now;
  }
  catalog.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
}

const trackerPath = `${root}/docs/spots-ingestion-tracker.json`;
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'maki-bar-cali');
if (entry) {
  entry.notes = [...new Set([
    ...(entry.notes || []),
    'Carta, precios, teléfono, dirección y horarios integrados desde Rappi y Tripadvisor.',
  ])];
}
tracker.updatedAt = now;
fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
console.log('updated maki-bar-cali-el-penon');

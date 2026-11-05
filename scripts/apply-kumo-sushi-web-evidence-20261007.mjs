import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const paths = [
  new URL('apps/mobile/public/spots-catalog.json', root),
  new URL('apps/mobile/dist/spots-catalog.json', root),
];
const sourceUrl = 'https://www.rappi.com.co/restaurantes/900422289-kumo-sushi-bar';
const now = new Date().toISOString();
const rows = [
  ['Edamame Ahumado', 32000, 'Entradas'],
  ['Ostión', 51000, 'Sushis'],
  ['Inazuma', 51000, 'Sushis'],
  ['Arashi', 51000, 'Sushis'],
  ['Kumo', 51000, 'Sushis'],
  ['Parmigiano', 57000, 'Sushis'],
  ['Nikú', 74000, 'Sushis'],
  ['Bretaña 300 ml', 9000, 'Bebidas'],
  ['Coca Cola Original 300ML', 9000, 'Bebidas'],
  ['Coca-Cola ZERO 300 ml', 10000, 'Bebidas'],
  ['Manantial Sin Gas 300 ml', 9000, 'Bebidas'],
];
const items = rows.map(([name, price, menuSection]) => ({
  name, price, category: menuSection === 'Bebidas' ? 'drinks' : menuSection === 'Entradas' ? 'starters' : 'mains',
  menuSection, sourceUrl, verifiedAt: now, calculationIncluded: true,
}));
const budgets = [
  { concept: 'Parche tranqui en Kumo Sushi Bar', note: 'Referencia calculada con precios públicos; no es consumo mínimo ni promedio.', lines: [{ name: 'Edamame Ahumado', category: 'starters', quantity: 1, groupSize: 1 }, { name: 'Bretaña 300 ml', category: 'drinks', quantity: 1, groupSize: 1 }] },
  { concept: 'Parche completo en Kumo Sushi Bar', note: 'Referencia calculada con precios públicos; no es consumo mínimo ni promedio.', lines: [{ name: 'Kumo', category: 'mains', quantity: 1, groupSize: 1 }, { name: 'Coca Cola Original 300ML', category: 'drinks', quantity: 1, groupSize: 1 }] },
  { concept: 'Con toda en Kumo Sushi Bar', note: 'Referencia calculada con precios públicos; no es consumo mínimo ni promedio.', lines: [{ name: 'Nikú', category: 'mains', quantity: 1, groupSize: 1 }, { name: 'Edamame Ahumado', category: 'starters', quantity: 1, groupSize: 1 }, { name: 'Coca-Cola ZERO 300 ml', category: 'drinks', quantity: 1, groupSize: 1 }] },
];

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'kumo-sushi-bar');
  const branch = catalog.branches.find((entry) => entry.slug === 'kumo-sushi-bar-ciudad-jardin');
  if (!spot || !branch) throw new Error(`Kumo not found in ${path.pathname}`);
  Object.assign(spot, { is_active: true, catalog_status: 'reviewed', updated_at: now });
  Object.assign(branch, {
    phone: '+57 300 151 2464',
    menu_items: items,
    budget_scenarios: budgets,
    min_budget: 41000,
    typical_budget: 83000,
    max_budget: 141000,
    budget_basis: `Precios públicos consultados en ${sourceUrl}; escenarios de referencia editorial.`,
    menu_calculation_note: 'El restaurante puede actualizar los precios.',
    latitude: 3.3647548,
    longitude: -76.5325092,
    google_maps_url: 'https://www.solazplaza.com/',
    hours: 'Lun-Jue 12:00-22:00 · Vie-Sáb 12:00-23:00 · Dom 12:00-22:00',
    is_active: true,
    updated_at: now,
  });
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'kumo-sushi-bar', menuItems: items.length, published: true, updatedAt: now }, null, 2));

import fs from 'node:fs';
const root = '/Users/mateo/Documents/Playground';
const paths = [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`];
const now = new Date().toISOString();
const data = {
  'parisina-cali': {
    url: 'https://www.rappi.com.co/restaurantes/900442515-parisina',
    items: [['Arma tu crepe salada', 32000, 'crepes'], ['Arma tu baguette', 35000, 'baguettes'], ['Canape brie', 26000, 'entradas'], ['Canape caprese', 22000, 'entradas'], ['Canape rivoli', 22000, 'entradas']],
  },
  'patti-gelateria-el-penon': {
    url: 'https://www.rappi.com.co/restaurantes/40000055-patti-gelateria',
    items: [['Bowl gelato 14 oz', 13500, 'gelato'], ['Bowl gelato sin azucar 14 oz', 15000, 'gelato'], ['Patti bowl gelato 16 oz sin azucar', 25500, 'gelato'], ['Brownie de Milo', 7500, 'postres'], ['Agua Patti 610 ml', 6500, 'bebidas']],
  },
};
function items(rows, url) { return rows.map(([name, price, category]) => ({ name, price, category, menuSection: category, sourceUrl: url, verifiedAt: now, calculationIncluded: true })); }
function budgets(rows, name) { const sorted = [...rows].sort((a, b) => a[1] - b[1]); return [['Plan ligero', sorted[0]], ['Plan completo', sorted[Math.floor(sorted.length / 2)]], ['Plan especial', sorted.at(-1)]].map(([label, row]) => ({ concept: `${label} en ${name}`, note: 'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.', lines: [{ name: row[0], category: row[2], quantity: 1, groupSize: 1 }] })); }
for (const file of paths) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches || []) {
    const value = data[branch.slug]; if (!value) continue;
    branch.menu_items = items(value.items, value.url); branch.budget_scenarios = budgets(value.items, branch.name || branch.slug); branch.budget_basis = `Precios públicos consultados en ${value.url}; escenarios de referencia editorial.`; branch.menu_url = value.url; branch.updated_at = now;
  }
  catalog.generatedAt = now; fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
const trackerPath = `${root}/docs/spots-ingestion-tracker.json`; const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
for (const slug of ['parisina', 'patti-gelateria']) { const entry = tracker.entries?.find((item) => item.slug === slug); if (entry) entry.notes = [...new Set([...(entry.notes || []), 'Carta y escenarios integrados desde menú público con precios visibles.'])]; }
tracker.updatedAt = now; fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);
console.log(JSON.stringify({ updated: Object.keys(data) }));

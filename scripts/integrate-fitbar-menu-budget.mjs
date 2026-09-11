import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const sourcePath = 'docs/catalog-review/benchmarks/fitbar-menupp-links-2026-09-10T15-58-55-925Z.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const menu = source.menus[0];
const categoryById = Object.fromEntries(menu.categories.map(category => [category.id, category.name]));
const categoryMap = name => /Bebidas|Smoothies/.test(name) ? 'drinks' : /Adiciones/.test(name) ? 'extras' : 'mains';
const seen = new Set();
const items = menu.products
  .filter(product => !product.disabled && product.price?.[0]?.price && !product.price[0].disable)
  .map(product => {
    const menuSection = categoryById[product.product_category] || 'Carta';
    const category = categoryMap(menuSection);
    const name = product.product_name.trim();
    return { name, price: Number(product.price[0].price), category, menuSection, sourceUrl: menu.source, verifiedAt: source.checkedAt, unit: 'unidad', calculationIncluded: true };
  })
  .filter(item => {
    const key = `${item.name}|${item.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
const lines = (entries) => entries.map(([name, category]) => ({ name, category, quantity: 1, groupSize: 1 }));
const scenarios = [
  { concept: 'Parche tranqui', note: 'Un desayuno sencillo con bebida para arrancar el día sin complicarse.', lines: lines([['Huevos al Gusto', 'mains'], ['Agua Manantial', 'drinks']]) },
  { concept: 'Parche completo', note: 'Un plato más completo con una bebida refrescante para quedarse parchando.', lines: lines([['Avocado Smash Toast', 'mains'], ['Soda Mango Biche', 'drinks']]) },
  { concept: 'Con toda', note: 'Un bowl abundante y un smoothie con proteína para una comida completa.', lines: lines([['Solomito Bowl', 'mains'], ['Purple Power', 'drinks']]) },
];
const priceFor = line => items.find(item => item.name === line.name && item.category === line.category)?.price ?? 0;
const total = scenario => scenario.lines.reduce((sum, line) => sum + priceFor(line) * line.quantity, 0);
if (items.length < 25 || scenarios.some(scenario => !scenario.lines.every(line => priceFor(line) > 0))) throw new Error('Carta incompleta o productos de escenario no encontrados');
const branch = catalog.branches.find(item => item.id === 5133);
if (!branch) throw new Error('No se encontró la sede activa de Fit Bar');
const now = new Date().toISOString();
Object.assign(branch, {
  menu_url: menu.source,
  menu_items: items,
  menu_items_verified_at: source.checkedAt,
  budget_scenarios: scenarios,
  min_budget: total(scenarios[0]),
  typical_budget: total(scenarios[0]),
  max_budget: total(scenarios[2]),
  budget_basis: 'Referencia por persona: desayuno sencillo y bebida en Parche tranqui; no es promedio de la carta.',
  menu_calculation_note: 'Carta oficial de Menupp; el restaurante puede actualizar los precios.',
  missing_fields: [...new Set((branch.missing_fields || []).filter(field => field !== 'menu_vigente' && field !== 'menu_items' && field !== 'budget_scenarios'))],
  updated_at: now,
});
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync('docs/catalog-review/benchmarks/protein.fitbar/integration.json', `${JSON.stringify({ status: 'integrated', spotId: 3647, branchId: 5133, menuItems: items.length, scenarios: scenarios.map(scenario => ({ concept: scenario.concept, total: total(scenario) })), source: menu.source, integratedAt: now }, null, 2)}\n`);
console.log(JSON.stringify({ status: 'integrated', menuItems: items.length, scenarios: scenarios.map(scenario => ({ concept: scenario.concept, total: total(scenario) })) }, null, 2));

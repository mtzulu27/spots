import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const reportPath = 'docs/catalog-review/benchmarks/chacalacas-app-menupp-QaHfFtiGuc4uJz3suoHY-2026-09-08T00-20-40-222Z.json';
const sourceUrl = 'https://app.menupp.co/restaurant/chacalacas/menu/QaHfFtiGuc4uJz3suoHY';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const spot = catalog.spots.find((row) => row.slug === 'chacalacas');
if (!spot) throw new Error('No existe Chacalacas');
const categoryById = Object.fromEntries(report.menu.categories.map((row) => [row.id, row.name?.trim() || 'Carta']));
const now = new Date().toISOString();
const category = (name) => /entrada|para compartir/i.test(name) ? 'starters' : 'mains';
const items = [];
for (const product of report.menu.products.filter((row) => !row.disabled)) {
  const prices = Array.isArray(product.price) ? product.price : [{price: product.price?.price ?? product.price, label: ''}];
  for (const variant of prices) {
    const price = Number(variant.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const name = product.product_name?.trim();
    if (!name) continue;
    const presentation = variant.label?.trim() || 'Plato';
    items.push({name: variant.label ? `${name} - ${presentation}` : name, price, category: category(categoryById[product.product_category] || ''), presentation, unit: 'unidad', menuSection: categoryById[product.product_category] || 'Carta', sourceUrl, verifiedAt: now, calculationIncluded: true, priceStatus: 'fixed'});
  }
}
const byName = new Map(items.map((item) => [item.name, item]));
const line = (name, categoryName = 'mains', groupSize = 1) => {
  if (!byName.has(name)) throw new Error(`Producto no encontrado: ${name}`);
  return {name, category: categoryName, quantity: 1, groupSize};
};
const scenarios = [
  {concept: 'Comida mexicana', note: 'Un plato fuerte individual de la carta.', lines: [line('Taco Gobernador de Camarón')]},
  {concept: 'Parche para compartir', note: 'Un plato fuerte individual y una entrada para compartir entre dos.', lines: [line('Bondiola Jalisco'), line('Guacamole Chacalacas', 'starters', 2)]},
  {concept: 'Parche completo', note: 'Un plato fuerte individual y un plato para compartir entre dos.', lines: [line('Costillas Nuevo México'), line('Molcajete Gratinado Deshebrado - Res', 'starters', 2)]},
];
const budgets = {min: 35200, typical: 85250, max: 122350};
for (const branch of catalog.branches.filter((row) => row.spot_id === spot.id)) {
  branch.menu_url = sourceUrl;
  branch.menu_items = items;
  branch.budget_scenarios = scenarios;
  branch.min_budget = budgets.min;
  branch.typical_budget = budgets.typical;
  branch.max_budget = budgets.max;
  branch.budget_basis = 'Parche tranqui: Taco Gobernador de Camarón. La carta revisada no mostró bebidas utilizables, por eso el cálculo solo incluye comida.';
  branch.menu_calculation_note = 'Precios extraídos de la carta regular de Menupp. No incluye bebidas porque no fueron publicadas en esta carta.';
  branch.missing_fields = [...new Set((branch.missing_fields || []).filter((field) => field !== 'regular_menu_prices').concat(['drinks_menu', 'holiday_hours']))];
  branch.updated_at = now;
}
spot.updated_at = now;
spot.missing_fields = [...new Set((spot.missing_fields || []).filter((field) => field !== 'regular_menu_prices').concat(['drinks_menu', 'holiday_hours']))];
catalog.generatedAt = now;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const consolidatedPath = 'docs/catalog-review/benchmarks/chacalacasco/consolidated.json';
const consolidated = JSON.parse(fs.readFileSync(consolidatedPath, 'utf8'));
consolidated.updatedAt = now;
consolidated.menu = {source: sourceUrl, products: items, priceCount: items.length, scope: 'regular_menu'};
consolidated.budget = budgets;
consolidated.pending = [...new Set((consolidated.pending || []).filter((field) => field !== 'regular_menu_prices').concat(['drinks_menu', 'holiday_hours']))];
fs.writeFileSync(consolidatedPath, JSON.stringify(consolidated, null, 2) + '\n');
console.log(JSON.stringify({status: 'regular_menu_integrated', spot: spot.slug, branches: catalog.branches.filter((row) => row.spot_id === spot.id).length, menuItems: items.length, budgets}, null, 2));

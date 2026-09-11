import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const foodReport = JSON.parse(fs.readFileSync('docs/catalog-review/benchmarks/chacalacas-app-menupp-QaHfFtiGuc4uJz3suoHY-2026-09-08T00-20-40-222Z.json', 'utf8'));
const drinkReport = JSON.parse(fs.readFileSync('docs/catalog-review/benchmarks/chacalacas-app-menupp-h4tdly2n2858QDOYRZPa-2026-09-08T00-22-47-747Z.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const spot = catalog.spots.find((row) => row.slug === 'chacalacas');
const now = new Date().toISOString();
const normalize = (report, sourceUrl, type) => {
  const categoryById = Object.fromEntries(report.menu.categories.map((row) => [row.id, row.name?.trim() || 'Carta']));
  const result = [];
  for (const product of report.menu.products.filter((row) => !row.disabled)) {
    const prices = Array.isArray(product.price) ? product.price : [{price: product.price?.price ?? product.price, label: ''}];
    for (const variant of prices) {
      const price = Number(variant.price);
      if (!Number.isFinite(price) || price <= 0 || !product.product_name?.trim()) continue;
      const presentation = variant.label?.trim() || 'Unidad';
      result.push({name: variant.label ? `${product.product_name.trim()} - ${presentation}` : product.product_name.trim(), price, category: type, presentation, unit: 'unidad', menuSection: categoryById[product.product_category] || 'Carta', sourceUrl, verifiedAt: now, calculationIncluded: true, priceStatus: 'fixed'});
    }
  }
  return result;
};
const food = normalize(foodReport, 'https://app.menupp.co/restaurant/chacalacas/menu/QaHfFtiGuc4uJz3suoHY', 'mains');
const drinks = normalize(drinkReport, 'https://app.menupp.co/restaurant/chacalacas/menu/h4tdly2n2858QDOYRZPa', 'drinks');
const items = [...food, ...drinks];
const names = new Set(items.map((item) => item.name));
const line = (name, category, groupSize = 1) => {
  if (!names.has(name)) throw new Error(`Producto no encontrado: ${name}`);
  return {name, category, quantity: 1, groupSize};
};
const scenarios = [
  {concept: 'Comida mexicana', note: 'Un plato fuerte y una bebida individual.', lines: [line('Taco Gobernador de Camarón', 'mains'), line('Limonada Natural', 'drinks')]},
  {concept: 'Parche para compartir', note: 'Un plato fuerte, una entrada para compartir entre dos y una bebida individual.', lines: [line('Bondiola Jalisco', 'mains'), line('Guacamole Chacalacas', 'starters', 2), line('Limonada de Mango Viche', 'drinks')]},
  {concept: 'Parche completo', note: 'Un plato fuerte, un plato para compartir entre dos y un cóctel individual.', lines: [line('Costillas Nuevo México', 'mains'), line('Molcajete Gratinado Deshebrado - Res', 'starters', 2), line('Mojito Cubano', 'drinks')]},
];
for (const branch of catalog.branches.filter((row) => row.spot_id === spot.id)) {
  branch.menu_items = items;
  branch.menu_url = 'https://app.menupp.co/restaurant/chacalacas/menu/QaHfFtiGuc4uJz3suoHY';
  branch.budget_scenarios = scenarios;
  branch.min_budget = 45100;
  branch.typical_budget = 100150;
  branch.max_budget = 159150;
  branch.budget_basis = 'Parche tranqui: Taco Gobernador de Camarón + Limonada Natural.';
  branch.menu_calculation_note = 'Precios extraídos de las cartas regulares de comida y bebidas de Menupp. No incluye propina ni promociones.';
  branch.missing_fields = [...new Set((branch.missing_fields || []).filter((field) => field !== 'drinks_menu'))];
  branch.updated_at = now;
}
spot.updated_at = now;
spot.missing_fields = [...new Set((spot.missing_fields || []).filter((field) => field !== 'drinks_menu'))];
catalog.generatedAt = now;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const consolidatedPath = 'docs/catalog-review/benchmarks/chacalacasco/consolidated.json';
const consolidated = JSON.parse(fs.readFileSync(consolidatedPath, 'utf8'));
consolidated.updatedAt = now;
consolidated.menu = {sources: [foodReport.source, drinkReport.source], products: items, foodCount: food.length, drinkCount: drinks.length, scope: 'regular_food_and_drinks'};
consolidated.budget = {min: 45100, typical: 100150, max: 159150};
consolidated.pending = [...new Set((consolidated.pending || []).filter((field) => field !== 'drinks_menu'))];
fs.writeFileSync(consolidatedPath, JSON.stringify(consolidated, null, 2) + '\n');
console.log(JSON.stringify({status: 'drinks_integrated', branches: catalog.branches.filter((row) => row.spot_id === spot.id).length, foodItems: food.length, drinkItems: drinks.length, budgets: {min: 45100, typical: 100150, max: 159150}}, null, 2));

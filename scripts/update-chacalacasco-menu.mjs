import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const reportPath = 'docs/catalog-review/benchmarks/chacalacas-app-menupp-9R9TwcZIWTFLuQdA3N9z-2026-09-08T00-18-17-464Z.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const spot = catalog.spots.find((row) => row.slug === 'chacalacas');
if (!spot) throw new Error('No existe la ficha de Chacalacas');
const menu = report.menu;
const categoryById = Object.fromEntries(menu.categories.map((row) => [row.id, row.name?.trim() || 'Carta']));
const verifiedAt = new Date().toISOString();
const items = menu.products
  .filter((product) => !product.disabled && Number(product.price?.price ?? product.price) > 0)
  .map((product) => ({
    name: product.product_name?.trim() || 'Producto sin nombre',
    price: Number(product.price?.price ?? product.price),
    category: 'packages',
    menuSection: categoryById[product.product_category] || 'Planes de celebración',
    presentation: 'Plan de celebración',
    unit: 'plan',
    sourceUrl: report.source,
    verifiedAt,
    calculationIncluded: false,
    priceStatus: 'fixed',
    sourceScope: 'Carta pública de planes de celebración; no equivale a consumo normal por persona',
  }));
for (const branch of catalog.branches.filter((row) => row.spot_id === spot.id)) {
  branch.menu_url = report.source;
  branch.menu_items = items;
  branch.menu_calculation_note = 'La carta pública encontrada contiene planes de celebración. Sus precios se conservan como referencia, pero no se usan para calcular una visita normal por persona.';
  branch.budget_scenarios = [];
  branch.min_budget = 0;
  branch.max_budget = 0;
  branch.typical_budget = 0;
  branch.budget_basis = 'Presupuesto por confirmar: la carta pública disponible corresponde a planes de celebración, no a un consumo normal por persona.';
  branch.catalog_status = 'reviewed_with_pending';
  branch.missing_fields = [...new Set((branch.missing_fields || []).filter((field) => field !== 'menu_prices').concat(['regular_menu_prices']))];
  branch.updated_at = verifiedAt;
}
spot.updated_at = verifiedAt;
spot.catalog_status = 'reviewed_with_pending';
spot.missing_fields = [...new Set((spot.missing_fields || []).filter((field) => field !== 'menu_prices').concat(['regular_menu_prices']))];
catalog.generatedAt = verifiedAt;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const consolidatedPath = 'docs/catalog-review/benchmarks/chacalacasco/consolidated.json';
const consolidated = JSON.parse(fs.readFileSync(consolidatedPath, 'utf8'));
consolidated.updatedAt = verifiedAt;
consolidated.menu = {source: report.source, products: items, priceCount: items.length, scope: 'celebration_plans_only'};
consolidated.pending = [...new Set((consolidated.pending || []).filter((field) => field !== 'menu_prices').concat(['regular_menu_prices']))];
fs.writeFileSync(consolidatedPath, JSON.stringify(consolidated, null, 2) + '\n');
console.log(JSON.stringify({status: 'menu_updated', spot: spot.slug, branches: catalog.branches.filter((row) => row.spot_id === spot.id).length, pricedItems: items.length, budget: 'pending_regular_menu'}, null, 2));

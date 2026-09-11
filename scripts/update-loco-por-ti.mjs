import fs from 'node:fs';

const file = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const spot = catalog.spots.find((item) => item.slug === 'loco-por-ti');
const branch = catalog.branches.find((item) => item.slug === 'loco-por-ti-el-penon');
const report = JSON.parse(fs.readFileSync(fs.readdirSync('docs/catalog-review/benchmarks').filter((x) => x.startsWith('locoporti-menupp-links-')).sort().pop().replace(/^/, 'docs/catalog-review/benchmarks/')));
const google = JSON.parse(fs.readFileSync('docs/catalog-review/benchmarks/loco-por-ti/google-places.json')).selected;
if (!spot || !branch) throw new Error('Loco por Ti record not found');

const menu = report.menus[0];
const categories = new Map(menu.categories.map((category) => [category.id, category.name]));
const classify = (section) => {
  const value = String(section || '').toLowerCase();
  if (/vino|licor|trago|coctel|cóctel|cerveza|bebida|caliente|soda|limonada|jugo/.test(value)) return 'drinks';
  if (/entrada|tosta|tapeo/.test(value)) return 'starters';
  if (/dulce|reposteria|repostería|roll|postre/.test(value)) return 'desserts';
  if (/plato|desayuno|sandwich|burger|perro|paella|ensalada/.test(value)) return 'mains';
  return 'extras';
};
const items = [];
for (const product of menu.products || []) {
  const name = String(product.product_name || '').replace(/\s+/g, ' ').trim();
  const section = categories.get(product.product_category) || 'Carta';
  if (!name || product.disabled) continue;
  for (const price of product.price || []) {
    const amount = Number(price.price);
    if (!Number.isFinite(amount) || amount <= 0 || price.disable || price.noStock) continue;
    const full = price.label ? `${name} - ${String(price.label).trim()}` : name;
    if (items.some((item) => item.name === full)) continue;
    items.push({ name: full, price: amount, category: classify(section), menuSection: section, sourceUrl: menu.source, verifiedAt: new Date().toISOString(), unit: price.label || 'unidad', calculationIncluded: true });
  }
}
const find = (pattern, category) => {
  const item = items.find((candidate) => candidate.category === category && pattern.test(candidate.name));
  if (!item) throw new Error(`Budget item missing: ${pattern}`);
  return { name: item.name, category, quantity: 1, groupSize: 1 };
};
const scenarios = [
  { concept: 'Parche tranqui', note: 'Plato y bebida individual; referencia editorial, no promedio de toda la carta.', lines: [find(/Pollo en Salsa|Chuleta de Pollo|Calentado|Focaccia/i, 'mains'), find(/Limonada Natural|Americano|Soda Bretaña|Infusion/i, 'drinks')] },
  { concept: 'Parche completo', note: 'Plato, bebida y entrada para una comida más completa.', lines: [find(/Pollo en Salsa|Chuleta de Pollo|Focaccia/i, 'mains'), find(/Limonada Natural|Americano|Soda Bretaña|Infusion/i, 'drinks'), find(/Catalana|Empanadas|Cazuelita/i, 'starters')] },
  { concept: 'Con toda', note: 'Plato fuerte, bebida, entrada y postre; no usa el producto más caro.', lines: [find(/Rabo de Toro|Paella de Carne|Presumida/i, 'mains'), find(/Aperol Spritz|Gin Tonic|Mimosa/i, 'drinks'), find(/Tortilla de Patata|Catalana|Empanadas/i, 'starters'), find(/Cheesecake|Tiramisú|Tiramisu|Roll/i, 'desserts')] },
];
const price = (line) => items.find((item) => item.name === line.name).price;
const total = (scenario) => scenario.lines.reduce((sum, line) => sum + price(line), 0);
const now = new Date().toISOString();
Object.assign(spot, { name: 'Loco Por Ti', short_description: 'Caé por masa madre, tapas, vinos y café con alma española y corazón colombiano, en un parche tranquilo para comer rico y compartir.', category: 'Comida', city: 'Cali', tags: ['masa madre', 'tapas', 'vinos', 'café', 'bakery', 'bistró', 'El Peñón'], moods: ['comer rico', 'parche tranquilo', 'con amigos'], is_active: true, catalog_status: 'reviewed_with_pending', updated_at: now });
Object.assign(branch, { neighborhood: 'El Peñón', address: google.address, hours: 'Lun-Mié 11:00-21:00 · Jue-Vie 11:00-22:00 · Sáb 08:30-22:00 · Dom 08:30-19:00', phone: google.internationalPhone, whatsapp: 'https://wa.link/cnl6c0', instagram: 'https://instagram.com/locoporticali/', menu_url: 'https://menupp.co/locoporti', menu_items: items, menu_items_verified_at: now, budget_scenarios: scenarios, budget_basis: 'Referencia por persona: plato y bebida del escenario Parche tranqui. No es promedio de la carta.', menu_calculation_note: 'Carta oficial de Menupp; el restaurante puede actualizar los precios.', latitude: google.latitude, longitude: google.longitude, google_maps_url: google.googleMapsUrl, google_place_id: google.placeId, business_status: 'operational', is_active: true, min_budget: total(scenarios[0]), typical_budget: total(scenarios[0]), max_budget: total(scenarios[2]), updated_at: now });
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('docs/catalog-review/benchmarks/loco-por-ti/integration.json', JSON.stringify({ updatedAt: now, status: 'created_from_sources', spotId: spot.id, branchId: branch.id, menuItems: items.length, budgets: scenarios.map((scenario) => ({ concept: scenario.concept, perPerson: total(scenario) })), sources: ['Instagram profile', 'Lnk.Bio', 'Menupp', 'Google Places'], pending: ['highlights'], notes: ['El enlace oficial muestra un rango general 11:00-21:00 y dias extendidos; Google Places aporta horas por dia mas detalladas.'] }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'created_from_sources', spotId: spot.id, branchId: branch.id, menuItems: items.length, budgets: scenarios.map((scenario) => [scenario.concept, total(scenario)]) }, null, 2));

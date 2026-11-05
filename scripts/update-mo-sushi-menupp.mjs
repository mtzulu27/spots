import { readFileSync, writeFileSync } from 'node:fs';

const paths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const menu = [
  ['VOLCANO', 54500, 'Sushis Premium'], ['NIKKEI', 54500, 'Sushis Premium'], ['EMPERADOR', 54500, 'Sushis Premium'], ['DINAMITA CRUNCH', 54500, 'Sushis Premium'], ['KATANA', 54500, 'Sushis Premium'], ['TAO (Nueva receta)', 54500, 'Sushis Premium'],
  ['TRUFADO AL HORNO', 49500, 'Sushis Especiales'], ['CEVICHADO CRUNCHY', 49500, 'Sushis Especiales'], ['TOKIO ROLL', 49500, 'Sushis Especiales'], ['OJO DE TIGRE (LIGERO PICANTE)', 49500, 'Sushis Especiales'], ['DESGRANADO', 49500, 'Sushis Especiales'],
  ['MADURO SAKE', 39500, 'Sushis Clásicos'], ['SWEET EBY', 39500, 'Sushis Clásicos'], ['PANKO ROLL', 39500, 'Sushis Clásicos'], ['FILADELFIA MAKI (NUEVA PRESENTACIÓN)', 39500, 'Sushis Clásicos'],
  ['MADURO VEGGIE', 31500, 'Sushis Veggies'], ['SWEET TOFU', 31500, 'Sushis Veggies'], ['MAKI PANKO VEGETARIANO', 31500, 'Sushis Veggies'],
];
const menuUrls = {
  'mo-sushi-puerto-125': 'https://menupp.co/aldeaasiatica/venue/cJmrnBbRFjYpXqOrbmvh/menu/4a3ed064-fbed-4a8c-877c-b61b585c25f3?category=bJ7ZMbWtGQylOWaGp9HS',
  'mo-sushi-pacific-center': 'https://menupp.co/aldeaasiatica/venue/Mwtgy9Arj8QDBaPE0bzl/menu/ceef92f8-f87b-4147-9ddb-038b47edb2cc?category=bJ7ZMbWtGQylOWaGp9HS',
  'mo-sushi-granada': 'https://menupp.co/aldeaasiatica/venue/UMJfSm0wy5Uyo0DWE0Hn/menu/ce51d9a8-6b7b-4e2d-bc87-b6d0879580a7?category=bJ7ZMbWtGQylOWaGp9HS',
  'mo-sushi-san-fernando': 'https://menupp.co/aldeaasiatica/venue/ggAlzCVwYL39FDA45FUP/menu/b3b59708-98ff-44db-ab88-06dfec026120?category=bJ7ZMbWtGQylOWaGp9HS',
  'mo-sushi-las-velas': 'https://menupp.co/aldeaasiatica/venue/uU5sJpCmlKCtAFBeI0Cx/menu/fcadffcd-f358-4988-9f57-abf088248cbf?category=bJ7ZMbWtGQylOWaGp9HS',
};
const items = menu.map(([name, price, menuSection]) => ({ name, price, category: 'mains', menuSection, sourceUrl: 'https://menupp.co/aldeaasiatica', verifiedAt: now, unit: 'rollo de 10 bocados', calculationIncluded: true }));
const scenarios = [
  { concept: 'Parche tranqui en Mo Sushi', note: 'Consumo individual propuesto con una referencia de la carta pública de Mo Sushi.', lines: [{ name: 'MADURO VEGGIE', category: 'mains', quantity: 1, groupSize: 1 }] },
  { concept: 'Parche completo en Mo Sushi', note: 'Consumo individual propuesto con una referencia clásica y una especial.', lines: [{ name: 'MADURO SAKE', category: 'mains', quantity: 1, groupSize: 1 }, { name: 'TRUFADO AL HORNO', category: 'mains', quantity: 1, groupSize: 1 }] },
  { concept: 'Con toda en Mo Sushi', note: 'Consumo individual propuesto con una referencia premium y una especial.', lines: [{ name: 'VOLCANO', category: 'mains', quantity: 1, groupSize: 1 }, { name: 'TRUFADO AL HORNO', category: 'mains', quantity: 1, groupSize: 1 }] },
];
for (const path of paths) {
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'mo-sushi');
  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id && entry.is_active)) {
    branch.menu_url = menuUrls[branch.slug] || branch.menu_url;
    branch.menu_items = items.map((item) => ({ ...item, sourceUrl: branch.menu_url }));
    branch.budget_scenarios = scenarios;
    branch.min_budget = 31500;
    branch.typical_budget = 89000;
    branch.max_budget = 104000;
    branch.budget_basis = 'Tres escenarios editoriales por persona con precios observados en la pestaña MO Sushi de Menüpp por sede.';
    branch.menu_calculation_note = 'Precios observados en la carta pública; el restaurante puede actualizarlos.';
    branch.missing_fields = (branch.missing_fields || []).filter((field) => !['menu_items', 'budget_scenarios'].includes(field));
    branch.updated_at = now;
  }
  spot.missing_fields = (spot.missing_fields || []).filter((field) => !['menu_items', 'budget_scenarios'].includes(field));
  spot.source_urls = [...new Set([...(spot.source_urls || []), 'https://menupp.co/aldeaasiatica'])];
  spot.updated_at = now;
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log(JSON.stringify({ branches: Object.keys(menuUrls).length, items: items.length, scenarios: scenarios.length }));

import { readFileSync, writeFileSync } from 'node:fs';

const paths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const menuItems = [
  { name: 'Sesión de realidad virtual', category: 'Experiencia', presentation: 'Por persona', price: 80000, currency: 'COP', calculationIncluded: true },
  { name: 'Coca cola', category: 'Bebidas', presentation: 'Individual', price: 6000, currency: 'COP', calculationIncluded: true },
  { name: 'Soda', category: 'Bebidas', presentation: 'Individual', price: 6000, currency: 'COP', calculationIncluded: true },
  { name: 'Club Colombia', category: 'Cerveza', presentation: 'Individual', price: 8000, currency: 'COP', calculationIncluded: true },
  { name: 'Modelo', category: 'Cerveza', presentation: 'Individual', price: 12000, currency: 'COP', calculationIncluded: true },
  { name: 'Chicken Tenders', category: 'Comidas', presentation: 'Individual', price: 34000, currency: 'COP', calculationIncluded: true },
  { name: 'Hamburguesa Angus', category: 'Comidas', presentation: 'Individual', price: 40000, currency: 'COP', calculationIncluded: true },
  { name: 'Papas Francesas', category: 'Comidas', presentation: 'Para compartir', price: 10000, currency: 'COP', calculationIncluded: true },
  { name: 'Brownie con Helado', category: 'Comidas', presentation: 'Para compartir', price: 25000, currency: 'COP', calculationIncluded: true },
];
const scenarios = [
  { concept: 'EVA y algo para tomar', note: 'Una sesión de realidad virtual y una gaseosa por persona.', lines: [
    { name: 'Sesión de realidad virtual', category: 'Experiencia', presentation: 'Por persona', quantity: 1, groupSize: 1 },
    { name: 'Coca cola', category: 'Bebidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
  ] },
  { concept: 'EVA con comida y cerveza', note: 'Una sesión, comida y una cerveza por persona.', lines: [
    { name: 'Sesión de realidad virtual', category: 'Experiencia', presentation: 'Por persona', quantity: 1, groupSize: 1 },
    { name: 'Chicken Tenders', category: 'Comidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Club Colombia', category: 'Cerveza', presentation: 'Individual', quantity: 1, groupSize: 1 },
  ] },
  { concept: 'EVA, comida completa y postre', note: 'Una sesión, hamburguesa, cerveza y postre para compartir.', lines: [
    { name: 'Sesión de realidad virtual', category: 'Experiencia', presentation: 'Por persona', quantity: 1, groupSize: 1 },
    { name: 'Hamburguesa Angus', category: 'Comidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Modelo', category: 'Cerveza', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Brownie con Helado', category: 'Comidas', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
  ] },
];

for (const path of paths) {
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.id === 5224);
  if (!branch) throw new Error(`No se encontró la sede EVA en ${path}`);
  branch.menu_items = menuItems;
  branch.budget_scenarios = scenarios;
  branch.min_budget = 86000;
  branch.typical_budget = 120000;
  branch.max_budget = 152500;
  branch.min_people = 1;
  branch.max_people = 10;
  branch.budget_basis = 'Parche tranqui: una sesión de realidad virtual y una bebida por persona. La experiencia no incluye otros consumos.';
  branch.menu_calculation_note = 'Precios tomados de la carta pública de Cyber Bar EVA; la experiencia y los consumos pueden actualizarse.';
  branch.catalog_status = 'reviewed';
  branch.missing_fields = ['holiday_hours'];
  branch.updated_at = now;
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log(JSON.stringify({ branchId: 5224, minBudget: 86000, typicalBudget: 120000, maxBudget: 152500, scenarios: scenarios.length, updatedAt: now }, null, 2));

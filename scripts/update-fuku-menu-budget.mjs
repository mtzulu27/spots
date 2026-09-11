import { readFileSync, writeFileSync } from 'node:fs';

const paths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];
const now = new Date().toISOString();
const menuItems = [
  { name: 'Shio', category: '1er Paso: Escoger tu caldo', presentation: 'Tradicional', price: 29900, currency: 'COP', calculationIncluded: true },
  { name: 'Shoyu', category: '1er Paso: Escoger tu caldo', presentation: 'Tradicional', price: 33500, currency: 'COP', calculationIncluded: true },
  { name: 'Spicy Curry Miso', category: '1er Paso: Escoger tu caldo', presentation: 'Tradicional', price: 33500, currency: 'COP', calculationIncluded: true },
  { name: 'Eby Pacifico ramen', category: '1er Paso: Escoger tu caldo', presentation: 'Individual', price: 44500, currency: 'COP', calculationIncluded: true },
  { name: 'Gyosas', category: 'Entradas', presentation: 'X5', price: 19000, currency: 'COP', calculationIncluded: true },
  { name: 'Bao Buns', category: 'Entradas', presentation: 'Unidad', price: 7500, currency: 'COP', calculationIncluded: true },
  { name: 'Mochis', category: 'Postres', presentation: 'Individual', price: 11000, currency: 'COP', calculationIncluded: true },
  { name: 'Soda', category: 'Bebidas', presentation: 'Individual', price: 10000, currency: 'COP', calculationIncluded: true },
  { name: 'Cerveza Asahi', category: 'Bebidas', presentation: 'Individual', price: 19000, currency: 'COP', calculationIncluded: true },
  { name: 'Limonada de Lychee, fresa y jengibre', category: 'Bebidas', presentation: 'Individual', price: 8500, currency: 'COP', calculationIncluded: true },
];
const scenarios = [
  { concept: 'Un ramen y algo para tomar', note: 'Un ramen individual y una soda por persona.', lines: [
    { name: 'Shio', category: '1er Paso: Escoger tu caldo', presentation: 'Tradicional', quantity: 1, groupSize: 1 },
    { name: 'Soda', category: 'Bebidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
  ] },
  { concept: 'Ramen con entrada para compartir', note: 'Un ramen y una bebida por persona, más una orden de gyosas para compartir.', lines: [
    { name: 'Shoyu', category: '1er Paso: Escoger tu caldo', presentation: 'Tradicional', quantity: 1, groupSize: 1 },
    { name: 'Soda', category: 'Bebidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Gyosas', category: 'Entradas', presentation: 'X5', quantity: 1, groupSize: 2 },
  ] },
  { concept: 'Ramen, entrada, postre y cerveza', note: 'Un ramen, una cerveza por persona, gyosas para compartir y mochis para cerrar.', lines: [
    { name: 'Eby Pacifico ramen', category: '1er Paso: Escoger tu caldo', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Cerveza Asahi', category: 'Bebidas', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Gyosas', category: 'Entradas', presentation: 'X5', quantity: 1, groupSize: 2 },
    { name: 'Mochis', category: 'Postres', presentation: 'Individual', quantity: 1, groupSize: 1 },
  ] },
];
const total = (scenario) => scenario.lines.reduce((sum, line) => {
  const item = menuItems.find((entry) => entry.name === line.name && entry.category === line.category && entry.presentation === line.presentation);
  return sum + (item?.price ?? 0) * Math.ceil(2 / line.groupSize) * line.quantity;
}, 0);

for (const path of paths) {
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.id === 4753);
  if (!branch) throw new Error(`No se encontró la sede Fuku en ${path}`);
  const values = scenarios.map(total);
  branch.menu_items = menuItems;
  branch.menu_url = 'https://menupp.co/ramenbarfuku/venue/RoW8MEdB1kf3D6hgtMlJ/menu/2f89eeee-6785-4090-ae55-68aa64207db9';
  branch.budget_scenarios = scenarios;
  branch.min_budget = values[0] / 2;
  branch.typical_budget = values[0] / 2;
  branch.max_budget = values[2] / 2;
  branch.min_people = 1;
  branch.max_people = 8;
  branch.budget_basis = 'Parche tranqui: un ramen y una bebida por persona. Precios verificados en la carta pública de Menupp.';
  branch.menu_calculation_note = 'El presupuesto puede variar; el restaurante puede actualizar los precios.';
  branch.catalog_status = 'reviewed';
  branch.missing_fields = ['holiday_hours'];
  branch.updated_at = now;
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
console.log(JSON.stringify({ branchId: 4753, minBudget: 39900, typicalBudget: 39900, maxBudget: 78500, items: menuItems.length, updatedAt: now }, null, 2));

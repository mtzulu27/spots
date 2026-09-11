import fs from 'node:fs';

const path = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
const branch = catalog.branches.find((row) => row.slug === 'espacio-10-60-centro');
if (!branch) throw new Error('Sede Espacio 10-60 no encontrada');

const now = new Date().toISOString();
const source = branch.menu_url;
const item = (name, price, category, presentation = 'Unidad') => ({
  name, price, category, presentation, unit: 'unidad', menuSection: category,
  sourceUrl: source, verifiedAt: now, calculationIncluded: true,
});

const menuItems = [
  item('Margarita', 45000, 'Cocteles'), item('Gin Tonic', 30000, 'Cocteles'),
  item('Lychee Martini', 30000, 'Cocteles'), item('Negroni', 30000, 'Cocteles'),
  item('Cosmopolitan', 35000, 'Cocteles'), item('Dry Martini', 39000, 'Cocteles'),
  item('Mojito', 40000, 'Cocteles'), item('Caipirinha', 30000, 'Cocteles'),
  item('Budweiser', 12000, 'Cervezas'), item('Michelob Ultra', 14000, 'Cervezas'),
  item('Heineken', 14000, 'Cervezas'), item('Club Colombia', 16000, 'Cervezas'),
  item('Corona Extra', 16000, 'Cervezas'), item('Stella Artois', 16000, 'Cervezas'),
  item('Michelado', 3000, 'Cervezas'),
  item('Pluton', 15000, 'Sodas especiales'), item('Jupiter', 15000, 'Sodas especiales'),
  item('Venus', 15000, 'Sodas especiales'), item('Smirnoff Ice', 16000, 'Bebidas'),
  item('Red Bull', 15000, 'Bebidas'), item('Bretaña', 10000, 'Bebidas'),
  item('Agua', 10000, 'Bebidas'), item('Jarra de agua de limon', 10000, 'Bebidas'),
  item('Gatorade Recover', 15000, 'Bebidas'), item('Coca-Cola', 10000, 'Bebidas'),
  item('Empanada de jamon y queso', 6000, 'Comidas'), item('Empanada de pollo', 6000, 'Comidas'),
  item('Empanadas de carne', 17000, 'Comidas', '6 unidades'),
  item('Pizza Margarita', 12000, 'Comidas'), item('Pizza Pepperoni', 20000, 'Comidas'),
  item('Pizza Pollo y Champinones', 20000, 'Comidas'), item('Pizza Park', 23000, 'Comidas'),
  item('Pizza Hawaiana', 20000, 'Comidas'), item('Salchipapa', 20000, 'Comidas'),
  item('Perro caliente', 22000, 'Comidas'), item('Bombones de pollo', 22000, 'Comidas'),
  item('Aguardiente Blanco del Valle Fiesta', 150000, 'Licores', 'Botella'),
  item('Aguardiente Origen', 160000, 'Licores', 'Botella'),
  item('Aguardiente Antioqueno', 160000, 'Licores', 'Botella'),
  item('Vuse Go Max', 40000, 'Vapeadores'),
];

const find = (name, category, presentation = 'Unidad') => ({ name, category, presentation, quantity: 1, groupSize: 1 });
branch.menu_items = menuItems;
branch.menu_items_verified_at = now;
branch.budget_scenarios = [
  { concept: 'Parche tranqui', note: 'Dos o tres cervezas o bebidas por persona.', lines: [find('Heineken', 'Cervezas'), find('Heineken', 'Cervezas')] },
  { concept: 'Parche completo', note: 'Una botella de aguardiente compartida entre cuatro personas.', lines: [{ ...find('Aguardiente Blanco del Valle Fiesta', 'Licores', 'Botella'), groupSize: 4 }] },
  { concept: 'Con toda', note: 'Botella premium o varias botellas durante la noche.', lines: [{ ...find('Aguardiente Origen', 'Licores', 'Botella'), groupSize: 4 }, { ...find('Aguardiente Antioqueno', 'Licores', 'Botella'), groupSize: 4 }] },
];
Object.assign(branch, {
  min_budget: 30000, typical_budget: 70000, max_budget: 150000,
  budget_basis: 'Referencia por persona para una mesa de cuatro: dos o tres cervezas en Parche tranqui, botella compartida en escenarios superiores.',
  menu_calculation_note: 'Carta pública de Espacio 10-60 revisada con OCR; algunos productos no legibles fueron omitidos. El lugar puede actualizar los precios.',
  catalog_status: 'reviewed_with_pending', updated_at: now,
  missing_fields: (branch.missing_fields ?? []).filter((field) => field !== 'menu_vigente'),
});
catalog.generatedAt = now;
fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ branch: branch.slug, menuItems: menuItems.length, min: branch.min_budget, typical: branch.typical_budget, max: branch.max_budget }, null, 2));

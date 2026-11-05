import fs from 'node:fs';

const file = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
const source = 'https://drive.usercontent.google.com/download?id=1DL_6uB_CeeIrj52WigvxG5fzeO2lQsnm&export=download';
const item = (name, price, category, presentation, unit = 'unidad') => ({
  name, price, category, presentation, unit, menuSection: category, sourceUrl: source,
  verifiedAt: now, calculationIncluded: true,
});

const menuItems = [
  ...['Torta de semillas de amapola', 'Torta de chocolate', 'Torta de naranja', 'Torta de vainilla', 'Torta de manzana con nueces'].flatMap(name => [
    item(name, 50000, 'desserts', '1/8 de libra'), item(name, 75000, 'desserts', '1/4 de libra'),
    item(name, 100000, 'desserts', '1/2 libra'), item(name, 160000, 'desserts', '1 libra'), item(name, 220000, 'desserts', '2 libras'),
  ]),
  item('Torta de tres leches', 50000, 'desserts', '1/8 de libra'), item('Torta de tres leches', 80000, 'desserts', '1/4 de libra'), item('Torta de tres leches', 105000, 'desserts', '1/2 libra'), item('Torta de tres leches', 170000, 'desserts', '1 libra'),
  item('Volcán de chocolate', 16000, 'desserts', 'Personal'), item('Volcán de chocolate', 85000, 'desserts', '1/4 de libra'), item('Volcán de chocolate', 105000, 'desserts', '1/2 libra'), item('Volcán de chocolate', 155000, 'desserts', '1 libra'),
  item('Tartaleta de arequipe con mora', 18000, 'desserts', 'Porción'), item('Tartaleta de arequipe con mora', 70000, 'desserts', 'Media, 5 a 7 porciones'), item('Tartaleta de arequipe con mora', 120000, 'desserts', 'Entera, 12 a 16 porciones'),
  item('Ponqué negro envinado', 25000, 'desserts', 'Personal'), item('Ponqué negro envinado', 95000, 'desserts', '1/8 de libra'), item('Ponqué negro envinado', 135000, 'desserts', '1/4 de libra'), item('Ponqué negro envinado', 190000, 'desserts', '1/2 libra'), item('Ponqué negro envinado', 290000, 'desserts', '1 libra'), item('Ponqué negro envinado', 350000, 'desserts', '2 libras'),
  item('Torta de zanahoria con nueces', 80000, 'desserts', 'Cuadrada, 8 porciones'), item('Torta de banano con almendras', 80000, 'desserts', 'Cuadrada, 8 porciones'), item('Torta de pan', 80000, 'desserts', 'Cuadrada, 8 porciones'),
  item('Cheesecake', 35000, 'desserts', '1/8, 4 porciones'), item('Cheesecake', 75000, 'desserts', '1/4, 10 porciones'), item('Cheesecake', 110000, 'desserts', '1/2, 15 porciones'), item('Cheesecake', 160000, 'desserts', '1 libra, 20 porciones'),
  item('Cheesecake con base de brownie', 110000, 'desserts', 'Pequeño, 10 porciones'), item('Cheesecake con base de brownie', 150000, 'desserts', 'Mediano, 15 porciones'), item('Cheesecake con base de brownie', 180000, 'desserts', 'Grande, 20 porciones'),
  item('Cheesecake horneado', 160000, 'desserts', 'Único, 18 porciones'), item('Flan de caramelo', 110000, 'desserts', 'Único, 12 personas'), item('Pie de manzana', 18000, 'desserts', 'Único'), item('Brownie', 8000, 'desserts', 'Unidad'), item('Pie de coco', 16000, 'desserts', 'Unidad'),
  item('Alfajores', 20000, 'desserts', 'Caja de 6 unidades', 'caja'), item('Alfajores', 30000, 'desserts', 'Caja de 12 unidades', 'caja'), item('Galletas de mantequilla', 19000, 'desserts', 'Caja de 24 unidades', 'caja'), item('Galletas de mantequilla', 25000, 'desserts', 'Caja de 36 unidades', 'caja'),
  item('Torta personal de volcán de chocolate', 16000, 'desserts', 'Personal'), item('Torta personal de ponqué negro', 25000, 'desserts', 'Personal'), item('Torta personal de tres leches', 22000, 'desserts', 'Personal'), item('Torta personal de semillas de amapola', 13000, 'desserts', 'Personal'), item('Torta personal de zanahoria con nueces', 18000, 'desserts', 'Personal'), item('Torta personal de almojábana', 16000, 'desserts', 'Personal'), item('Torta personal red velvet', 16000, 'desserts', 'Personal'),
  ...['Flan de caramelo', 'Borrachito', 'Deditos de chocolate', 'Cheesecake frío', 'Pie de coco', 'Postre tres leches', 'Rollito de fresa'].map(name => item(name, 16000, 'desserts', 'Personal')),
  item('Tartaleta de arequipe', 18000, 'desserts', 'Personal'), item('Tartaleta de crema y mora', 18000, 'desserts', 'Personal'), item('Cheesecake horneado', 20000, 'desserts', 'Personal'), item('Carlota', 18000, 'desserts', 'Personal'),
  item('Torta apta para diabéticos de amapola', 95000, 'desserts', '1/4 de libra'), item('Torta apta para diabéticos de manzana con nueces', 120000, 'desserts', '1/2 libra'), item('Torta apta para diabéticos de naranja', 180000, 'desserts', '1 libra'),
  ...['Tiramisú', 'Tres leches'].map((name, index) => item(name, index ? 110000 : 120000, 'desserts', index ? '12 a 15 porciones' : '6 a 8 porciones')),
  item('Rollo de fresa', 55000, 'desserts', 'Mediano, 4 a 5 porciones'), item('Rollo de fresa', 100000, 'desserts', 'Grande, 8 a 10 porciones'), item('Torta de almojábana', 95000, 'desserts', 'Rectangular, 10 a 12 porciones'),
];

const uniqueItems = menuItems.filter((row, index, all) => index === all.findIndex((other) => other.name === row.name && other.presentation === row.presentation));
const find = (name, presentation) => {
  const found = uniqueItems.find((row) => row.name === name && row.presentation === presentation);
  if (!found) throw new Error(`Missing menu item ${name} ${presentation}`);
  return { name: found.name, category: found.category, presentation: found.presentation, quantity: 1, groupSize: 1 };
};
const scenarios = [
  { concept: 'Parche tranqui', note: 'Un postre personal para caer por algo dulce; referencia editorial, no promedio de toda la carta.', lines: [find('Torta personal de semillas de amapola', 'Personal')] },
  { concept: 'Parche completo', note: 'Dos postres personales para compartir una pausa dulce.', lines: [find('Brownie', 'Unidad'), find('Tartaleta de arequipe', 'Personal')] },
  { concept: 'Con toda', note: 'Una torta completa de celebración; el tamaño se comparte y no representa rendimiento confirmado por persona.', lines: [find('Cheesecake', '1/4, 10 porciones')] },
];

for (const branch of catalog.branches.filter((row) => row.spot_id === 114)) {
  Object.assign(branch, {
    menu_items: uniqueItems,
    menu_items_verified_at: now,
    budget_scenarios: scenarios,
    min_budget: 13000,
    typical_budget: 13000,
    max_budget: 75000,
    budget_basis: 'Parche tranqui: torta personal de semillas de amapola, según carta oficial.',
    menu_calculation_note: 'Precios extraídos de la carta PDF oficial de Cascanueces; el restaurante puede actualizarlos.',
    missing_fields: ['holiday_hours'],
    updated_at: now,
  });
}
const panceBranch = catalog.branches.find((row) => row.slug === 'cascanueces-puerto-125');
const limonarBranch = catalog.branches.find((row) => row.slug === 'cascanueces-limonar');
panceBranch.hours = 'Lun-Mie 11:00-19:00 · Jue 11:00-21:00 · Vie-Sab 11:00-22:00 · Dom-Fest 11:00-20:00';
limonarBranch.hours = 'Lun-Jue 10:00-19:00 · Vie-Sab 10:00-20:00 · Dom-Fest 10:00-19:00';
const spot = catalog.spots.find((row) => row.id === 114);
spot.missing_fields = ['holiday_hours'];
spot.catalog_status = 'reviewed';
spot.updated_at = now;
catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('docs/catalog-review/benchmarks/cascanuecesreposteriaartesanal/menu-review.json', JSON.stringify({ status: 'reviewed', source, pages: 45, products: uniqueItems.length, scenarios: scenarios.map((x) => x.concept), updatedAt: now }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'updated', products: uniqueItems.length, branches: 2, pending: ['holiday_hours'] }, null, 2));

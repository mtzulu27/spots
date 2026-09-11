import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'apps/mobile/public/spots-catalog.json';
const dir = 'docs/catalog-review/agave-azul-cocina-bar-2026-09-05';
const original = fs.readFileSync(path, 'utf8');
const catalog = JSON.parse(original);
const spot = catalog.spots.find(row => row.id === 1517);
const branch = catalog.branches.find(row => row.id === 1931);
assert.equal(branch.spot_id, spot.id);
assert.equal(branch.slug, 'agave-azul-cocina-bar-lago-verde');
const sourceUrl = 'https://drive.google.com/file/d/1tmuCUf5brKCmAJrVvrtV-7QKQiSZd4J4/view';
const verifiedAt = new Date().toISOString();
const items = [];
function add(category, sourcePage, menuSection, rows, unit = 'plato', excluded = '') {
  for (const [name, thousands, variants] of rows) items.push({
    name, price: thousands * 1000, category, menuSection, sourcePage, sourceUrl,
    verifiedAt, unit, ...(variants ? { variants } : {}),
    calculationIncluded: !excluded, ...(excluded ? { exclusionReason: excluded } : {}),
  });
}
add('starters', 2, 'Perfectos para compartir', [
  ['Totopos', 15], ['Super Nachos', 55, ['Tinga de pollo', 'Suadero (res)']],
  ['Guacamole Chips', 34], ['Guacamole Chips con panceta', 39], ['Ceviche de Chicharrón', 39],
]);
add('mains', 3, 'Los meros Mexicanos', [
  ['Tacos', 37, ['De la casa (chicharrón)', 'Suadero (res)', 'Al Pastor', 'Birria', 'Tinga de pollo', 'Chorizo']],
  ['Quesadillas Poblanas', 49, ['Chorizo', 'Tinga de pollo', 'Chicharrón', 'Suadero (res)']],
  ['Fundido Mexicano', 55, ['Chorizo', 'Tinga de pollo', 'Suadero (res)']],
]);
add('starters', 3, 'Los meros Mexicanos', [['Esquites', 34], ['Esquites con proteína', 39, ['Chicharrón', 'Chorizo']]]);
add('mains', 4, 'Fuertes del Rancho', [
  ['Burger Cheese Bacon', 39], ['Burger Mexa Especial', 45], ['Picaña Premium (300–350 g)', 96],
  ['New York Steak (300–350 g)', 89], ['Tamarindo Ribs', 75],
]);
add('desserts', 4, 'Postres', [['Postre de la casa', 16], ['Postre de la casa con helado', 22], ['Brownie con helado', 18]]);
const shared = 'Presentación compartida: no equivale a una bebida individual. No se presume cuántas personas la comparten.';
add('drinks', 5, 'Tequila', [
  ['1/2 Don Julio Blanco', 185], ['Don Julio Blanco', 295], ['Don Julio Reposado', 390],
  ['Don Julio 70', 495], ['Don Julio 1942', 1600],
], 'botella o media botella según nombre; volumen no indicado', shared);
add('drinks', 5, 'Mezcal', [['Unión', 280]], 'botella; volumen no indicado', shared);
add('drinks', 5, 'Whisky', [["1/2 Buchanan’s", 170], ["Buchanan’s", 250], ["Buchanan’s Master", 290], ["Buchanan’s 18", 590]], 'botella o media botella según nombre; volumen no indicado', shared);
add('drinks', 5, 'Aguardiente', [
  ['Bot. Antioqueño', 120], ['1/2 Antioqueño', 80], ['Bot. Amarillo', 130], ['1/2 Amarillo', 90],
], 'botella o media botella según nombre; volumen no indicado', shared);
add('drinks', 5, 'Cervezas', [['Corona', 12], ['Corona Cero', 8], ['Stella Artois', 12], ['Cerveza Modelo', 15], ['Draft Club Colombia', 12]], 'bebida individual');
add('drinks', 5, 'Sodas saborizadas', [['Frutos Rojos', 18], ['Maracuyá', 18], ['Lychee', 18]], 'bebida individual');
add('drinks', 5, 'Otros', [
  ['Soda', 6], ['Coca Cola', 6], ['Coca Cola Zero', 6], ['Té Hatsu Negro', 8],
  ['Té Hatsu Blanco', 8], ['Té Hatsu Amarillo', 8], ['Agua', 6], ['Agua con gas', 6],
], 'bebida individual');
add('drinks', 6, 'Cócteles', [
  ['Brisa Rossa', 39], ['Lychee Gin', 39], ['Fresh Tamarindo', 39],
  ['Margarita', 39, ['Tradicional', 'Frutos rojos', 'Maracuyá', 'Lychee']],
  ['Margarita Frozen', 25], ['Mocktail cero', 25], ['Rojo Ahumado', 39],
  ['Red Lady', 39], ['Negroni', 39], ['Paloma', 39], ['Moscow Mule', 39],
], 'cóctel individual');
add('drinks', 6, 'Cócteles con mejora premium', [
  ['Lychee Gin con Tanqueray', 54], ['Margarita con Don Julio Blanco', 59, ['Tradicional', 'Frutos rojos', 'Maracuyá', 'Lychee']],
  ['Rojo Ahumado con Don Julio Blanco', 59], ['Negroni con Tanqueray', 54], ['Paloma con Don Julio Blanco', 59],
], 'cóctel individual con mejora', 'Mejora opcional: precio base + $15.000 (Tanqueray) o +$20.000 (Don Julio Blanco). Se conserva el total, pero la visita normal usa la versión base.');
add('drinks', 6, 'Sangrías', [['Sangría Vino Tinto — copa', 30], ['Sangría Vino Rosé — copa', 30]], 'copa');
add('drinks', 6, 'Sangrías', [['Sangría Vino Tinto — jarra', 120], ['Sangría Vino Rosé — jarra', 120]], 'jarra', shared);
add('drinks', 6, 'Vinos', [['De la casa — copa', 25], ['Finca las Moras — copa', 30], ['Casillero — copa', 40], ['Diablo — copa', 50]], 'copa');
add('drinks', 6, 'Vinos', [['Finca las Moras — presentación compartida', 90], ['Casillero — presentación compartida', 120], ['Diablo — presentación compartida', 160]], 'columna rotulada JARRA en la carta; confirmar recipiente', shared);
assert.equal(items.length, 75);
const summaries = Object.fromEntries(['mains', 'drinks', 'starters', 'desserts'].map(category => {
  const prices = items.filter(item => item.category === category && item.calculationIncluded).map(item => item.price);
  return [category, { minimum: Math.min(...prices), maximum: Math.max(...prices), average: prices.reduce((a, b) => a + b, 0) / prices.length, sampleSize: prices.length }];
}));
assert.equal(summaries.drinks.sampleSize, 33);
const before = { spot: structuredClone(spot), branch: structuredClone(branch), branchHours: catalog.branchHours.filter(row => row.branch_id === branch.id), hours: catalog.hours.filter(row => row.branch_id === branch.id) };
const typical = Math.round(summaries.mains.average + summaries.drinks.average);
Object.assign(branch, {
  hours: 'Lun-Jue 17:00-22:00 · Vie-Sab 17:00-02:00 · Dom 15:00-21:00 · Festivos por confirmar',
  address: 'Terraza, Cl. 16A #122-70, Lago Verde, Pance, Cali',
  min_budget: summaries.mains.minimum + summaries.drinks.minimum,
  max_budget: summaries.mains.maximum + summaries.drinks.maximum,
  typical_budget: typical,
  budget_basis: 'Referencia por persona: 1 plato fuerte + 1 bebida individual, usando el promedio de cada rubro de la carta. No incluye entradas, postre ni servicio.',
  menu_calculation_note: 'Los sabores de igual precio cuentan como una opción. Botellas, jarras, mejoras premium y promociones no entran en estos promedios. Los platos para compartir se cotizan completos, sin suponer un número de personas.',
  min_people: 2, max_people: 6, menu_items: items, menu_url: sourceUrl,
  google_maps_url: 'https://maps.app.goo.gl/5pDUoZDedtMRyBc99',
  website_url: 'https://linktr.ee/agaveazulgastrobar',
  holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null,
  holiday_split_open_time: null, holiday_split_close_time: null,
  latitude: 3.3427218, longitude: -76.5352484,
  updated_at: verifiedAt,
});
Object.assign(spot, {
  updated_at: verifiedAt, reviewed_at: verifiedAt,
  source_urls: ['https://www.instagram.com/agaveazul.cocinabar/', branch.website_url, sourceUrl, branch.google_maps_url],
});
let nextId = Math.max(0, ...catalog.branchHours.map(row => row.id), ...catalog.hours.map(row => row.id)) + 1;
const schedule = Array.from({ length: 7 }, (_, day) => ({
  id: nextId++, branch_id: branch.id, day_of_week: day, is_closed: false,
  open_time: day === 0 ? '15:00:00' : '17:00:00',
  close_time: day === 0 ? '21:00:00' : day >= 5 ? '02:00:00' : '22:00:00',
  split_open_time: null, split_close_time: null, sort_order: (day || 7) * 10,
}));
catalog.branchHours = [...catalog.branchHours.filter(row => row.branch_id !== branch.id), ...schedule];
catalog.hours = [...catalog.hours.filter(row => row.branch_id !== branch.id), ...schedule];
catalog.generatedAt = verifiedAt;
fs.mkdirSync(dir, { recursive: true });
assert(!fs.existsSync(`${dir}/before.json`), 'Already applied: do not overwrite the original audit snapshot.');
assert.equal(fs.readFileSync(path, 'utf8'), original, 'Catalog changed concurrently; re-read before applying.');
fs.writeFileSync(`${dir}/before.json`, JSON.stringify(before, null, 2) + '\n');
fs.writeFileSync(`${dir}/menu-extraction.json`, JSON.stringify({ sourceUrl, verifiedAt, currency: 'COP', pagesReviewed: [1, 2, 3, 4, 5, 6], items, summaries, typicalBudget: typical }, null, 2) + '\n');
fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${dir}/after.json`, JSON.stringify({ spot, branch, branchHours: schedule }, null, 2) + '\n');
console.log(JSON.stringify({ products: items.length, comparable: items.filter(item => item.calculationIncluded).length, summaries, typical }, null, 2));

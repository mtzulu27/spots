import fs from 'node:fs';

const catalogFile = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks';
const menuFile = `${root}/casacantera-menupp-links-2026-09-07T20-27-13-483Z.json`;
const googleFile = `${root}/casa-cantera-google-places.json`;
const outDir = `${root}/casa-cantera-luna-reviewed`;
const now = new Date().toISOString();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = read(catalogFile);
const menuReport = read(menuFile);
const googleReport = read(googleFile);
const spot = catalog.spots.find(row => row.slug === 'casa-cantera');
const branch = catalog.branches.find(row => row.slug === 'casa-cantera-granada');
if (!spot || !branch) throw new Error('Casa Cantera target not found');
const location = menuReport.locations[0];
const menu = menuReport.menus[0];
const google = googleReport.selected;
const categories = new Map(menu.categories.map(category => [category.id, category]));

const classify = section => {
  const value = String(section || '').toLowerCase();
  if (/bebida|caffe|café|coctel|cerveza|licor|vino|sangria|doble/.test(value)) return 'drinks';
  if (/entrada|antojito/.test(value)) return 'starters';
  if (/postre|panader/.test(value)) return 'desserts';
  if (/fuerte|carne|brunch|tradicional|cantera|almorzar/.test(value)) return 'mains';
  return 'extras';
};

const menuItems = [];
const inventory = [];
for (const product of menu.products) {
  const section = categories.get(product.product_category);
  const sectionName = section?.name?.trim() || null;
  const name = String(product.product_name || '').replace(/\s+/g, ' ').trim();
  if (!name) continue;
  const prices = Array.isArray(product.price) ? product.price : [];
  const normalizedPrices = prices.map(row => ({
    label: String(row.label || '').trim() || null,
    price: Number.isInteger(Number(row.price)) && Number(row.price) > 0 ? Number(row.price) : null,
    currency: 'COP',
    status: Number.isInteger(Number(row.price)) && Number(row.price) > 0 ? 'confirmed' : 'pending',
    available: !row.disable && !row.noStock,
  }));
  inventory.push({
    id: product.id,
    name,
    description: String(product.description || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
    section: sectionName,
    available: !product.disabled && !section?.disabled,
    prices: normalizedPrices,
  });
  for (const price of normalizedPrices) {
    if (price.price == null || product.disabled || section?.disabled || !price.available) continue;
    menuItems.push({
      name: price.label ? `${name} - ${price.label}` : name,
      price: price.price,
      category: classify(sectionName),
      menuSection: sectionName || 'Carta',
      sourceUrl: menu.source,
      verifiedAt: now,
      unit: price.label || 'unidad',
      calculationIncluded: true,
    });
  }
}

const findItem = (pattern, category) => {
  const item = menuItems.find(row => row.category === category && pattern.test(row.name));
  if (!item) throw new Error(`Missing budget item: ${pattern}`);
  return { name: item.name, category, quantity: 1, groupSize: 1 };
};

const budgetScenarios = [
  { concept: 'Una comida en Casa Cantera', note: 'Consumo individual propuesto con plato fuerte y bebida; no es consumo mínimo ni promedio de la carta.', lines: [findItem(/Mole Poblano/i, 'mains'), findItem(/Limonada/i, 'drinks')] },
  { concept: 'Una comida especial en Casa Cantera', note: 'Consumo individual propuesto con plato fuerte, bebida y entrada; no es consumo mínimo ni promedio de la carta.', lines: [findItem(/Tacos X3|Torta de Birria|Burrito/i, 'mains'), findItem(/Limonada|Agua/i, 'drinks'), findItem(/Guacamole|Queso|Molcajete/i, 'starters')] },
  { concept: 'Plan completo en Casa Cantera', note: 'Consumo individual propuesto con plato fuerte, bebida y postre; no es consumo mínimo ni promedio de la carta.', lines: [findItem(/Mole Poblano|Amor a la Mexicana/i, 'mains'), findItem(/Limonada|Acqua Panna/i, 'drinks'), findItem(/Cheesecake|Pastel/i, 'desserts')] },
];

Object.assign(spot, {
  short_description: 'Una experiencia mexicana en Granada que lleva el sabor de México a la mesa con platos de autor, tacos, entradas para compartir, cocteles y una carta amplia para comer rico con tu gente.',
  category: 'Comida',
  subcategories: ['Mexicana', 'Tacos', 'Brunch', 'Cocteles'],
  tags: ['mexicana', 'tacos', 'platos de autor', 'brunch', 'cocteles', 'Granada'],
  moods: ['comer rico', 'plan especial', 'con amigos', 'pareja'],
  is_active: true,
  business_status: 'operational',
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['holiday_hours'],
  updated_at: now,
});

Object.assign(branch, {
  address: location.address,
  hours: 'Lun Cerrado · Mar-Jue 15:00-22:30 · Vie 15:00-23:00 · Sab 09:00-23:00 · Dom 09:00-19:00',
  holiday_mode: 'inherit',
  holiday_open_time: null,
  holiday_close_time: null,
  menu_url: menu.source,
  menu_items: menuItems,
  menu_items_verified_at: now,
  budget_scenarios: budgetScenarios,
  phone: location.phone.replace(/\D/g, ''),
  whatsapp: `https://wa.me/${location.wa_phone.replace(/\D/g, '')}`,
  instagram: 'https://www.instagram.com/casa.cantera/',
  latitude: google.latitude,
  longitude: google.longitude,
  google_maps_url: google.googleMapsUrl,
  google_place_id: google.placeId,
  website_url: google.website || '',
  business_status: 'operational',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['holiday_hours'],
  min_people: 1,
  max_people: 2,
  min_budget: Math.min(...menuItems.map(row => row.price)),
  max_budget: Math.max(...menuItems.map(row => row.price)),
  typical_budget: 70000,
  budget_basis: 'Tres escenarios editoriales por persona construidos con productos vigentes de la carta oficial; no representan consumo mínimo.',
  menu_calculation_note: 'Carta oficial de Menupp: 184 productos recibidos, 168 filas de precio y presentaciones separadas. Los productos sin precio interpretable o deshabilitados quedan solo en el expediente.',
  updated_at: now,
});

const weekly = [
  { day_of_week: 0, is_closed: false, open_time: '09:00:00', close_time: '19:00:00' },
  { day_of_week: 1, is_closed: true, open_time: null, close_time: null },
  { day_of_week: 2, is_closed: false, open_time: '15:00:00', close_time: '22:30:00' },
  { day_of_week: 3, is_closed: false, open_time: '15:00:00', close_time: '22:30:00' },
  { day_of_week: 4, is_closed: false, open_time: '15:00:00', close_time: '22:30:00' },
  { day_of_week: 5, is_closed: false, open_time: '15:00:00', close_time: '23:00:00' },
  { day_of_week: 6, is_closed: false, open_time: '09:00:00', close_time: '23:00:00' },
].map(row => ({ ...row, split_open_time: null, split_close_time: null }));

catalog.branchHours = catalog.branchHours.filter(row => row.branch_id !== branch.id).concat(weekly.map((row, index) => ({ id: Math.max(...catalog.branchHours.map(row => row.id), ...(catalog.hours || []).map(row => row.id)) + index + 1, branch_id: branch.id, sort_order: (row.day_of_week || 7) * 10, ...row })));
if (Array.isArray(catalog.hours)) catalog.hours = catalog.branchHours;
catalog.generatedAt = now;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${outDir}/consolidated.json`, JSON.stringify({
  schemaVersion: 1,
  generatedAt: now,
  spot,
  branch,
  sourceDecisions: [
    { fields: ['identity', 'concept', 'profileLink'], source: 'Instagram profile', status: 'confirmed' },
    { fields: ['menu', 'phone', 'whatsapp', 'hours'], source: 'Menupp public records', status: 'preferred' },
    { fields: ['address', 'coordinates', 'googleMapsUrl', 'businessStatus'], source: 'Google Places', status: 'confirmed' },
  ],
  pending: ['Festivos no publicados en las fuentes consultadas; se conserva inherit.'],
  coverage: { menuProducts: menu.products.length, pricedMenuRows: menuItems.length, highlightsFoldersSelected: 1, highlightsImagesDownloaded: 13, visualHoursConfirmed: false },
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'written', spot: spot.slug, branch: branch.slug, menuItems: menuItems.length, budgetScenarios: budgetScenarios.length, pending: ['holiday_hours'], output: `${outDir}/consolidated.json` }, null, 2));

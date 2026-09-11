import fs from 'node:fs';
import assert from 'node:assert/strict';

const catalogFile = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks';
const menuFile = `${root}/casasoller-menupp-links-2026-09-07T22-36-36-676Z.json`;
const googleFile = `${root}/casasoller/google-places.json`;
const outDir = `${root}/casasoller-new-reviewed`;
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const catalog = read(catalogFile);
const before = JSON.stringify(catalog);
const menuReport = read(menuFile);
const google = read(googleFile).selected;
assert(!catalog.spots.some(s => /casa.?soller/i.test(`${s.name} ${s.slug}`)));
const now = new Date().toISOString();
const spotId = Math.max(...catalog.spots.map(s => Number(s.id) || 0)) + 1;
const branchId = Math.max(...catalog.branches.map(s => Number(s.id) || 0)) + 1;
const menus = menuReport.menus;
const categoryById = new Map(menus.flatMap(m => m.categories).map(c => [c.id, c.name]));
const classify = section => {
  const s = String(section).toLowerCase();
  if (/bebida|caffe|café|coctel|cerveza|licor|vino|sangria|tónica|vodka|ron|whisky|tequila/.test(s)) return 'drinks';
  if (/entrada|aperitivo/.test(s)) return 'starters';
  if (/postre/.test(s)) return 'desserts';
  if (/mar|tierra|arroz|pasta|sopa|ensalada/.test(s)) return 'mains';
  return 'extras';
};
const items = [];
for (const menu of menus) for (const product of menu.products || []) {
  const name = String(product.product_name || '').replace(/\s+/g, ' ').trim();
  const section = categoryById.get(product.product_category) || 'Carta';
  if (!name || product.disabled) continue;
  for (const row of product.price || []) {
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0 || row.disable || row.noStock) continue;
    const fullName = row.label ? `${name} - ${String(row.label).trim()}` : name;
    if (items.some(i => i.name === fullName)) continue;
    items.push({ name: fullName, price, category: classify(section), menuSection: section, sourceUrl: menu.source, verifiedAt: now, unit: row.label || 'unidad', calculationIncluded: true });
  }
}
const find = (pattern, category) => {
  const item = items.find(i => i.category === category && pattern.test(i.name));
  assert(item, `Missing budget item ${pattern}`);
  return { name: item.name, category, quantity: 1, groupSize: 1 };
};
const scenarios = [
  { concept: 'Parche tranqui', note: 'Una comida individual con plato fuerte y bebida; referencia editorial, no promedio de toda la carta.', lines: [find(/Spaghetti a la Amatriciana|Arroz Meloso de Ave|Hamburguesa de Cordero/i, 'mains'), find(/Soda Bretaña|Agua|Café/i, 'drinks')] },
  { concept: 'Plan completo', note: 'Plato fuerte, bebida y entrada para una comida más completa.', lines: [find(/Fideuà de Mariscos|Salmón Sóller|Lomo a la Pimienta/i, 'mains'), find(/Soda Bretaña|Agua|Café/i, 'drinks'), find(/Champiñones Gratinados|Croqueta de Jamón|Escalivada/i, 'starters')] },
  { concept: 'Full descontrol', note: 'Plato fuerte, bebida, entrada y postre; usa productos representativos, no el producto más caro.', lines: [find(/Pulpo a las Brasas|Pesca del día|Rack de Cordero/i, 'mains'), find(/Soda Bretaña|Agua|Café/i, 'drinks'), find(/Tartar de Atún|Pulpo a la Gallega|Tabla de Ibéricos/i, 'starters'), find(/Tarta de Chocolate|Vasca Tradicional|Baklava Sóller/i, 'desserts')] },
];
const total = scenario => scenario.lines.reduce((sum, line) => sum + items.find(i => i.name === line.name).price * line.quantity / line.groupSize, 0);
const weekly = [
  [0, false, '12:00:00', '16:00:00'], [1, false, '12:00:00', '15:00:00'], [1, false, '18:00:00', '21:00:00'], [2, false, '12:00:00', '15:00:00'], [2, false, '18:00:00', '21:00:00'], [3, false, '12:00:00', '15:00:00'], [3, false, '18:00:00', '21:00:00'], [4, false, '12:00:00', '15:00:00'], [4, false, '18:00:00', '21:00:00'], [5, false, '12:00:00', '23:00:00'], [6, false, '12:00:00', '23:00:00'],
].map(([day, closed, open, close]) => ({ day_of_week: day, is_closed: closed, open_time: open, close_time: close, split_open_time: null, split_close_time: null }));
const spot = { id: spotId, type: 'place', slug: 'casa-soller-restaurante', name: 'Casa Sóller Restaurante', short_description: 'Cocina mediterránea en Granada, con platos de mar y tierra, arroces, pastas, entradas, postres y una carta amplia de vinos y cocteles.', cover_image_url: null, logo_url: null, gallery_urls: [], category: 'Comida', subcategories: ['Mediterránea', 'Española', 'Mariscos'], city: 'Cali', likes: '0', tags: ['mediterránea', 'española', 'mariscos', 'vinos', 'Granada'], moods: ['plan especial', 'pareja', 'con amigos'], is_active: true, is_featured: false, created_at: now, updated_at: now, catalog_status: 'reviewed_with_pending' };
const branch = { id: branchId, spot_id: spotId, slug: 'casa-soller-restaurante-granada', neighborhood: 'Granada', mall: '', hours: 'Lun-Jue 12:00-15:00 y 18:00-21:00 · Vie-Sáb 12:00-23:00 · Dom 12:00-16:00', holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null, holiday_split_open_time: null, holiday_split_close_time: null, address: google.address, min_budget: Math.round(total(scenarios[0])), max_budget: Math.round(total(scenarios[2])), typical_budget: Math.round(total(scenarios[0])), budget_scenarios: scenarios, budget_basis: 'Tres escenarios editoriales por persona con productos vigentes de la carta oficial. Por defecto se muestra Parche tranqui.', menu_calculation_note: 'Precios extraídos de la carta pública de Menupp; el restaurante puede actualizarlos.', menu_url: 'https://menupp.co/casasoller/', whatsapp: 'https://wa.me/573102666522', phone: '+573102666522', instagram: 'https://www.instagram.com/casasoller_restaurante/', latitude: google.latitude, longitude: google.longitude, google_maps_url: google.googleMapsUrl, google_place_id: google.placeId, website_url: google.website || 'https://menupp.co/casasoller/', menu_items: items, menu_items_verified_at: now, is_active: true, sort_order: 999, created_at: now, updated_at: now, catalog_status: 'reviewed_with_pending', missing_fields: ['holiday_hours', 'cover_image_url', 'logo_url', 'gallery_urls'], business_status: 'operational', min_people: 1, max_people: 8 };
catalog.spots.push(spot); catalog.branches.push(branch);
let hourId = Math.max(0, ...catalog.branchHours.map(h => Number(h.id) || 0), ...catalog.hours.map(h => Number(h.id) || 0));
const rows = weekly.map((row, index) => ({ id: ++hourId, branch_id: branchId, sort_order: index * 10, ...row }));
catalog.branchHours.push(...rows); catalog.hours.push(...rows.map(r => ({ ...r, id: ++hourId })));
catalog.generatedAt = now;
assert.equal(JSON.stringify(catalog).startsWith(before.slice(0, 20)), true);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${outDir}/integration.json`, JSON.stringify({ createdAt: now, status: 'created', spotId, branchId, sources: ['Instagram profile', 'Google Places', 'Menupp'], highlights: { status: 'blocked_devtools_profile_lock', selected: [] }, menu: { products: items.length, menus: menus.length }, budgets: scenarios.map(s => ({ concept: s.concept, perPerson: total(s) })), pending: branch.missing_fields }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'created', spotId, branchId, menuItems: items.length, budgets: scenarios.map(s => [s.concept, total(s)]), pending: branch.missing_fields }, null, 2));

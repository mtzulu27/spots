import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks/cantina-la-15';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const spot = catalog.spots.find(s => s.slug === 'cantina-la-15');
assert(spot, 'Cantina La 15 base missing');
const menuReport = JSON.parse(fs.readFileSync(fs.readdirSync('docs/catalog-review/benchmarks').filter(x => x.startsWith('cantinala15-menupp-links-')).sort().pop().replace(/^/, 'docs/catalog-review/benchmarks/'), 'utf8'));
const google = { granada: JSON.parse(fs.readFileSync(`${root}/google-granada.json`)).selected, ciudadJardin: JSON.parse(fs.readFileSync(`${root}/google-ciudad-jardin.json`)).selected };
const now = new Date().toISOString();
const categories = new Map(menuReport.menus.flatMap(m => m.categories).map(c => [c.id, c.name]));
const classify = section => { const s = String(section).toLowerCase(); if (/bebida|ginebra|tequila|ron|whisky|vino|cóctel|coctel|cerveza|limonada|soda|agua|champagne|americano|licor|tonica/.test(s)) return 'drinks'; if (/taco/.test(s)) return 'mains'; if (/guacamole|entrada/.test(s)) return 'starters'; if (/postre/.test(s)) return 'desserts'; if (/costilla|pescado|marisco|carne|lomo|fajita|caldo|arroz|clásico|prime|niño/.test(s)) return 'mains'; return 'extras'; };
const menuItems = [];
for (const menu of menuReport.menus.filter(m => ['UncaOiVDlQe5jOVVfPUg','dDmz2YyoYOUBg8DM0Mzk'].includes(m.locationId))) for (const p of menu.products || []) {
  const name = String(p.product_name || '').replace(/\s+/g, ' ').trim(); const section = categories.get(p.product_category) || 'Carta'; if (!name || p.disabled) continue;
  for (const price of p.price || []) { const amount = Number(price.price); if (!Number.isFinite(amount) || amount <= 0 || price.disable || price.noStock) continue; const full = price.label ? `${name} - ${String(price.label).trim()}` : name; if (menuItems.some(i => i.name === full)) continue; menuItems.push({ name: full, price: amount, category: classify(section), menuSection: section, sourceUrl: menu.source, verifiedAt: now, unit: price.label || 'unidad', calculationIncluded: true }); }
}
const find = (re, category) => { const item = menuItems.find(i => i.category === category && re.test(i.name)); assert(item, `Budget item missing: ${re}`); return { name: item.name, category, quantity: 1, groupSize: 1 }; };
const scenarios = [
  { concept: 'Parche tranqui', note: 'Plato fuerte individual y bebida; referencia editorial, no promedio de toda la carta.', lines: [find(/Barbacoa|Cochinita|Carnitas|Al Pastor|Tacos vegetarianos/i, 'mains'), find(/Limonada|Aromática|Gaseosa|Agua/i, 'drinks')] },
  { concept: 'Parche completo', note: 'Plato fuerte individual, bebida y entrada para una comida más completa.', lines: [find(/Barbacoa|Cochinita|Carnitas|Al Pastor|Tacos vegetarianos/i, 'mains'), find(/Limonada|Aromática|Gaseosa|Agua/i, 'drinks'), find(/Guacamole|Nachos|Campechanos/i, 'starters')] },
  { concept: 'Con toda', note: 'Plato fuerte, bebida, entrada y postre; usa productos representativos, no el más caro.', lines: [find(/Taquiza|Barbacoa|Cochinita|Carnitas/i, 'mains'), find(/Cóctel|Limonada|Aromática/i, 'drinks'), find(/Guacamole|Nachos|Campechanos/i, 'starters'), find(/Postre|Churro|Flan/i, 'desserts')] },
];
const priceOf = line => menuItems.find(i => i.name === line.name).price;
const total = s => s.lines.reduce((n, line) => n + priceOf(line), 0);
const branchSpecs = [
  { key: 'granada', slug: 'cantina-la-15-granada', neighborhood: 'Granada', menuLocation: 'UncaOiVDlQe5jOVVfPUg', ranges: [[null,null],['18:00','23:45'],['18:00','01:00'],['18:00','02:00'],['18:00','03:00'],['18:00','03:00'],['12:00','23:00']] },
  { key: 'ciudadJardin', slug: 'cantina-la-15-ciudad-jardin', neighborhood: 'Ciudad Jardín', menuLocation: 'dDmz2YyoYOUBg8DM0Mzk', ranges: [[null,null],['18:00','23:59'],['18:00','01:00'],['18:00','02:00'],['18:00','03:00'],['18:00','03:00'],['18:00','23:59']] },
];
Object.assign(spot, { name: 'Cantina La 15', short_description: 'Caé por cocina mexicana, tacos, platos para compartir y cocteles, y armá el parche con shows en vivo todos los días.', category: 'Comida', subcategories: ['Mexicana', 'Tacos', 'Cocteles'], tags: ['mexicana','tacos','cocteles','shows en vivo'], moods: ['con amigos','plan nocturno','celebrar'], is_active: true, catalog_status: 'reviewed_with_pending', missing_fields: ['holiday_hours'], updated_at: now });
let nextHour = Math.max(0, ...catalog.branchHours.map(h => Number(h.id)||0), ...catalog.hours.map(h => Number(h.id)||0));
for (const spec of branchSpecs) {
  const b = catalog.branches.find(x => x.slug === spec.slug); const place = google[spec.key]; assert(b && place);
  const items = menuItems.filter(i => spec.menuLocation === 'UncaOiVDlQe5jOVVfPUg' ? true : true);
  Object.assign(b, { address: place.address, neighborhood: spec.neighborhood, hours: spec.key === 'granada' ? 'Lun cerrado · Mar 18:00-23:45 · Mié 18:00-01:00 · Jue 18:00-02:00 · Vie-Sáb 18:00-03:00 · Dom 12:00-23:00' : 'Lun cerrado · Mar 18:00-23:59 · Mié 18:00-01:00 · Jue 18:00-02:00 · Vie-Sáb 18:00-03:00 · Dom 18:00-23:59', menu_url: 'https://menupp.co/cantinala15', menu_items: items, menu_items_verified_at: now, budget_scenarios: scenarios, budget_basis: 'Referencia por persona: plato fuerte y bebida del escenario Parche tranqui. No es promedio de la carta.', menu_calculation_note: 'Carta oficial de Menupp con presentaciones y precios vigentes; el restaurante puede actualizar los precios.', phone: place.internationalPhone || '+573009133447', whatsapp: 'https://wa.me/573009133447', latitude: place.latitude, longitude: place.longitude, google_maps_url: place.googleMapsUrl, google_place_id: place.placeId, website_url: 'https://menupp.co/cantinala15', business_status: 'operational', is_active: true, min_people: 1, max_people: 8, min_budget: total(scenarios[0]), typical_budget: total(scenarios[0]), max_budget: total(scenarios[2]), catalog_status: 'reviewed_with_pending', missing_fields: ['holiday_hours'], updated_at: now });
  catalog.branchHours = catalog.branchHours.filter(h => h.branch_id !== b.id); catalog.hours = catalog.hours.filter(h => h.branch_id !== b.id);
  const rows = spec.ranges.map(([open, close], day) => ({ id: ++nextHour, branch_id: b.id, day_of_week: day, is_closed: !open, open_time: open ? `${open}:00` : null, close_time: close ? `${close}:00` : null, split_open_time: null, split_close_time: null, sort_order: day * 10 }));
  catalog.branchHours.push(...rows); catalog.hours.push(...rows.map(row => ({ ...row, id: ++nextHour })));
}
catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${root}/integration.json`, JSON.stringify({ updatedAt: now, status: 'updated_cali_branches', spotId: spot.id, branches: branchSpecs.map(s => s.slug), menuItems: menuItems.length, budgets: scenarios.map(s => ({ concept: s.concept, perPerson: total(s) })), sources: ['Instagram profile','Menupp','Google Places'], pending: ['holiday_hours','highlights','cover/gallery'] }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'updated_cali_branches', spotId: spot.id, branches: branchSpecs.map(s => s.slug), menuItems: menuItems.length, budgets: scenarios.map(s => [s.concept,total(s)]) }, null, 2));

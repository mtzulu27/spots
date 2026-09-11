import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks/cafe-quindio-cali/missing';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const spot = catalog.spots.find(s => s.slug === 'cafe-quindio');
assert(spot, 'Café Quindío base missing');
const now = new Date().toISOString();
const places = {
  unico: JSON.parse(fs.readFileSync(`${root}/google-unico-outlet-detail.json`)).selected,
  icesi: JSON.parse(fs.readFileSync(`${root}/google-icesi.json`)).selected,
  cenco: JSON.parse(fs.readFileSync(`${root}/google-cenco-limonar.json`)).selected,
  jardin: JSON.parse(fs.readFileSync(`${root}/google-jardin-plaza-detail.json`)).selected,
};
const specs = [
  { key: 'unico', slug: 'cafe-quindio-unico-outlet', name: 'Café Quindío Único Outlet', neighborhood: 'Único Outlet', address: 'C.C. Único Outlet, Burbuja B54, piso 1, Cali', hours: 'Lun-Jue 08:00-20:00 · Vie-Sáb 08:00-21:00 · Dom 09:00-20:00', ranges: [['08:00','20:00'],['08:00','20:00'],['08:00','20:00'],['08:00','20:00'],['08:00','21:00'],['08:00','21:00'],['09:00','20:00']] },
  { key: 'icesi', slug: 'cafe-quindio-universidad-icesi', name: 'Café Quindío Universidad ICESI', neighborhood: 'Pance', address: 'Calle 18 No. 122-135, Plazoleta La Sombra, Pance, Cali', hours: 'Lun-Vie 08:00-18:30 · Sáb 08:00-16:00 · Dom cerrado', ranges: [['08:00','18:30'],['08:00','18:30'],['08:00','18:30'],['08:00','18:30'],['08:00','18:30'],['08:00','16:00'],[null,null]] },
  { key: 'cenco', slug: 'cafe-quindio-cenco-limonar', name: 'Café Quindío Cenco Limonar', neighborhood: 'El Limonar', address: 'C.C. Cenco Limonar, Calle 5 #69-03, local 1-27, Cali', hours: 'Lun-Jue 08:00-20:00 · Vie-Sáb 08:00-21:00 · Domingos y festivos 08:00-20:00', ranges: [['08:00','20:00'],['08:00','20:00'],['08:00','20:00'],['08:00','20:00'],['08:00','21:00'],['08:00','21:00'],['08:00','20:00']] },
  { key: 'jardin', slug: 'cafe-quindio-jardin-plaza', name: 'Café Quindío Jardín Plaza', neighborhood: 'Ciudad Jardín', address: 'Centro Comercial Jardín Plaza, Carrera 98 #16-200, Cali', hours: 'Lun-Dom y festivos 08:00-20:00', ranges: Array.from({length:7}, () => ['08:00','20:00']) },
];
let nextId = Math.max(...catalog.branches.map(b => Number(b.id) || 0)) + 1;
let nextHour = Math.max(0, ...catalog.branchHours.map(h => Number(h.id) || 0), ...catalog.hours.map(h => Number(h.id) || 0));
const oldBranchFor = key => key === 'cenco' ? catalog.branches.find(b => b.slug === 'cafe-quindio-cenco-limonar') : key === 'jardin' ? catalog.branches.find(b => b.slug === 'cafe-quindio-jardin-plaza') : null;
for (const spec of specs) {
  const place = places[spec.key];
  const old = oldBranchFor(spec.key);
  const id = old?.id ?? nextId++;
  const branch = { id, spot_id: spot.id, slug: spec.slug, neighborhood: spec.neighborhood, mall: '', address: spec.address, hours: spec.hours, holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null, holiday_split_open_time: null, holiday_split_close_time: null, menu_items: [], budget_scenarios: [], budget_basis: 'Presupuesto por confirmar', min_budget: 0, max_budget: 0, typical_budget: 0, max_people: null, min_people: null, menu_url: '', whatsapp: place.internationalPhone ? `https://wa.me/${place.internationalPhone.replace(/\D/g, '')}` : '', phone: place.internationalPhone || '', instagram: 'https://www.instagram.com/cafequindio.co/', latitude: place.latitude, longitude: place.longitude, google_maps_url: place.googleMapsUrl, google_place_id: place.placeId, website_url: 'https://www.cafequindio.com.co/', business_status: place.businessStatus || 'operational', is_active: true, sort_order: 999, created_at: old?.created_at ?? now, updated_at: now, catalog_status: 'reviewed_with_pending', missing_fields: ['menu_items', 'budget', 'holiday_hours'] };
  if (old) Object.assign(old, branch); else catalog.branches.push(branch);
  catalog.branchHours = catalog.branchHours.filter(row => row.branch_id !== id); catalog.hours = catalog.hours.filter(row => row.branch_id !== id);
  const rows = spec.ranges.map(([open, close], day) => ({ id: ++nextHour, branch_id: id, day_of_week: day, is_closed: !open, open_time: open ? `${open}:00` : null, close_time: close ? `${close}:00` : null, split_open_time: null, split_close_time: null, sort_order: day * 10 }));
  catalog.branchHours.push(...rows); catalog.hours.push(...rows.map(row => ({ ...row, id: ++nextHour })));
}
catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${root}/integration.json`, JSON.stringify({ updatedAt: now, status: 'four_cali_sedes_integrated', spotId: spot.id, sources: ['https://www.cafequindio.com.co/blogs/cali', 'Google Places'], branches: specs.map(s => ({ slug: s.slug, name: s.name, neighborhood: s.neighborhood })), excluded: 'C.C. Llanogrande, Palmira', pending: 'menu prices, holiday verification beyond official text, highlights, cover/gallery' }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'four_cali_sedes_integrated', branches: specs.map(s => s.name), excluded: 'Palmira' }, null, 2));

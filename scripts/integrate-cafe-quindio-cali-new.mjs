import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks/cafe-quindio-cali';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
const existingSpot = catalog.spots.find(s => s.slug === 'cafe-quindio');
const spotId = existingSpot?.id ?? Math.max(...catalog.spots.map(s => Number(s.id) || 0)) + 1;
const specs = [
  ['unicentro', 'Café Quindío Unicentro Cali', 'Las Vegas', 'C.C. Unicentro, Cra. 100 #5-169 Local EC-96, Primer Piso, Las Vegas, Cali, Valle del Cauca', 3.3726392, -76.5388305, 'ChIJ3dGiBjShMI4R5IdWTj-Gs4w', 'https://maps.google.com/?cid=10138594792596473828', ['08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','08:00-21:00','08:00-21:00','09:00-20:00'], '+573108975776'],
  ['pance', 'Café Quindío Pance', 'Pance', 'Calle 16ª #121ª-334, Local 1-2, Barrio Pance, Cali, Valle del Cauca', 3.3431795, -76.5353147, 'ChIJK5DOQwChMI4Rnx2Ezs7KN4Y', 'https://maps.google.com/?cid=9671421714378268063', ['08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','08:00-21:00','08:00-21:00','08:00-20:00'], ''],
  ['ciudad-jardin', 'Café Quindío Ciudad Jardín', 'Ciudad Jardín', 'Cra. 98A #16-200, Comuna 17, Cali, Valle del Cauca', 3.3700435, -76.5272997, 'ChIJu_Qa2m2hMI4RQt3zSlqRTwM', 'https://maps.google.com/?cid=238569122264505666', [], ''],
  ['chipichape', 'Café Quindío Chipichape', 'Chipichape', 'Centro Comercial Chipichape, Cl. 38 Nte. #6N-45 Isla 813, Cali, Valle del Cauca', 3.4765142, -76.5282299, 'ChIJo4HY7JWnMI4R1vRJng3y1BY', 'https://maps.google.com/?cid=1645205904201217238', ['08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','08:00-09:00','08:00-21:00','09:00-20:00'], '+573108975776'],
  ['granada', 'Café Quindío Granada', 'Granada', 'Av. 9 Nte. #17N-14, Santa Monica Residential, Cali, Valle del Cauca', 3.4610803, -76.5328411, 'ChIJL-RuCACnMI4RRA4Ym8IzUbo', 'https://maps.google.com/?cid=13425568875086876228', ['08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','08:00-20:00','09:30-20:00'], '']
];
const spot = { id: spotId, type: 'place', slug: 'cafe-quindio', name: 'Café Quindío', short_description: 'El Café del Corazón de Colombia, con espacios para disfrutar café, bebidas y productos de la marca en Cali.', category: 'Comida', subcategories: ['Café', 'Panadería'], city: 'Cali', likes: '0', tags: ['café', 'cafetería', 'panadería', 'Cali'], moods: ['tomar algo', 'trabajar', 'tranquilo'], is_active: true, is_featured: false, created_at: existingSpot?.created_at ?? now, updated_at: now, catalog_status: 'reviewed_with_pending', ...(existingSpot ? { cover_image_url: existingSpot.cover_image_url, logo_url: existingSpot.logo_url, gallery_urls: existingSpot.gallery_urls } : { cover_image_url: null, logo_url: null, gallery_urls: [] }) };
if (existingSpot) Object.assign(existingSpot, spot); else catalog.spots.push(spot);
let branchId = Math.max(...catalog.branches.map(b => Number(b.id) || 0)) + 1;
let hourId = Math.max(0, ...catalog.branchHours.map(h => Number(h.id) || 0), ...catalog.hours.map(h => Number(h.id) || 0));
for (const [slug, name, neighborhood, address, latitude, longitude, placeId, maps, hours, phone] of specs) {
  const aliases = { 'unicentro': ['cafe-quindio-unicentro'], 'pance': ['cafe-quindio-canaveral-pance'], 'ciudad-jardin': ['cafe-quindio-jardin-plaza'], 'chipichape': ['cafe-quindio-chipichape'], 'granada': ['cafe-quindio-granada'] };
  const existingBranch = catalog.branches.find(b => aliases[slug]?.includes(b.slug));
  const id = existingBranch?.id ?? branchId++;
  const rows = hours.map((range, day) => {
    const [open, close] = range.split('-');
    return { id: ++hourId, branch_id: id, day_of_week: day, is_closed: false, open_time: `${open}:00`, close_time: `${close}:00`, split_open_time: null, split_close_time: null, sort_order: day * 10 };
  });
  const branch = { id, spot_id: spotId, slug: `cafe-quindio-${slug}`, neighborhood, mall: '', address, hours: hours.length ? 'Lun-Jue 08:00-20:00 · Vie-Sáb 08:00-21:00 · Dom 09:00-20:00' : 'Horario por confirmar', holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null, holiday_split_open_time: null, holiday_split_close_time: null, menu_items: [], budget_scenarios: [], budget_basis: 'Presupuesto por confirmar', min_budget: 0, max_budget: 0, typical_budget: 0, max_people: null, min_people: null, menu_url: '', whatsapp: phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '', phone, instagram: 'https://www.instagram.com/cafequindio.co/', latitude, longitude, google_maps_url: maps, google_place_id: placeId, website_url: 'https://www.cafequindio.com.co/', business_status: 'operational', is_active: true, sort_order: 999, created_at: now, updated_at: now, catalog_status: 'reviewed_with_pending', missing_fields: ['menu_items', 'budget', 'holiday_hours', ...(hours.length ? [] : ['hours'])] };
  if (existingBranch) Object.assign(existingBranch, branch, { created_at: existingBranch.created_at }); else catalog.branches.push(branch);
  catalog.branchHours = catalog.branchHours.filter(row => row.branch_id !== id); catalog.hours = catalog.hours.filter(row => row.branch_id !== id);
  catalog.branchHours.push(...rows); catalog.hours.push(...rows.map(row => ({ ...row, id: ++hourId })));
}
catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${root}/integration.json`, JSON.stringify({ createdAt: now, status: 'created_cali_only', spotId, branches: catalog.branches.filter(b => b.spot_id === spotId).map(b => ({ id: b.id, slug: b.slug, neighborhood: b.neighborhood, address: b.address, hours: b.hours })), sources: ['Instagram profile', 'official website', 'Google Places'], highlights: 'blocked_devtools_profile_lock', menu: 'official website exposed retail products, not sede menu; no local menu prices integrated', logo: 'pending_finish' }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'created_cali_only', spotId, branches: specs.length, pending: 'menu, budgets, holidays, highlights, cover, gallery' }, null, 2));

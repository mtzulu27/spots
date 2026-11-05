import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const now = new Date().toISOString();
const googleFiles = {
  'pacific-center': 'docs/catalog-review/benchmarks/chacalacasco/google-pacific-center.json',
  unicentro: 'docs/catalog-review/benchmarks/chacalacasco/google-unicentro.json',
  'puerto-125': 'docs/catalog-review/benchmarks/chacalacasco/google-puerto-125.json',
  'ciudad-jardin': 'docs/catalog-review/benchmarks/chacalacasco/google-ciudad-jardin.json',
};
const google = Object.fromEntries(Object.entries(googleFiles).map(([key, file]) => [key, JSON.parse(fs.readFileSync(file, 'utf8')).selected]));

const spot = catalog.spots.find((row) => row.slug === 'chacalacas');
if (spot) throw new Error('Chacalacas ya existe; no se permite duplicar una ficha en una creación desde cero');

const branches = [
  ['pacific-center', 'Chacalacas Pacific Center', 'C.C. Pacific Center', 'Calle 36N # 6A-65, local 505', true],
  ['unicentro', 'Chacalacas Unicentro', 'C.C. Unicentro', 'Cra. 100 # 5-169, local 511B', true],
  ['jardin-plaza', 'Chacalacas Jardín Plaza', 'C.C. Jardín Plaza', 'Cra. 98 # 16-200, local R22', true],
  ['puerto-125', 'Chacalacas Puerto 125', 'Puerto 125', 'Calle 16A # 124-285, Pance', false],
  ['plazuela-municipal', 'Chacalacas Plazuela Municipal', 'Plazuela Municipal', 'Av. 9 Nte # 17-27, barrio Granada', false],
  ['ciudad-jardin', 'Chacalacas Ciudad Jardín', 'Ciudad Jardín', 'Calle 15B # 103-1, barrio Ciudad Jardín', false],
  ['plazoleta-jairo-varela', 'Chacalacas Plazoleta Jairo Varela', 'Plazoleta Jairo Varela', 'Av. 2 Nte # 10-70, tercer nivel', false],
];

const spotId = Math.max(...catalog.spots.map((row) => Number(row.id))) + 1;
const firstBranchId = Math.max(...catalog.branches.map((row) => Number(row.id))) + 1;
const shared = {
  category: 'Comida',
  subcategories: ['Cocina mexicana', 'Restaurantes', 'Cena'],
  menu_items: [],
  budget_scenarios: [],
  min_budget: 0,
  max_budget: 0,
  typical_budget: 0,
  budget_basis: 'Presupuesto por confirmar: la carta pública no devolvió precios utilizables durante esta revisión.',
  menu_calculation_note: 'Presupuesto pendiente de validación de carta; no se inventan precios.',
  menu_url: 'https://app.menupp.co/restaurant/chacalacas',
  instagram: 'https://www.instagram.com/chacalacasco/',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  business_status: 'operational',
};

const newSpot = {
  id: spotId,
  type: 'place',
  slug: 'chacalacas',
  name: 'Chacalacas',
  short_description: 'Cocina mexicana con sabor, cocteles y mariachis en vivo para armar un parche distinto. Caé con tu gente, pedí algo para compartir y quedate a disfrutar la noche.',
  cover_image_url: '',
  gallery_urls: [],
  ...shared,
  city: 'Cali',
  likes: '0',
  tags: ['cocina mexicana', 'restaurante', 'mariachis', 'cocteles', 'parche', 'comida para compartir'],
  moods: ['parche', 'celebración', 'noche', 'compartir'],
  is_featured: false,
  created_at: now,
  updated_at: now,
  missing_fields: ['cover_image', 'gallery', 'menu_prices', 'holiday_hours', 'ambiguous_google_matches'],
  logo_url: '',
};

catalog.spots.push(newSpot);
for (const [index, [key, name, mall, address, isMall]] of branches.entries()) {
  const g = google[key];
  const coords = g ? { google_maps_url: g.googleMapsUrl, google_place_id: g.placeId, latitude: g.latitude, longitude: g.longitude } : { google_maps_url: '', google_place_id: '', latitude: null, longitude: null };
  const hours = isMall ? 'Dom-Jue 12:00-21:00 · Vie-Sab 12:00-22:00' : 'Dom-Mie 12:00-21:30 · Jue 12:00-22:00 · Vie-Sab 12:00-00:00';
  catalog.branches.push({
    id: firstBranchId + index,
    spot_id: spotId,
    slug: `chacalacas-${key}`,
    neighborhood: key === 'puerto-125' ? 'Pance' : key === 'plazuela-municipal' ? 'Granada' : key === 'ciudad-jardin' ? 'Ciudad Jardín' : key === 'plazoleta-jairo-varela' ? 'Centenario' : '',
    mall,
    address: `${address}, Cali`,
    hours,
    holiday_mode: 'unknown',
    holiday_open_time: null,
    holiday_close_time: null,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    ...shared,
    ...coords,
    whatsapp: '',
    phone: '',
    website_url: 'https://linktr.ee/chacalacascol',
    is_active: true,
    sort_order: index + 1,
    created_at: now,
    updated_at: now,
    missing_fields: [...(g ? [] : ['google_place_match', 'coordinates']), 'menu_prices', 'holiday_hours'],
  });
}

catalog.generatedAt = now;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('docs/catalog-review/benchmarks/chacalacasco/consolidated.json', JSON.stringify({
  status: 'integrated_with_pending',
  updatedAt: now,
  spot: newSpot,
  branches: catalog.branches.filter((row) => row.spot_id === spotId),
  sources: ['Instagram profile', 'Instagram highlights: Ubicación', 'Instagram highlights: Horarios', 'Google Places API', 'Linktree'],
  pending: ['menu_prices', 'cover_image', 'gallery', 'holiday_hours', 'ambiguous_google_matches'],
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'created', spot: newSpot.slug, branches: catalog.branches.filter((row) => row.spot_id === spotId).length, googleMatched: Object.values(google).filter(Boolean).length }, null, 2));

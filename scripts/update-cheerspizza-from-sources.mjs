import fs from 'node:fs/promises';
import { integrateCatalog } from './spots-research/integrate-catalog.mjs';

const now = new Date().toISOString();
const sourceUrls = [
  'https://www.instagram.com/cheerspizza/',
  'https://linktr.ee/cheerspizzeria',
  'https://cheerspizzeria.com/puntos-cheers/',
  'https://cheerspizzeria.com/menu/',
];
const branches = [
  ['Pance Puerto 125', 'Pance', 'Puerto 125', 'Cra 125 con Av. La María, Barrio Pance, Local 12A, Cali', 'cali-p125'],
  ['Bochalema', 'Bochalema', 'Bochalema Plaza', 'Av. Panamericana con carrera 109, local PC 8, Cali', 'cali-bochalema'],
  ['Valle del Lili', 'Valle del Lili', '', 'Calle 42 con carrera 90, esquina, Cali', 'cali-lili'],
  ['Ingenio', 'El Ingenio', '', 'Calle 16 #84A-12, Cali', 'cali-ingenio'],
  ['C.C. Unicentro', 'Ciudad Jardín', 'C.C. Unicentro', 'Pasillo 5, kiosco 3, Cali', 'cali-unicentro'],
  ['Novena', 'San Fernando', 'Camino Real', 'Calle 9 #56-164, Cali', 'cali-novena'],
  ['C.C. Premier', 'El Limonar', 'C.C. Premier Limonar', 'Plazoleta de comidas, Cali', 'cali-premier'],
  ['Roosevelt', 'San Fernando', '', 'Av. Roosevelt #39-70, Cali', 'cali-roosevelt'],
  ['San Fernando', 'San Fernando', 'Parque del Perro', 'Cra. 34 #3A-48, Cali', 'cali-sanfernando'],
  ['C.C. Estación', 'San Vicente', 'C.C. La Estación', 'Local A2-28, Cali', 'cali-estacion'],
  ['C.C. Chipichape', 'La Flora', 'C.C. Chipichape', 'Kiosco 829, bodega 8, Cali', 'cali-chipichape'],
  ['La 52 (Flora)', 'La Flora', '', 'Av. 5 #51N-48, Cali', 'cali-flora'],
];
const menuByKey = {
  'cali-p125': 'https://cheerspizzeria.com/menu-experiencia-p125/',
  'cali-bochalema': 'https://cheerspizzeria.com/menu-express/',
  'cali-unicentro': 'https://cheerspizzeria.com/menu-express/',
  'cali-lili': 'https://cheerspizzeria.com/menu-experiencia/',
  'cali-ingenio': 'https://cheerspizzeria.com/menu-experiencia/',
  'cali-novena': 'https://cheerspizzeria.com/menu-experiencia/',
  'cali-premier': 'https://cheerspizzeria.com/menu-express/',
  'cali-roosevelt': 'https://cheerspizzeria.com/menu-experiencia-roosvelt/',
  'cali-sanfernando': 'https://cheerspizzeria.com/menu-experiencia/',
  'cali-estacion': 'https://cheerspizzeria.com/menu-express/',
  'cali-chipichape': 'https://cheerspizzeria.com/menu-express/',
  'cali-flora': 'https://cheerspizzeria.com/menu-experiencia/',
};
const google = JSON.parse(await fs.readFile('docs/catalog-review/benchmarks/cheerspizza/google.json', 'utf8'));
const googleByName = new Map(google.candidates.map((p) => [p.name.toLowerCase(), p]));
const aliases = {
  'Valle del Lili': 'cheers pizzeria valle del lili',
  Ingenio: 'cheers pizzería ingenio',
  'La 52 (Flora)': 'cheers pizzería la flora',
  Bochalema: 'cheers bochalema',
};
const branchData = branches.map(([name, neighborhood, mall, address, key], index) => {
  const place = googleByName.get((aliases[name] || '').toLowerCase());
  const slug = index === 8 ? 'cheers-pizzeria-parque-del-perro' : `cheers-pizzeria-${key.replace(/^cali-/, '').replace(/[^a-z0-9]+/g, '-')}`;
  return {
    data: {
      id: index === 8 ? 44 : undefined,
      slug, spot_id: 37, neighborhood, mall, city: 'Cali', address,
      hours: '', holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null,
      holiday_split_open_time: null, holiday_split_close_time: null,
      min_budget: 0, max_budget: 0, min_people: 2, max_people: 6,
      typical_budget: 0, budget_basis: 'Presupuesto por confirmar',
      menu_calculation_note: 'Carta oficial localizada; precios pendientes de extracción verificable.',
      budget_scenarios: [], menu_url: menuByKey[key], menu_items: [],
      whatsapp: '', phone: '', instagram: 'https://www.instagram.com/cheerspizza/',
      latitude: place?.latitude ?? null, longitude: place?.longitude ?? null,
      google_maps_url: place?.googleMapsUrl ?? '', google_place_id: place?.placeId ?? '',
      website_url: 'https://cheerspizzeria.com/', business_status: place?.businessStatus === 'OPERATIONAL' ? 'operational' : 'unknown',
      catalog_status: 'pending_review', missing_fields: ['hours', 'menu_items', 'budget_scenarios', ...(place ? [] : ['coordinates'])],
      source_urls: sourceUrls, is_active: true, sort_order: 10,
    },
      write: { mode: index === 8 ? 'update' : 'create', fields: ['neighborhood','mall','city','address','hours','holiday_mode','holiday_open_time','holiday_close_time','holiday_split_open_time','holiday_split_close_time','min_budget','max_budget','min_people','max_people','typical_budget','budget_basis','menu_calculation_note','budget_scenarios','menu_url','menu_items','whatsapp','phone','instagram','latitude','longitude','google_maps_url','google_place_id','website_url','business_status','catalog_status','missing_fields','is_active','sort_order'] , hours: 'replace' },
    weeklyHours: [],
  };
});
const spot = { data: {
  id: 37, type: 'place', slug: 'cheers-pizzeria', name: 'Cheers Pizzeria',
  short_description: 'Una pizzería caleña para celebrar, compartir y armar parche con pizza, pastas y algo rico para acompañar la mesa.',
  cover_image_url: '', logo_url: '', gallery_urls: [], category: 'Comida',
  subcategories: ['Pizza', 'Italiana', 'Pasta', 'Almuerzo', 'Cena'], city: 'Cali',
  likes: '0', tags: ['pizza','pizzería','comida','pasta','parche','familia','grupos'],
  moods: ['casual','con amigos','comer rico','plan tranqui','familiar'], is_active: true,
  is_featured: false, catalog_status: 'pending_review', missing_fields: ['cover_image_url','gallery_urls','hours','menu_items','budget_scenarios'],
  source_urls: sourceUrls, instagram: 'https://www.instagram.com/cheerspizza/', address: '', reviewed_at: now,
}, write: { mode: 'update', fields: ['type','name','short_description','cover_image_url','logo_url','gallery_urls','category','subcategories','city','likes','tags','moods','is_active','is_featured','catalog_status','missing_fields','source_urls','instagram','address','reviewed_at'] } };
const input = { schemaVersion: 1, ...spot, branches: branchData };
await fs.writeFile('docs/catalog-review/benchmarks/cheerspizza/consolidated.json', JSON.stringify(input, null, 2));
console.log(JSON.stringify(await integrateCatalog('docs/catalog-review/benchmarks/cheerspizza/consolidated.json', 'apps/mobile/public/spots-catalog.json'), null, 2));

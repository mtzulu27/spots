import fs from 'node:fs';

const catalogFile = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks/cascanuecesreposteriaartesanal';
const now = new Date().toISOString();
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = read(catalogFile);
const panceGoogle = read(`${root}/google-pance.json`).candidates.find((item) => item.address.includes('Pance'));
const limonarGoogle = read(`${root}/google-limonar.json`).selected;
if (!panceGoogle || !limonarGoogle) throw new Error('No se pudo validar cada sede en Google Places');

const spot = catalog.spots.find((row) => row.slug === 'cascanueces');
if (!spot) throw new Error('Cascanueces no existe en el catalogo');

Object.assign(spot, {
  name: 'Cascanueces',
  short_description: 'Repostería artesanal para caer por algo dulce, pedir una torta especial o armar un parche tranquilo con café y antojos de vitrina.',
  category: 'Comida',
  subcategories: ['Repostería', 'Postres', 'Café'],
  tags: ['repostería artesanal', 'tortas', 'postres', 'café', 'antojo dulce'],
  moods: ['tranqui', 'antojo', 'celebración'],
  instagram: 'https://www.instagram.com/cascanuecesreposteriaartesanal/',
  is_active: true,
  business_status: 'operational',
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['menu_prices', 'holiday_hours', 'cover_image_url', 'gallery_urls'],
  updated_at: now,
});

const pance = catalog.branches.find((row) => row.slug === 'cascanueces-puerto-125');
const limonar = catalog.branches.find((row) => row.slug === 'cascanueces-limonar');
if (!pance || !limonar) throw new Error('Sedes existentes no encontradas');

const common = {
  spot_id: spot.id,
  category: 'Comida',
  subcategories: ['Repostería', 'Postres', 'Café'],
  menu_items: [],
  budget_scenarios: [],
  min_budget: 0,
  max_budget: 0,
  typical_budget: 0,
  budget_basis: 'Presupuesto por confirmar: la carta de Drive no fue descargable por HTTP.',
  menu_calculation_note: 'Carta pendiente de lectura: el enlace público de Drive bloqueó la descarga HTTP.',
  menu_url: 'https://drive.google.com/file/d/1DL_6uB_CeeIrj52WigvxG5fzeO2lQsnm/view?usp=sharing',
  instagram: 'https://www.instagram.com/cascanuecesreposteriaartesanal/',
  menu_items_verified_at: null,
  business_status: 'operational',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['menu_prices', 'holiday_hours'],
  min_people: 1,
  max_people: 4,
  updated_at: now,
};

Object.assign(pance, common, {
  neighborhood: 'Pance',
  mall: 'Puerto 125',
  address: 'Carrera 125 con Calle 16A, Puerto 125, Pance, Cali',
  hours: 'Horario por confirmar',
  phone: '3043458838',
  whatsapp: 'https://wa.me/573043458838',
  latitude: 3.3380874,
  longitude: -76.5351777,
  google_maps_url: panceGoogle.googleMapsUrl,
  google_place_id: panceGoogle.placeId,
});

Object.assign(limonar, common, {
  neighborhood: 'El Limonar',
  mall: '',
  address: limonarGoogle.address,
  hours: 'Lun-Jue 10:00-19:00 · Vie-Sab 10:00-20:00 · Dom 10:00-18:00',
  phone: '3006117942',
  whatsapp: 'https://wa.me/573006117942',
  latitude: limonarGoogle.latitude,
  longitude: limonarGoogle.longitude,
  google_maps_url: limonarGoogle.googleMapsUrl,
  google_place_id: limonarGoogle.placeId,
});

catalog.generatedAt = now;
fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
fs.mkdirSync(`${root}/integration`, { recursive: true });
fs.writeFileSync(`${root}/integration/consolidated.json`, JSON.stringify({
  status: 'integrated_with_pending',
  updatedAt: now,
  source: 'Instagram profile + Google Places',
  spot: 'cascanueces',
  branches: ['cascanueces-puerto-125', 'cascanueces-limonar'],
  pending: ['menu_prices', 'holiday_hours', 'cover_image_url', 'gallery_urls'],
  notes: ['Drive PDF download was blocked over HTTP', 'Pance Google candidate had no hours; no hours were invented'],
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'integrated_with_pending', spot: spot.slug, branches: [pance.slug, limonar.slug], pending: common.missing_fields }, null, 2));

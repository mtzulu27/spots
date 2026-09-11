import fs from 'node:fs';

const catalogPath = 'apps/mobile/public/spots-catalog.json';
const evidenceDir = 'docs/catalog-review/benchmarks/thefactoryaudiobar';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
if (catalog.spots.some((spot) => /factory/i.test(`${spot.slug} ${spot.name}`))) throw new Error('The Factory ya existe');

const now = new Date().toISOString();
const spotId = Math.max(...catalog.spots.map((spot) => Number(spot.id) || 0)) + 1;
const branchId = Math.max(...catalog.branches.map((branch) => Number(branch.id) || 0)) + 1;
const hourStart = Math.max(...catalog.branchHours.map((row) => Number(row.id) || 0)) + 1;
const sourceUrls = [
  'https://www.instagram.com/thefactoryaudiobar/',
  'https://menupp.co/thefactory',
  'https://maps.google.com/?cid=11442087118937193458',
];
const spot = {
  id: spotId,
  slug: 'the-factory-audiobar',
  created_at: now,
  type: 'place',
  name: 'The Factory Audiobar',
  short_description: 'Audiobar de Granada para escuchar música, comer algo y armar un parche de noche con sonidos retro, house, dance y reguetón old school.',
  category: 'Vida nocturna',
  city: 'Cali',
  subcategories: ['Bar', 'Música', 'Cocteles', 'Comida'],
  tags: ['audiobar', 'bar', 'música', 'house', 'dance', 'reguetón', 'granada', 'cali'],
  moods: ['con amigos', 'noche', 'tomar algo', 'música', 'parche'],
  instagram: 'https://www.instagram.com/thefactoryaudiobar/',
  is_active: true,
  is_featured: false,
  catalog_status: 'reviewed_with_pending',
  source_urls: sourceUrls,
  reviewed_at: now,
  updated_at: now,
  cover_image_url: '',
  gallery_urls: [],
  missing_fields: ['cover_image_url', 'gallery_urls', 'holiday_hours'],
};
const branch = {
  id: branchId,
  spot_id: spotId,
  slug: 'the-factory-audiobar-granada',
  neighborhood: 'Granada',
  mall: '',
  city: 'Cali',
  address: 'Av. 6a Nte. #21 Norte-11, Santa Monica Residential, Cali, Valle del Cauca',
  latitude: 3.4630019,
  longitude: -76.5313367,
  google_maps_url: 'https://maps.google.com/?cid=11442087118937193458',
  google_place_id: 'ChIJxQLiNQCnMI4R8vtSpZx1yp4',
  website_url: 'https://menupp.co/thefactory',
  phone: '3107619047',
  whatsapp: 'https://wa.me/573181848751',
  instagram: spot.instagram,
  hours: 'Todos los días 18:00-01:00',
  business_status: 'operational',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['cover_image_url', 'gallery_urls', 'holiday_hours'],
  menu_url: 'https://menupp.co/thefactory',
  menu_items: [],
  budget_scenarios: [],
  min_budget: 0,
  typical_budget: 0,
  max_budget: 0,
  budget_basis: 'Presupuesto por confirmar',
  source_urls: sourceUrls,
  created_at: now,
  updated_at: now,
};
const hours = Array.from({ length: 7 }, (_, day) => ({ id: hourStart + day, branch_id: branchId, day_of_week: day, is_closed: false, open_time: '18:00', close_time: '01:00', sort_order: day * 10 }));
catalog.spots.push(spot);
catalog.branches.push(branch);
catalog.branchHours.push(...hours);
catalog.hours = catalog.branchHours;
catalog.generatedAt = now;
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(`${evidenceDir}/consolidated.json`, `${JSON.stringify({ version: 1, status: 'integrated_with_pending_photos', spotId, branchId, spot, branch, sources: sourceUrls, pending: ['highlights_not_available_in_public_html', 'cover_gallery_not_validated'] }, null, 2)}\n`);
console.log(JSON.stringify({ spotId, branchId, hours: hours.length, status: 'integrated' }, null, 2));

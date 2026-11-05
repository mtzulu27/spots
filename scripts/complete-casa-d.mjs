import fs from 'node:fs';

const file = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const spot = catalog.spots.find((item) => item.slug === 'casa-d-cali');
const branch = catalog.branches.find((item) => item.slug === 'casa-d-cali-granada');
if (!spot || !branch) throw new Error('Casa D record not found');

const now = new Date().toISOString();
Object.assign(spot, {
  name: 'Casa D',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  updated_at: now,
});
Object.assign(branch, {
  neighborhood: 'Granada',
  address: 'Cl. 17 Nte. #8-42, Santa Monica Residential, Cali, Valle del Cauca',
  hours: 'Lun-Mié cerrado · Jue-Sáb 19:00-03:00 · Dom cerrado',
  phone: '+57 311 8417065',
  whatsapp: 'https://wa.me/573118417065',
  instagram: 'https://instagram.com/casa.d_cali/',
  latitude: 3.4608294,
  longitude: -76.532543,
  google_maps_url: 'https://maps.google.com/?cid=7297206620835889125',
  google_place_id: 'ChIJk-VvAQKnMI4R5T-NZ8LiRGU',
  business_status: 'operational',
  is_active: true,
  updated_at: now,
});
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('docs/catalog-review/benchmarks/casa-d-cali/integration.json', JSON.stringify({
  updatedAt: now,
  status: 'completed_missing_fields',
  spotId: spot.id,
  branchId: branch.id,
  sources: ['Instagram profile', 'Google Places'],
  completed: ['address', 'coordinates', 'phone', 'whatsapp', 'regular_hours', 'business_status', 'published'],
  pending: ['highlights', 'logo'],
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'completed_missing_fields', spotId: spot.id, branchId: branch.id, published: true }, null, 2));

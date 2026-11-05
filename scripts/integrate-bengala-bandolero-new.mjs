import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'apps/mobile/public/spots-catalog.json';
const root = 'docs/catalog-review/benchmarks/bengala-bandolero';
const google = JSON.parse(fs.readFileSync(`${root}/google-places.json`, 'utf8')).selected;
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
const existingSpot = catalog.spots.find(s => s.slug === 'bengala-bandolero');
const existingBranch = catalog.branches.find(s => s.slug === 'bengala-bandolero-miraflores');
const id = existingSpot?.id ?? Math.max(...catalog.spots.map(s => Number(s.id) || 0)) + 1;
const branchId = existingBranch?.id ?? Math.max(...catalog.branches.map(s => Number(s.id) || 0)) + 1;
const spot = {
  id, type: 'place', slug: 'bengala-bandolero', name: 'Bengala & Bandolero',
  short_description: 'Bar de escucha con coctelería y música; cerrado temporalmente por reubicación según su perfil oficial.',
  cover_image_url: null, logo_url: null, gallery_urls: [], category: 'Tomar algo',
  subcategories: ['Bar', 'Cocteles', 'Música'], city: 'Cali', likes: '0',
  tags: ['bar de escucha', 'cocteles', 'música', 'Miraflores'], moods: ['tomar algo', 'plan nocturno'],
  is_active: false, is_featured: false, created_at: now, updated_at: now,
  catalog_status: 'reviewed_with_pending',
  ...(existingSpot ? { cover_image_url: existingSpot.cover_image_url, logo_url: existingSpot.logo_url, gallery_urls: existingSpot.gallery_urls, created_at: existingSpot.created_at } : {})
};
const branch = {
  id: branchId, spot_id: id, slug: 'bengala-bandolero-miraflores', neighborhood: 'Miraflores', mall: '',
  address: google.address, hours: 'Lun-Mar cerrado · Mié-Sáb 18:00-01:00 · Dom cerrado',
  holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null,
  holiday_split_open_time: null, holiday_split_close_time: null, menu_items: [],
  budget_scenarios: [], budget_basis: 'Presupuesto por confirmar', min_budget: 0, max_budget: 0,
  typical_budget: 0, max_people: null, min_people: null, menu_url: '',
  whatsapp: '', phone: google.internationalPhone, instagram: 'https://www.instagram.com/bengala.bandolero/',
  latitude: google.latitude, longitude: google.longitude, google_maps_url: google.googleMapsUrl,
  google_place_id: google.placeId, website_url: 'https://www.instagram.com/bengala.bandolero/',
  business_status: 'temporarily_closed', is_active: false, sort_order: 999,
  created_at: existingBranch?.created_at ?? now, updated_at: now, catalog_status: 'reviewed_with_pending',
  missing_fields: ['menu_items', 'budget', 'holiday_hours', 'cover_image_url', 'gallery_urls', 'highlights']
};
if (existingSpot) Object.assign(existingSpot, spot); else catalog.spots.push(spot);
if (existingBranch) Object.assign(existingBranch, branch); else catalog.branches.push(branch);
catalog.branchHours = catalog.branchHours.filter(row => row.branch_id !== branchId);
catalog.hours = catalog.hours.filter(row => row.branch_id !== branchId);
let hourId = Math.max(0, ...catalog.branchHours.map(h => Number(h.id) || 0), ...catalog.hours.map(h => Number(h.id) || 0));
const weekly = [
  [0, true, null, null], [1, true, null, null], [2, false, '18:00:00', '01:00:00'],
  [3, false, '18:00:00', '01:00:00'], [4, false, '18:00:00', '01:00:00'],
  [5, false, '18:00:00', '01:00:00'], [6, true, null, null]
].map(([day, closed, open, close], index) => ({ id: ++hourId, branch_id: branchId, day_of_week: day, is_closed: closed, open_time: open, close_time: close, split_open_time: null, split_close_time: null, sort_order: index * 10 }));
catalog.branchHours.push(...weekly); catalog.hours.push(...weekly.map(row => ({ ...row, id: ++hourId })));
catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(`${root}/integration.json`, JSON.stringify({ createdAt: now, status: existingSpot ? 'updated_inactive_temporarily_closed' : 'created_inactive_temporarily_closed', spotId: id, branchId, sources: ['Instagram profile', 'Google Places'], highlights: 'blocked_devtools_profile_lock', menu: 'no_bio_links_or_public_menu', logo: 'pending_finish', pending: branch.missing_fields }, null, 2) + '\n');
console.log(JSON.stringify({ status: existingSpot ? 'updated_inactive_temporarily_closed' : 'created_inactive_temporarily_closed', spotId: id, branchId, address: branch.address, pending: branch.missing_fields }, null, 2));

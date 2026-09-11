import fs from 'node:fs';

const file = 'apps/mobile/public/spots-catalog.json';
const report = JSON.parse(fs.readFileSync('docs/catalog-review/benchmarks/cerro-de-las-tres-cruces/google-places.json', 'utf8'));
const google = report.selected;
if (!google) throw new Error('Google Places no devolvio un lugar seleccionado');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
const spot = catalog.spots.find((row) => row.slug === 'cerro-de-las-tres-cruces');
const branch = catalog.branches.find((row) => row.slug === 'cerro-de-las-tres-cruces-oeste');
if (!spot || !branch) throw new Error('Cerro de las Tres Cruces no existe en el catalogo');

Object.assign(spot, {
  name: google.name,
  short_description: 'Subí a uno de los miradores naturales más clásicos de Cali y regalate una pausa con vista panorámica de la ciudad. Es un plan de senderismo exigente: caé temprano, andá acompañado y confirmá el acceso antes de arrancar.',
  category: 'Naturaleza y aire libre',
  subcategories: ['Senderismo', 'Miradores', 'Al aire libre'],
  tags: ['senderismo', 'mirador', 'cerro', 'naturaleza', 'aire libre', 'caminar', 'vista panorámica'],
  moods: ['activo', 'plan de día', 'naturaleza', 'caminar'],
  is_active: true,
  business_status: 'unknown',
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['opening_hours', 'access_conditions'],
  updated_at: now,
});

Object.assign(branch, {
  neighborhood: 'Santa Monica Residential',
  mall: '',
  address: google.address,
  hours: 'Horario por confirmar',
  holiday_mode: 'inherit',
  min_budget: 0,
  max_budget: 0,
  typical_budget: 0,
  budget_scenarios: [],
  budget_basis: 'Gratis: no requiere consumo ni entrada reportada por Google Places.',
  menu_calculation_note: 'No aplica calculadora de presupuesto para este plan al aire libre.',
  menu_url: '',
  menu_items: [],
  google_maps_url: google.googleMapsUrl,
  google_place_id: google.placeId,
  latitude: google.latitude,
  longitude: google.longitude,
  instagram: '',
  whatsapp: '',
  phone: '',
  website_url: '',
  business_status: 'unknown',
  is_active: true,
  catalog_status: 'reviewed_with_pending',
  missing_fields: ['opening_hours', 'access_conditions'],
  updated_at: now,
});

catalog.generatedAt = now;
fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('docs/catalog-review/benchmarks/cerro-de-las-tres-cruces/consolidated.json', JSON.stringify({ status: 'integrated_with_pending', updatedAt: now, source: 'Google Places', placeId: google.placeId, pending: ['opening_hours', 'access_conditions'], budget: 'free_no_calculator' }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'updated', spot: spot.slug, branch: branch.slug, pending: ['opening_hours', 'access_conditions'] }, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = path.join(root, 'apps/mobile/public/spots-catalog.json');
const reviewPath = path.join(root, 'docs/catalog-review/lago-verde-additions-2026-09-05.json');
const sourcePath = path.join(root, 'apps/mobile/public/coordinate-sources.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const before = structuredClone(data);
const now = new Date().toISOString();
const sourceSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/catalog-review/lago-verde-addition-sources-2026-09-05.json'), 'utf8'));
const directory = sourceSnapshot.directory;
const mall = 'Parque Comercial Lago Verde';
const address = 'Calle 16A #122-70, Parque Comercial Lago Verde, Pance, Cali';
const specs = [
  { slug: 'pork-house', name: 'Pork House', category: 'Comida', subcategories: ['Parrilla'], description: 'Cerdo, costillas y chicharrones para compartir; su propuesta en Lago Verde se presenta como The Pork House & Co.', instagram: 'https://www.instagram.com/theporkhouseandco/' },
  { slug: 'delio', name: 'Delio', category: 'Comida', subcategories: [], description: 'Una opción gastronómica del directorio de Lago Verde; consulta su propuesta y disponibilidad antes de la visita.', instagram: '' },
  { slug: 'alma-romero', name: 'Alma Romero', category: 'Comida', subcategories: ['Cocina de autor', 'Sushi'], description: 'Cocina de autor con sabores de inspiración asiática para compartir un almuerzo o una cena en Cali.', instagram: 'https://www.instagram.com/almaromerocali/' },
  { slug: 'bocks-best-of-chicken', name: "Bock's - Best of Chicken", category: 'Comida', subcategories: ['Pollo', 'Comida rápida'], description: 'Tenders de pollo, hamburguesas y papas para resolver el antojo de algo crocante.', instagram: 'https://www.instagram.com/bocks.col/' },
  { slug: 'colore-me', name: 'Color Me', category: 'Arte y cultura', subcategories: ['Cerámica'], description: 'Un espacio de cerámica en Lago Verde, registrado como Colore Me en el directorio del parque comercial.', instagram: 'https://www.instagram.com/colorme.cali/' },
  { slug: 'playground', name: 'Gagalto Playground', category: 'Familiar', subcategories: ['Juegos infantiles'], description: 'Un playground con comida rápida para compartir un plan familiar en Lago Verde.', instagram: 'https://www.instagram.com/gagaltoo/' },
  { slug: 'next-reality', name: 'Next Reality', category: 'Familiar', subcategories: ['Realidad virtual'], description: 'Juegos de realidad virtual sin cables, misiones cooperativas y una zona de consolas para compartir con amigos o familia.', instagram: '' },
];

if (fs.existsSync(reviewPath)) {
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  assert(review.addedSpots.every(s => data.spots.some(x => x.id === s.id && x.slug === s.slug)));
  assert(review.addedBranches.every(b => data.branches.some(x => x.id === b.id && x.slug === b.slug)));
  console.log('Already applied; preserving current catalog without rewriting it.');
  process.exit(0);
}
assert(specs.every(s => !data.spots.some(x => x.slug === s.slug)), 'Existing requested brand requires manual reconciliation');
assert(!data.spots.some(x => x.slug === 'if-bakery'), 'IF Bakery must not duplicate Cofi Bakery');
const cofi = data.spots.find(s => s.slug === 'cofi-bakery');
const cofiLago = data.branches.find(b => b.spot_id === cofi?.id && /lago\s*verde/i.test(b.mall));
assert(cofi && cofiLago, 'Expected existing Cofi Bakery record');
let nextSpot = Math.max(...data.spots.map(s => s.id)) + 1;
let nextBranch = Math.max(...data.branches.map(b => b.id)) + 1;
let nextHour = Math.max(0, ...data.branchHours.map(h => h.id), ...data.hours.map(h => h.id)) + 1;
const addedSpots = [];
const addedBranches = [];
const evidence = [];
const coordinateRecords = [];

function ownerPoint(branch, sourceKey, locationId, url) {
  const locations = sourceSnapshot[sourceKey].documents;
  const location = locations.find(l => l.name.endsWith('/' + locationId));
  assert.equal(location.fields.visibility.stringValue, 'public');
  const point = location.fields.location.geoPointValue;
  assert(point.latitude > 3 && point.latitude < 4 && point.longitude < -76 && point.longitude > -77);
  Object.assign(branch, point);
  coordinateRecords.push({ slug: branch.slug, ...point, source: url, precision: 'owner_published_poi', reason: 'Public diner-menu branch name and address match this branch; not a surveyed entrance.', reviewedAt: now, sourceType: 'owner_menu', sourceLocationId: locationId });
}

function branch(spot, suffix, extra = {}) {
  const slug = `${spot.slug}-${suffix}`;
  assert(!data.branches.some(b => b.slug === slug));
  const row = { id: nextBranch++, spot_id: spot.id, slug, neighborhood: 'Pance', mall, address, latitude: null, longitude: null, is_active: true, created_at: now, updated_at: now, hours: '', holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null, holiday_split_open_time: null, holiday_split_close_time: null, min_budget: 0, max_budget: 0, max_people: 0, menu_url: '', whatsapp: '', phone: '', instagram: '', sort_order: 10, ...extra };
  data.branches.push(row);
  addedBranches.push(row);
  return row;
}

for (const spec of specs) {
  const entry = directory.find(p => p.slug === spec.slug);
  assert(entry?.status === 'publish', `Missing official directory entry: ${spec.slug}`);
  const logo = entry.yoast_head_json.og_image[0].url;
  const mediaDir = path.join(root, 'apps/mobile/public/place-media', spec.slug);
  fs.mkdirSync(mediaDir, { recursive: true });
  const file = path.join(mediaDir, 'logo-directory.jpg');
  execFileSync('curl', ['-fLsS', '--max-time', '25', logo, '-o', file]);
  const bytes = fs.readFileSync(file);
  assert(bytes[0] === 0xff && bytes[1] === 0xd8, `Invalid JPEG: ${logo}`);
  const logoPath = `/place-media/${spec.slug}/logo-directory.jpg`;
  const spot = { id: nextSpot++, type: 'place', slug: spec.slug, name: spec.name, short_description: spec.description, cover_image_url: '', logo_url: logoPath, gallery_urls: [], category: spec.category, subcategories: spec.subcategories, city: 'Cali', likes: '0', tags: [spec.name, ...(spec.slug === 'playground' ? ['Playground', 'Gagalto'] : [])], moods: [], is_active: true, is_featured: false, created_at: now, updated_at: now };
  data.spots.push(spot);
  addedSpots.push(spot);
  const lago = branch(spot, 'lago-verde', { instagram: spec.instagram });
  evidence.push({ slug: spec.slug, directory: entry.link, logoSource: logo, imageStatus: 'Logo stored only in logo_url; cover left empty until real venue photography is visually verified.', additionalSources: spec.instagram ? [spec.instagram] : [], pending: ['Unverified fields remain empty; zero budgets/capacity mean unspecified, not free admission or measured capacity.'] });
  const sources = evidence.at(-1).additionalSources;
  if (spec.slug === 'pork-house') {
    const menu = 'https://ugc.production.linktr.ee/ae55875b-e9b5-4c13-8c73-65ece2b7b92a_TPKH-05-26.pdf';
    branch(spot, 'limonar', { neighborhood: 'El Limonar', mall: '', address: 'Calle 9 #63B-04, El Limonar, Cali', phone: '3214783909', whatsapp: '3214783909', instagram: 'https://www.instagram.com/theporkhouse.co/', menu_url: menu, sort_order: 20 });
    branch(spot, 'plaza-del-sol-jamundi', { neighborhood: 'Jamundí', city: 'Jamundí', mall: 'Centro Comercial Plaza del Sol', address: 'Centro Comercial Plaza del Sol, local 5, Jamundí, Valle del Cauca', phone: '3203249570', whatsapp: '3203249570', instagram: 'https://www.instagram.com/theporkhouse.co/', menu_url: menu, sort_order: 30 });
    sources.push('https://www.theporkhouse.co/', 'https://linktr.ee/theporkhouse.co', 'https://www.instagram.com/theporkhouse.co/');
    evidence.at(-1).pending.push('Do not assume the Limonar/Jamundi menu or contacts also apply to the & Co concept in Lago Verde.');
  }
  if (spec.slug === 'alma-romero') {
    const leyenda = branch(spot, 'leyenda-mall', { neighborhood: 'Ciudad Jardín', mall: 'La Leyenda Mall', address: 'Calle 13A #103-335, La Leyenda Mall, Ciudad Jardín, Cali', phone: '3182142596', instagram: spec.instagram, menu_url: 'https://menupp.co/almaromero/venue/c4wyrzzqhjq5m0w4z8j2/menu/qqscd7w97bzdnttxj6jp', sort_order: 20 });
    ownerPoint(leyenda, 'almaLocations', 'C4WyrZZqHJQ5M0w4z8j2', leyenda.menu_url);
    sources.push(leyenda.menu_url, 'https://restaurantguru.com/Alma-Romero-Gastro-Bar-Cali');
    evidence.at(-1).pending.push('Older website lists San Antonio; not added because the current public owner menu identifies Leyenda Mall instead. Conflicting Sunday hours are not imported.');
  }
  if (spec.slug === 'bocks-best-of-chicken') {
    branch(spot, 'el-penon', { neighborhood: 'El Peñón', mall: '', address: 'Calle 2 Oeste #2-15, El Peñón, Cali', instagram: spec.instagram, sort_order: 20 });
    sources.push('https://www.instagram.com/reel/DaB-Z3EgWaC/', 'https://www.instagram.com/reel/DZtI64LABMd/', 'https://web.didiglobal.com/co/food/cali/bocks-lago-verde/5764614806074819914/');
    evidence.at(-1).pending.push('Lago Verde local number conflicts: official directory image says Burbuja 17, delivery listing Isla 6. Keep mall address without an unverified local number. Temporary World Cup Fan Fest point not created as a permanent branch. El Penon address corroborated by Google business listing; coordinates not copied.');
  }
  if (spec.slug === 'colore-me') {
    Object.assign(lago, { address: 'Calle 16A #122-70, burbuja 8, Parque Comercial Lago Verde, Pance, Cali', phone: '3155903478' });
    evidence.at(-1).pending.push('Name, burbuja and telephone corroborated by Google business listing. Instagram requires login; workshop pricing/hours remain unverified.');
  }
  if (spec.slug === 'playground') {
    evidence.at(-1).identity = 'Official directory Playground logo exactly matches @gagaltoo; profile states Playground, Premium Fastfood, Parque Comercial Lago Verde. Do not confuse with the mall free Nave Espacial playground.';
  }
  if (spec.slug === 'next-reality') {
    Object.assign(lago, { phone: '3152699985', whatsapp: '3152699985', hours: 'Lun-Jue 14:00-21:00 · Vie 14:00-23:00 · Sáb-Dom y festivos 12:00-22:00', holiday_mode: 'custom', holiday_open_time: '12:00:00', holiday_close_time: '22:00:00' });
    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      const weekend = day === 6 || day === 0;
      const row = { id: nextHour++, branch_id: lago.id, day_of_week: day, is_closed: false, open_time: weekend ? '12:00:00' : '14:00:00', close_time: weekend ? '22:00:00' : day === 5 ? '23:00:00' : '21:00:00', split_open_time: null, split_close_time: null, sort_order: (day || 7) * 10 };
      data.branchHours.push(row);
      data.hours.push({ ...row, id: nextHour++ });
    }
    sources.push('https://nextreality.com.co/');
    evidence.at(-1).pending.push('Owner site uses both 2-8 and 2-10 players, so no single maximum capacity asserted. No precise venue pin found.');
  }
}

// User explicitly chose to keep only Cofi Bakery, preserving its ID and saved-place links.
Object.assign(cofi, { short_description: 'Café, brunch y galletas rellenas de IF Bakery para una pausa dulce en Lago Verde o Granada.', tags: [...new Set([...cofi.tags, 'IF Bakery', 'Cofi by IF Bakery', 'galletas'])], updated_at: now });
Object.assign(cofiLago, { address, mall, instagram: 'https://www.instagram.com/if.bakery1/', menu_url: 'https://menupp.co/cofibyifbakery', updated_at: now });
ownerPoint(cofiLago, 'cofiLocations', 'N5w4sPGp67DELR8XMu2N', 'https://menupp.co/cofibyifbakery');
const granada = branch(cofi, 'granada', { neighborhood: 'Granada', mall: '', address: 'Calle 14 Norte #9N-18, Granada, Cali', instagram: 'https://www.instagram.com/if.bakery1/', menu_url: 'https://menupp.co/cofibyifbakery', sort_order: 20 });
ownerPoint(granada, 'cofiLocations', 'f4f31b98-8240-4010-9a35-26e2b98107f9', 'https://menupp.co/cofibyifbakery');
evidence.push({ slug: cofi.slug, decision: 'User requested only Cofi Bakery; reuse existing Lago Verde branch and add Granada, no IF Bakery duplicate.', sources: ['https://www.instagram.com/if.bakery1/', 'https://menupp.co/cofibyifbakery'], pending: ['Legacy Marbella/Chipichape references not added: current Instagram and public owner menu list only Lago Verde and Granada.', 'Menu ordering availability is not a permanent closure status.', 'Hours, budget and dedicated Cofi photography remain pending.'] });

for (const key of ['spots', 'branches', 'branchHours', 'hours']) {
  const existingIds = new Set(before[key].map(x => x.id));
  const inserted = data[key].slice(before[key].length);
  assert(inserted.every(x => !existingIds.has(x.id)), `New ID collides with existing ${key}`);
  assert.equal(new Set(inserted.map(x => x.id)).size, inserted.length, `Duplicate new IDs in ${key}`);
}
assert.equal(new Set(data.spots.map(s => s.slug)).size, data.spots.length);
assert.equal(new Set(data.branches.map(b => b.slug)).size, data.branches.length);
assert.equal(addedSpots.length, 7);
assert.equal(addedBranches.length, 12);
assert(addedBranches.every(b => data.spots.some(s => s.id === b.spot_id)));
assert(data.spots.some(s => s.id === cofi.id && s.name === 'Cofi Bakery'));
const provenance = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const touchedPoints = new Set(coordinateRecords.map(r => r.slug));
provenance.records = provenance.records.filter(r => !touchedPoints.has(r.slug)).concat(coordinateRecords);
const review = { reviewedAt: now, status: 'applied_locally_with_documented_pending_fields', addedSpots: addedSpots.map(({ id, slug, name }) => ({ id, slug, name })), addedBranches: addedBranches.map(({ id, slug, spot_id, address, latitude, longitude }) => ({ id, slug, spot_id, address, latitude, longitude })), updatedExisting: { spotBefore: before.spots.find(s => s.id === cofi.id), branchBefore: before.branches.find(b => b.id === cofiLago.id) }, evidence, coordinateRecords, pendingCoordinates: addedBranches.filter(b => b.latitude === null).map(b => b.slug), deployment: 'Not exported or uploaded to Hostinger.' };
data.generatedAt = now;
fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(sourcePath, JSON.stringify(provenance, null, 2) + '\n');
fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({ newPlaces: addedSpots.length, newBranches: addedBranches.length, updatedCofi: true, sourcedCoordinates: coordinateRecords.length, pendingCoordinates: review.pendingCoordinates.length, catalogPlaces: data.spots.length, catalogBranches: data.branches.length }, null, 2));

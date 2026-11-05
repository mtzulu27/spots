import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = 'docs/catalog-review/benchmarks';
const folder = `${root}/chilitaco-reviewed`;
const file = 'apps/mobile/public/spots-catalog.json';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const original = fs.readFileSync(file, 'utf8');
const catalog = JSON.parse(original);
const next = structuredClone(catalog);
const now = new Date().toISOString();
const menuReport = read(`${root}/chilitaco-menupp-links-2026-09-07T04-51-52-362Z.json`);
const menu = menuReport.menus[0];
assert.equal(menu.locationId, 'IrJwdqxLUBTlNQoaSdmO');
const menuUrl = new URL(menu.source, menuReport.source).href;
const manifest = read(`${root}/chilitaco-highlights/manifest.json`);
const transcripts = read(`${root}/chilitaco-highlights/transcriptions.json`);
const description = 'Armá tu antojo con burritos, bowls, nachos, quesadillas o tacos, escogiendo proteína, toppings y salsas. También hay opciones vegetarianas, combos para compartir y menú infantil: un parche casual para comer mexicano a tu manera.';
const place = next.spots.find(s => s.id === 35);
assert.equal(place.slug, 'chilitaco');
Object.assign(place, { name: 'Chilitaco', short_description: description, category: 'Comida', subcategories: ['Tacos', 'Mexicana', 'Vegetariana', 'Almuerzo', 'Cena'], tags: ['Tacos', 'Burritos', 'Comida mexicana', 'Opciones vegetarianas'], moods: ['Casual', 'Comer rico', 'Compartir'], is_active: true, catalog_status: 'reviewed', business_status: 'operational', updated_at: now });

const categories = new Map(menu.categories.map(c => [c.id, c]));
const inventory = menu.products.map(p => ({
  id: p.id, name: p.product_name?.trim() || p.name?.trim(),
  description: (p.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  section: categories.get(p.product_category)?.name.trim() ?? null,
  parentId: p.hierarchy && p.hierarchy !== 'root' ? p.hierarchy : null,
  available: !p.disabled && !categories.get(p.product_category)?.disabled,
  prices: (p.price || []).map(v => ({ value: Number(v.price) > 0 ? Number(v.price) : null, label: v.label || null, available: !v.disable && !v.noStock, currency: 'COP' })),
  optionIds: p.options || [], source: menuUrl,
}));
const menuItems = inventory.filter(p => !p.parentId && p.available).flatMap(p => p.prices.filter(v => v.available && v.value > 0).map(v => ({
  name: p.name, price: v.value, category: p.section === 'Bebidas' ? 'drinks' : p.section === 'Postres' ? 'desserts' : p.section === 'Acompañamientos' ? 'extras' : 'mains',
  menuSection: p.section, sourceUrl: menuUrl, verifiedAt: now, unit: v.label || (/compartir|para [46] personas/.test(p.name) ? 'para compartir' : /Combo/.test(p.name) ? 'combo' : 'unidad'),
  calculationIncluded: false, exclusionReason: 'Inventario del enlace oficial; Menupp marca esta carta inactive. Vigencia de precios pendiente, no usar para calcular un presupuesto confirmado.',
})));

// Hours are explicitly transcribed from each branch's official highlight, not inferred from ordering availability.
const mallWeek = ['11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-22:00','11:30-22:00','11:30-21:00'];
const specs = [
  { key:'perro', id:42, slug:'chilitaco-parque-del-perro', area:'San Fernando', mall:'Parque del Perro', address:'Calle 4 #34-10, Parque del Perro, Cali', phone:'3243956630', image:1, week:['11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:30','11:00-22:30','11:00-22:00'] },
  { key:'pance', id:66, slug:'chilitaco-pance', area:'Pance', mall:'Lago Verde', address:'Calle 16A #122-70, Lago Verde, locales A02 y A03, Cali', phone:'3005470245', image:6, week:['11:00-21:30','11:00-21:30','11:00-21:30','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00'] },
  { key:'granada', area:'Granada', mall:'', address:'Calle 9 Norte #9N-10, Granada, Cali', phone:'3245051277', image:0, week:['11:00-21:00','11:00-21:00','11:00-21:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-21:00'] },
  { key:'ciudad-jardin', area:'Ciudad Jardín', mall:'Giardino Mall', address:'Carrera 106 #15B-105, Giardino Mall, Ciudad Jardín, Cali', phone:'3042976769', image:7, week:['11:00-21:00','11:00-21:00','11:00-21:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00'] },
  { key:'jardin-plaza', area:'Ciudad Jardín', mall:'Jardín Plaza', address:'Carrera 98 #16-200, Jardín Plaza, piso 2, local R44, Cali', phone:'3009838406', image:2, week:mallWeek },
  { key:'unicentro', area:'Ciudad Jardín', mall:'Unicentro', address:'Carrera 100 #5-169, Unicentro, local 382, Cali', phone:'3012919602', image:3, week:mallWeek },
  { key:'mallplaza', area:'Mallplaza', mall:'Mallplaza', address:'Calle 5 #52-210, Mallplaza, piso 3, local R3012, Cali', phone:'3042030381', image:4, week:mallWeek },
  { key:'llanogrande', area:'Palmira', mall:'Llanogrande', city:'Palmira', address:'Calle 31 #44-239, Llanogrande, Plaza Deleite, piso 2, local 814, Palmira', phone:'3009766209', image:5, week:mallWeek },
];
let nextBranchId = Math.max(...next.branches.map(b => b.id)) + 1;
let nextHourId = Math.max(0, ...next.branchHours.map(h => h.id), ...(next.hours || []).map(h => h.id)) + 1;
const consolidatedBranches = [];
const rows = [];
const days = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
for (const [index, spec] of specs.entries()) {
  const googleReport = read(`${root}/chilitaco-google-${spec.key}.json`);
  const google = googleReport.selected;
  assert.match(google.name.toLowerCase(), /chilitaco/);
  assert.ok(Number.isFinite(google.latitude) && Number.isFinite(google.longitude));
  const source = manifest.items[spec.image];
  assert.ok(transcripts.entries.some(t => t.id === source.id && t.status === 'transcribed'));
  const slug = spec.slug || `chilitaco-${spec.key}`;
  const existing = next.branches.find(b => b.slug === slug);
  if (existing) assert.equal(existing.spot_id,35);
  const id = existing?.id ?? spec.id ?? nextBranchId++;
  const businessStatus = google.businessStatus === 'CLOSED_TEMPORARILY' ? 'temporarily_closed' : google.businessStatus === 'CLOSED_PERMANENTLY' ? 'permanently_closed' : google.businessStatus === 'OPERATIONAL' ? 'operational' : 'unknown';
  const [holidayOpen,holidayClose] = spec.week[6].split('-');
  const branch = {
    id, spot_id:35, slug, neighborhood:spec.area, mall:spec.mall, city:spec.city || 'Cali', address:spec.address,
    hours: spec.week.map((hours,i) => `${days[i]} ${hours}`).join(' · '),
    holiday_mode:'custom', holiday_open_time:holidayOpen, holiday_close_time:holidayClose, holiday_split_open_time:null, holiday_split_close_time:null,
    min_budget:0, max_budget:0, typical_budget:null, budget_basis:null,
    min_people:1, max_people:4,
    menu_url:spec.key === 'granada' ? menuUrl : menuReport.source,
    menu_items:spec.key === 'granada' ? menuItems : [],
    menu_calculation_note:spec.key === 'granada' ? 'Precios de la carta enlazada oficialmente, con vigencia por confirmar porque Menupp la marca inactiva. No se calculó presupuesto nuevo.' : 'La carta extraída corresponde al enlace de Granada; no se trasladan sus precios a esta sede sin confirmación.',
    whatsapp:`https://wa.me/57${spec.phone}`, phone:spec.phone, instagram:'https://www.instagram.com/chilitaco/', website_url:'https://chilitaco.co/',
    latitude:google.latitude, longitude:google.longitude, google_maps_url:google.googleMapsUrl.split('&g_mp=')[0], google_place_id:google.placeId,
    business_status:businessStatus, is_active:businessStatus !== 'permanently_closed', sort_order:(index+1)*10,
    created_at:existing?.created_at || now, updated_at:now,
  };
  if (existing) next.branches[next.branches.indexOf(existing)] = branch;
  else next.branches.push(branch);
  for (const [i,range] of spec.week.entries()) {
    const [open,close] = range.split('-');
    rows.push({id:nextHourId++,branch_id:id,day_of_week:(i+1)%7,is_closed:false,open_time:`${open}:00`,close_time:`${close}:00`,split_open_time:null,split_close_time:null,sort_order:(i+1)*10});
  }
  consolidatedBranches.push({ data:branch, fieldDecisions:[
    {fields:['hours','holiday_mode','holiday_open_time','holiday_close_time'], status:spec.key === 'granada' ? 'preferred' : 'confirmed', sources:[source.source,'https://chilitaco.co/ubicaciones'], publishedAt:source.publishedAt, checkedAt:now, reason:'Horario de la destacada oficial de esta sede, coincidente con website; ante discrepancia con Google prevalece Instagram. Festivos explícitos.'},
    {fields:['address','phone','whatsapp'],status:'confirmed',sources:[source.source,'https://chilitaco.co/ubicaciones',branch.google_maps_url],checkedAt:now,reason:'Identidad, sede y contacto contrastados con fuentes oficiales y ficha Google correspondiente.'},
    {fields:['latitude','longitude','google_maps_url'],status:'confirmed',sources:[branch.google_maps_url],checkedAt:googleReport.checkedAt,reason:'Place ID corresponde a la sede y dirección oficial; no se usa el centro del centro comercial.'},
    {fields:['business_status'],status:'preferred',sources:[branch.google_maps_url],checkedAt:googleReport.checkedAt,reason:businessStatus === 'temporarily_closed' ? 'Google reporta cierre temporal; la destacada antigua contiene horarios regulares pero no un anuncio de reapertura. No se extrapola a las otras sedes.' : 'Estado comercial reportado por Google sin anuncio oficial contrario encontrado.'},
    {fields:['min_people','max_people'],status:'preferred',sources:['https://www.instagram.com/chilitaco/',menuUrl],checkedAt:now,reason:'Sugerencia editorial de parche casual de 1 a 4; no aforo confirmado.'},
  ], pending:[{field:'budget',reason:'No se calculan presupuestos nuevos en este flujo; la vigencia del menú extraído está pendiente.'},...(spec.key === 'granada' ? [] : [{field:'menu_items',reason:'Sin carta de precios confirmada para esta sede; se conserva enlace oficial de la marca.'}])], coverage:{weeklyDays:7,holidays:'explicit',instagramStoryId:source.id,googlePlaceId:google.placeId} });
}
const ids = new Set(consolidatedBranches.map(b => b.data.id));
next.branchHours = next.branchHours.filter(h => !ids.has(h.branch_id)).concat(rows);
if (next.hours) next.hours = next.hours.filter(h => !ids.has(h.branch_id)).concat(rows);
next.generatedAt = now;
const cleanInventory = {source:menuUrl,scope:'Granada',status:'validity_pending_source_menu_inactive',items:inventory,modifiers:menu.modifiers,variants:menu.variants};
const consolidated = {generatedAt:now,data:place,fieldDecisions:[{fields:['name','description','category','subcategories'],status:'preferred',sources:['https://www.instagram.com/chilitaco/',menuUrl],checkedAt:now,reason:'Nombre y concepto contrastados; descripción y categorías son síntesis editorial.'}],branches:consolidatedBranches,menu:cleanInventory,pending:[{field:'menu',reason:'El enlace oficial entrega inventario, pero metadata.active=false; no se confirma vigencia ni se calculan promedios.'}],coverage:{branches:8,weeklyHours:56,holidaySchedules:8,storiesRead:manifest.items.length,photos:'Existing user photos preserved; no downloads',menuRawRecords:inventory.length,menuAppPriceRows:menuItems.length}};

assert.equal(next.branches.filter(b => b.spot_id === 35).length,8);
assert.equal(new Set(next.branches.map(b=>b.id)).size,next.branches.length);
assert.equal(new Set(next.branches.map(b=>b.slug)).size,next.branches.length);
assert.deepEqual(next.spots.filter(s=>s.id!==35),catalog.spots.filter(s=>s.id!==35));
assert.deepEqual(next.branches.filter(b=>b.spot_id!==35),catalog.branches.filter(b=>b.spot_id!==35));
assert.deepEqual(next.branchHours.filter(h=>!ids.has(h.branch_id)),catalog.branchHours.filter(h=>!ids.has(h.branch_id)));
assert.equal(place.cover_image_url,catalog.spots.find(s=>s.id===35).cover_image_url);
assert.deepEqual(place.gallery_urls,catalog.spots.find(s=>s.id===35).gallery_urls);
assert.equal(fs.readFileSync(file,'utf8'),original,'Catalog changed during preparation; rerun against latest data');
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(`${folder}/consolidated.json`,JSON.stringify(consolidated,null,2)+'\n');
fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({branches:consolidatedBranches.map(b=>({slug:b.data.slug,id:b.data.id,status:b.data.business_status})),menuAppPriceRows:menuItems.length,consolidated:`${folder}/consolidated.json`,catalog:file},null,2));

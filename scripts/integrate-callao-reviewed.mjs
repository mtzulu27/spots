import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateReview } from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-review.mjs';

const folder = 'docs/catalog-review/callao-2026-09-06';
assert.ok(!fs.existsSync(`${folder}/hours-correction.json`), 'Historical importer superseded by user-approved hours correction; do not overwrite it.');
const file = 'apps/mobile/public/spots-catalog.json';
const raw = fs.readFileSync(file, 'utf8');
const base = JSON.parse(raw), next = structuredClone(base);
const source = JSON.parse(fs.readFileSync(`${folder}/menu-extraction.json`, 'utf8'));
const now = new Date().toISOString();
const spot = next.spots.find(s => s.id === 24);
const branch = next.branches.find(b => b.id === 30);
assert.equal(spot.slug, 'callao');
assert.equal(branch.spot_id, 24);
assert.equal(next.branches.filter(b => b.spot_id === 24).length, 1);
assert.equal(source.items.length, 139);
const menu = source.items.map(({sourceText, ...item}) => item);
const stats = category => {
  const v = menu.filter(i => i.category === category && i.calculationIncluded).map(i => i.price);
  assert.ok(v.length && v.every(p => p > 0));
  return { minimum: Math.min(...v), maximum: Math.max(...v), average:v.reduce((a,b)=>a+b,0)/v.length, count:v.length };
};
const mains = stats('mains'), drinks = stats('drinks');
const maps = 'https://www.google.com/maps/place/Callao/@3.4477847,-76.5326702,17z/data=!3m1!4b1!4m6!3m5!1s0x8e30a700069c6103:0xe95b9d1af7317e9d!8m2!3d3.4477847!4d-76.5326702!16s%2Fg%2F11wpljmhqz';
Object.assign(branch, {
  address:'Cra. 9 #10-04, Cali, Valle del Cauca, Colombia', neighborhood:'Centro', mall:'Hotel Aristi',
  latitude:3.4477847, longitude:-76.5326702, google_maps_url:maps,
  website_url:'https://menupp.co/callao', menu_url:'https://menupp.co/callao',
  instagram:'https://www.instagram.com/callao______/', phone:'+573043935016', whatsapp:'https://wa.me/573043935016',
  menu_items:menu, min_budget:mains.minimum+drinks.minimum, max_budget:mains.maximum+drinks.maximum,
  typical_budget:mains.average+drinks.average,
  budget_basis:'Referencia por persona: un plato fuerte promedio + una bebida individual promedio de la carta oficial. No incluye cover de eventos, propina ni botellas para compartir.',
  menu_calculation_note:'Bebidas incluye cocteles, cerveza, bebidas sin licor y licores expresamente vendidos por trago o copa. Botellas, medias y presentaciones no especificadas se conservan en la carta pero no entran al promedio individual. Ceviches y tiraditos no publica productos. Cover de eventos por confirmar.',
  min_people:2, max_people:8,
  hours:'Lun-Mié 17:00-23:00 · Jue 17:00-01:00 · Vie-Sáb 17:00-03:00 · Dom cerrado · Festivos por confirmar',
  holiday_mode:'inherit', holiday_open_time:null, holiday_close_time:null, holiday_split_open_time:null, holiday_split_close_time:null,
  is_active:true, updated_at:now,
});
Object.assign(spot, {is_active:true, catalog_status:'needs_info', updated_at:now,
  short_description:'Caé a Callao por un cóctel de autor o armá la comida con empanadas de jaiba, cerdo tonkatsu, costillas o salmón. En el centro de Cali, es un parche para empezar con algo de comer y seguir con los tragos; viernes y sábado el horario va hasta la madrugada.',
  tags:[...new Set([...spot.tags, 'comida', 'restaurante', 'tomar algo', 'cocteles'])],
});
let hid = Math.max(...next.branchHours.map(h=>Number(h.id)||0),...next.hours.map(h=>Number(h.id)||0));
for (const key of ['branchHours','hours']) {
  next[key] = next[key].filter(h=>h.branch_id!==30);
  for (let day=0;day<7;day++) next[key].push({id:++hid, branch_id:30, day_of_week:day, is_closed:day===0,
    open_time:day===0?null:'17:00:00',close_time:day===0?null:day<4?'23:00:00':day===4?'01:00:00':'03:00:00',
    split_open_time:null,split_close_time:null,sort_order:(day||7)*10});
}
const outside = d => ({...d,spots:d.spots.filter(s=>s.id!==24),branches:d.branches.filter(b=>b.id!==30),branchHours:d.branchHours.filter(h=>h.branch_id!==30),hours:d.hours.filter(h=>h.branch_id!==30)});
assert.deepEqual(outside(base),outside(next));
for(const key of ['cover_image_url','gallery_urls','logo_url','created_at']) assert.deepEqual(spot[key],base.spots.find(s=>s.id===24)[key]);
assert.equal(branch.created_at,base.branches.find(b=>b.id===30).created_at);
const review = {version:1,slug:'callao',reviewedAt:now,status:'candidate',identity:{status:'verified',city:'Cali',officialName:'Callao',spotId:24},
  sources:[{kind:'instagram',url:branch.instagram,status:'partial'},{kind:'maps',url:maps,status:'complete'},{kind:'menu',url:branch.menu_url,status:'complete'},{kind:'hours',url:'https://menupp.co/callao/locations',status:'complete'},{kind:'events',url:'https://web.fourvenues.com/es/callao1',status:'blocked'}].map(s=>({...s,checkedAt:source.extractedAt})),
  branches:[{slug:branch.slug,identityStatus:'verified',addressStatus:'verified',coordinatesStatus:'verified',hoursStatus:'verified',holidayStatus:'unknown'}],
  menu:{url:branch.menu_url,status:'complete',pagesTotal:2,pagesReviewed:2,productsExtracted:100,pricedPresentations:139,emptySections:source.sectionsEmpty},
  media:{decision:'untouched_out_of_scope_user_provides_images',logoStatus:'unknown'},
  comparison:[{field:'branch.30',action:'replace',confidence:'high',evidence:['Instagram official bio links to Menupp, WhatsApp and events. Menupp one Cali venue matches Maps address and exact pin. Menupp explicit weekly schedule; Instagram Monday to Saturday agrees.'],before:base.branches.find(b=>b.id===30),proposed:branch}],
  criticalMissing:[],nonCriticalMissing:['Festivos no publicados.','Cover de fechas especiales: sitio Fourvenues no accesible; no se asume gratis.','Imagenes y logo fuera de alcance; usuario los proporciona.'],conflicts:[],
  highlights:{method:'instagram-profile-highlights.js',selected:[],status:'no_matching_dom_links',inventory:['Faces','Check in','Coma Callao'],note:'Solo inventario DOM. Check in es ambiguo; no se abre. No se descargaron historias ni analizaron videos.'},
  verdict:{hours:'Horario completo publicado en ubicaciones de Menupp oficial; Maps no publica horas. Bio confirma lunes a sabado.',coordinates:'Pin de ficha Maps y mapa oficial coinciden: 3.4477847,-76.5326702.',contacts:'wa.link/gbym4s resuelve al mismo telefono de Menupp: +573043935016.',branches:'Una sede Cali publicada en localizador oficial; no se crean sedes por inferencia.',groupSize:'Sugerencia editorial 2-8 para comer y tomar en grupo; no aforo.',communityPrice:'Maps indica mas de 200000 COP/persona. Es referencia comunitaria de consumo, no sustituye la cesta explicita de un plato y una bebida.'},
  statistics:{mains,drinks,starters:stats('starters'),desserts:stats('desserts')},
  before:{spot:base.spots.find(s=>s.id===24),branchHours:base.branchHours.filter(h=>h.branch_id===30),hours:base.hours.filter(h=>h.branch_id===30)},catalogWritten:false};
const report=validateReview(review);
assert.equal(report.errors.length,0,JSON.stringify(report));
review.validation=report;
fs.writeFileSync(`${folder}/candidate.json`,JSON.stringify(next,null,2)+'\n');
if(process.argv.includes('--apply')) {
  assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent catalog change');
  fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
  review.catalogWritten=true;review.status='integrated_with_documented_unknowns';
}
fs.writeFileSync(`${folder}/review.json`,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({applied:review.catalogWritten,budget:branch.typical_budget,prices:menu.length,validation:report},null,2));

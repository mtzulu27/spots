import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateReview } from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-review.mjs';

const dir = 'docs/catalog-review/cafe-pintado-2026-09-05';
const file = 'apps/mobile/public/spots-catalog.json';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const baseText = fs.readFileSync(file, 'utf8');
const before = JSON.parse(baseText), candidate = structuredClone(before);
const at = new Date().toISOString();
const instagram = 'https://www.instagram.com/cafepintado/';
const menuUrl = 'https://heyzine.com/flip-book/391a0570bc.html';
const items = [];
function add(name, price, page, category = 'drinks', variant = '') {
  items.push({ name: variant ? `${name} (${variant})` : name, originalName: name, variant,
    price, rawPrice: '$' + price.toLocaleString('es-CO'), category, menuSection: page === 1 ? 'Menu / Bebidas sin cafe' : category === 'drinks' ? 'Bebidas sin cafe' : 'Acompanamientos',
    sourceUrl: menuUrl, sourcePage: page, verifiedAt: at, unit: name.includes('x6') ? 'porcion de 6 unidades' : 'unidad',
    calculationIncluded: true, priceStatus: 'fixed', sourceScope: 'Carta de marca enlazada en bio; aplicacion por sede pendiente de confirmacion' });
}
// Associations checked visually on both rendered pages and against menu.txt.
for (const [name, price] of [['Aromática',5900],['Americano',7900],['Capuccino',12500],['Latte',11000],['Granizado de Arequipe',17200],['Granizado de Moca',17500],['Granizado de Café',16500],['Granizado de Oreo',17900],['Granizado de Milo',17200],['Milo frío',14600],['Smoothie de frutos rojos',17000],['Limonada de Coco',14900],['Limonada natural',12000]]) add(name,price,1);
add('Espresso',6000,1,'drinks','sencillo'); add('Espresso',7500,1,'drinks','doble');
for (const variant of ['Moca','Caramelo','Amaretto']) add('Capuccino con',12900,1,'drinks',variant);
for (const variant of ['frutos rojos','frutos amarillos']) add('Soda Italiana',16000,1,'drinks',variant);
for (const fruit of ['maracuyá','lulo','mora','mango','fresa']) {
  add(`Jugo de ${fruit}`,11000,2,'drinks','agua'); add(`Jugo de ${fruit}`,12000,2,'drinks','leche');
}
for (const [name,price] of [['Té Chai frío',12500],['Té Chai caliente',12900],['Chocolate con masmelos',11200],['Milo caliente',12900],['Agua',6000],['Agua con gas',6000],['Coca Cola',6000],['Coca Cola Zero',6000],['Pony',6000],['Premio',6000],['Soda',6000],['Sprite',6000],['Quatro',6000],['Cerveza',8000]]) add(name,price,2);
for (const variant of ['limón','durazno']) add('Fuze tea',6000,2,'drinks',variant);
add('Mini waffles de pandebono x6',13000,2,'starters');
for (const variant of ['pollo','carne']) add('Empanada',7000,2,'starters',variant);
for (const flavor of ['Banano','Zanahoria','Chocolate']) add(`Torta de ${flavor}`,9900,2,'desserts');
assert.equal(new Set(items.map(x=>x.name)).size,items.length);
assert(items.every(x=>Number.isFinite(x.price) && x.price>0));
const summary = Object.fromEntries(['drinks','starters','desserts'].map(category=>{
  const prices=items.filter(x=>x.category===category).map(x=>x.price);
  return [category,{count:prices.length,min:Math.min(...prices),max:Math.max(...prices),average:prices.reduce((a,b)=>a+b,0)/prices.length}];
}));
const google = new Map([
  [124,read(`${dir}/google-ChIJ0UMz-JahMI4R_VZDSxPibIY.json`)],
  [975,read(`${dir}/google-ChIJ1dv7rmqnMI4RKGKsA5c68mo.json`)],
  [976,read(`${dir}/google-ChIJ0RC1MPWhMI4RBiGDCf-nWGo.json`)],
  [977,read(`${dir}/google-mallplaza.json`).selected],
]);
const palmira = read(`${dir}/google-palmira.json`).selected;
const spot = candidate.spots.find(s=>s.id===113 && s.slug==='cafe-pintado'); assert(spot);
const branches = candidate.branches.filter(b=>b.spot_id===113);
assert.deepEqual(branches.map(b=>b.id).sort((a,b)=>a-b),[124,975,976,977]);
const comparison=[];
function change(row,field,value,evidence=['instagram','google']) {
  if(JSON.stringify(row[field])===JSON.stringify(value))return;
  comparison.push({scope:row.slug,field,before:row[field]??null,after:value,action:row[field]===undefined?'add':'replace',confidence:'high',evidence});
  row[field]=value;
}
change(spot,'name','Café Pintado');
change(spot,'short_description','Escogé una pieza de cerámica y dale color mientras compartís un café, un granizado o algo de la carta. Un plan para pintar y conversar, con tortas, empanadas y mini waffles de pandebono. El costo de la cerámica se confirma aparte.',['instagram','menu']);
change(spot,'catalog_status','blocked',['review']);
change(spot,'missing_fields',['weekly_hours_conflict','branch_menu_scope','ceramics_prices','cover','gallery','logo','palmira_city_integration','mallplaza_closure_type'],['review']);
spot.updated_at=at; spot.is_active=false;
for(const branch of branches) {
  const g=google.get(branch.id);
  change(branch,'latitude',g.latitude);change(branch,'longitude',g.longitude);
  change(branch,'google_maps_url',g.googleMapsUrl);
  if(branch.id!==977) change(branch,'address',`${g.address}${branch.id===124?' · C.C. Puerto 125':branch.id===975?' · C.C. Pacific Center':' · C.C. Unicentro'}`);
  if(g.phone)change(branch,'phone',g.phone.replace(/\D/g,''));
  change(branch,'menu_url',menuUrl,['instagram','menu']);
  change(branch,'instagram',instagram,['instagram']);
  // Preserve unresolved hours/budget rather than choosing a source arbitrarily.
  change(branch,'menu_items',items,['menu']);
  change(branch,'menu_calculation_note','Carta de marca: bebidas y acompañamientos; confirmar disponibilidad y precios de esta sede. No incluye cerámica. Presupuesto de la experiencia por confirmar.',['menu','review']);
  change(branch,'budget_basis','Pendiente: falta tarifa de cerámica y confirmar alcance por sede. El valor anterior no está validado.',['review']);
  branch.is_active=false;branch.updated_at=at;branch.catalog_status='blocked';
  comparison.push({scope:branch.slug,field:'hours',before:branch.hours,after:null,action:'pending',confidence:'low',evidence:['instagram-hours','google'],instagram:'Lun-Vie 13:30-21:00; Sab-Dom-Fest 11:00-22:00 (86 semanas)',google:g.regularHours,verdict:'No resuelto; conservar dato anterior oculto, no certificar vigencia.'});
}
const newId=Math.max(...candidate.branches.map(b=>b.id))+1;
const newBranch={id:newId,spot_id:113,slug:'cafe-pintado-llanogrande',neighborhood:'Palmira',mall:'Llanogrande',city:'Palmira',address:`${palmira.address} · C.C. Llanogrande, local 813 (destacada histórica)`,latitude:palmira.latitude,longitude:palmira.longitude,google_maps_url:palmira.googleMapsUrl,instagram,menu_url:menuUrl,menu_items:items,phone:'',whatsapp:'',hours:'Por confirmar',holiday_mode:'inherit',holiday_open_time:null,holiday_close_time:null,holiday_split_open_time:null,holiday_split_close_time:null,is_active:false,catalog_status:'blocked',sort_order:50,created_at:at,updated_at:at};
candidate.branches.push(newBranch);
comparison.push({scope:newBranch.slug,field:'branch',before:null,after:newBranch,action:'add',confidence:'high',evidence:['instagram','instagram-sedes','google-palmira']});
const allBranches=[...branches,newBranch];
const review={version:1,slug:spot.slug,reviewedAt:at,identity:{status:'verified',city:'Cali; Palmira',officialName:spot.name},
  sources:[{id:'instagram',kind:'instagram',url:instagram,checkedAt:at,status:'complete'},
    {id:'instagram-hours',kind:'instagram',url:'https://www.instagram.com/stories/highlights/18015180709811096/',checkedAt:at,status:'complete',storiesTotal:2,storiesReviewed:2,text:'Portada 147 semanas; horario general 86 semanas: Lun-Vie 13:30-21:00; Sab-Dom-Fest 11:00-22:00'},
    {id:'instagram-sedes',kind:'instagram',url:'https://www.instagram.com/stories/highlights/17934510743702852/',checkedAt:at,status:'partial',storiesTotal:11,storiesOpened:11,note:'Leidas imagenes y textos visibles de las 11 historias; videos pausados, sin revision audiovisual integral. Llanogrande local 813 visible; Unicentro, Mallplaza y Pacific identificados.'},
    {id:'instagram-mallplaza',kind:'instagram',url:'https://www.instagram.com/stories/highlights/17874875139523221/',checkedAt:at,status:'complete',storiesReviewed:1,storiesTotal:1,text:'8 semanas: sede en remodelacion; invita a Pacific Center y Unicentro.'},
    {id:'instagram-menu',kind:'instagram',url:'https://www.instagram.com/stories/highlights/18100308337362022/',checkedAt:at,status:'complete',storiesReviewed:1,storiesTotal:1,text:'Solo portada ilustrada, sin precios ni links por sede.'},
    {id:'instagram-ceramics',kind:'instagram',url:'https://www.instagram.com/stories/highlights/18010004690066648/',checkedAt:at,status:'partial',storiesReviewed:1,note:'Solo portada revisada; resto de destacada pendiente, no afirmar ausencia de tarifas en toda la destacada.'},
    {id:'menu',kind:'menu',url:menuUrl,checkedAt:at,status:'complete',method:'Ambas paginas renderizadas + PDF completo con pdftotext; 2 paginas.'},
    ...[...google.values(),palmira].map(g=>({id:g===palmira?'google-palmira':'google',kind:'google_places',url:g.googleMapsUrl,checkedAt:at,status:'complete',placeId:g.placeId}))],
  branches:allBranches.map(b=>({slug:b.slug,identityStatus:'verified',addressStatus:'verified',coordinatesStatus:'verified',hoursStatus:'unknown',holidayStatus:'unknown'})),
  menu:{status:'complete',url:menuUrl,pagesReviewed:2,pagesTotal:2,productsExtracted:items.length,scope:'Extraccion completa de esta carta, no de tarifas de ceramica ni confirmacion por sede'},
  media:{decision:'user_provides',logoStatus:'unknown',coverStatus:'unknown',galleryStatus:'unknown',note:'Unsplash previo no acredita foto real; no descargado logo ni fotos.'},comparison,
  criticalMissing:['weekly_hours','ceramics_prices','branch_menu_scope','real_media','palmira_city_integration'],nonCriticalMissing:['holiday_hours_current','whatsapp'],
  conflicts:[...branches.filter(b=>b.id!==977).map(b=>({scope:b.slug,field:'hours',instagram:'Horario general 86 semanas',google:google.get(b.id).regularHours,verdict:'pending'})),{scope:'cafe-pintado-mallplaza',field:'closure_type',instagram:'Remodelacion (8 semanas y bio actual)',google:'CLOSED_PERMANENTLY',verdict:'No operativa: mantener oculta. Temporal/definitivo pendiente.'}],
  proposals:{categories:['Arte y cultura','Comida'],note:'App solo soporta una categoria; conservar Comida, no fingir filtrado multicategoria.',groupSize:{min:2,max:4,status:'editorial',reason:'Actividad de pintar y conversar, no capacidad fisica.'}},
  integration:{status:'partial_hidden',palmira:'Adaptador toma ciudad de la marca (Cali), no de la sede: nueva sede queda oculta hasta soporte o decision de alcance.',budget:'No sustituir presupuesto total por promedio de cafeteria; 10000 previo sigue sin validar y oculto.'}};
const allowed=new Set(allBranches.map(b=>b.id));
assert.deepEqual(candidate.spots.filter(s=>s.id!==113),before.spots.filter(s=>s.id!==113));
assert.deepEqual(candidate.branches.filter(b=>!allowed.has(b.id)),before.branches.filter(b=>!allowed.has(b.id)));
for(const key of Object.keys(before).filter(k=>!['spots','branches','generatedAt'].includes(k)))assert.deepEqual(candidate[key],before[key]);
assert(candidate.spots.find(s=>s.id===3679)?.is_active===before.spots.find(s=>s.id===3679)?.is_active);
assert(allBranches.every(b=>b.is_active===false));
candidate.generatedAt=at;
write(`${dir}/menu-extraction.json`,{checkedAt:at,sourceUrl:menuUrl,pagesReviewed:2,pagesTotal:2,items,summary,ceramicsPrice:null,branchScope:'pending',coffeeOnlyBasket:summary.drinks.average+summary.desserts.average});
write(`${dir}/review.json`,review);
write(`${dir}/candidate.json`,candidate);
const gate=validateReview(review);write(`${dir}/validation-review.json`,gate);
assert.equal(gate.publishable,false);
if(process.argv.includes('--apply')) {
  assert.equal(fs.readFileSync(file,'utf8'),baseText,'Concurrent catalog edit; abort');
  assert(!fs.existsSync(`${dir}/before.json`),'Before snapshot already exists; inspect before reapplying');
  write(`${dir}/before.json`,{spot:before.spots.find(s=>s.id===113),branches:before.branches.filter(b=>b.spot_id===113),addedBranchId:newId});
  fs.writeFileSync(`${file}.pintado.tmp`,JSON.stringify(candidate,null,2)+'\n');fs.renameSync(`${file}.pintado.tmp`,file);
  assert.deepEqual(read(file),candidate);
}
console.log(JSON.stringify({applied:process.argv.includes('--apply'),items:items.length,summary,newBranchId:newId,publishable:gate.publishable,unrelatedRecordsUnchanged:true},null,2));

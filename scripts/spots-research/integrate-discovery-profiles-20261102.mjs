import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {integrateCatalog} from './integrate-catalog.mjs';

const root = 'docs/catalog-review/discovery/profiles-20261102';
const catalog = 'apps/mobile/public/spots-catalog.json';
const helper = '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/profile-logo.mjs';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const save = (p, x) => fs.writeFile(p, JSON.stringify(x, null, 2) + '\n');
const progress = await read(`${root}/progress.json`);
const stamp = new Date().toISOString();
const hours = (days, open_time, close_time) => days.map(day_of_week => ({day_of_week, is_closed: false, open_time, close_time}));
const branch = (slug, neighborhood, address, extra = {}, weeklyHours) => ({slug, neighborhood, address, extra, weeklyHours});

// These are field-level editorial decisions from the saved official sources, not inferred geocoding.
const newPlaces = [
  ['cinemaprimitivo', 'cinema-primitivo', 'Cinema Primitivo', 'Arte y cultura',
    'Viví una película con un recorrido gastronómico y sensorial. El parche es bajo reserva previa.',
    [branch('cinema-primitivo-plaza-del-lili', 'Valle del Lili', 'Calle 48 #86-133, terraza del Hotel Plaza del Lili, Cali', {phone: '+573147338401', website_url: 'https://primitivosensorial.com/sistema-de-reservas', min_people: 2})]],
  ['floresylechugasbar', 'flores-y-lechugas', 'Flores y Lechugas', 'Tomar algo',
    'Caé por coctelería, vinos, cocina de autor y música en el bar de La Comitiva.',
    [branch('flores-y-lechugas-cali', '', '', {phone: '+573165255002', whatsapp: 'https://wa.me/573165255002', website_url: 'https://floresylechugas.com/', menu_url: 'https://idmenu.club/floresylechugas', hours: 'Jue 18:00-01:00 · Vie-Sáb 18:00-02:00'}, [...hours([4], '18:00', '01:00'), ...hours([5, 6], '18:00', '02:00')])]],
  ['bigbilly.co', 'big-billy', 'Big Billy', 'Comida',
    'Armá el parche con smash burgers, costillas BBQ y malteadas; también hay desayunos para caer más temprano.',
    [branch('big-billy-calle-44-norte', '', 'Calle 44 Norte #3E-158, Cali', {menu_url: 'https://menupp.co/bigbilly', business_status: 'operational'})]],
  ['anandatallerdulce', 'ananda-taller-dulce', 'Ananda Taller Dulce', 'Comida',
    'Hacé una pausa dulce con pastelería y panadería artesanal; también tienen opciones sin azúcar añadida.',
    [
      branch('ananda-unicentro', 'Ciudad Jardín', 'Carrera 100 #5-169, Éxito Wow Unicentro, Cali', {mall: 'Unicentro'}, [...hours([1,2],'11:30','19:30'),...hours([3,4,5],'11:00','19:30'),...hours([6],'10:00','19:30'),...hours([0],'11:00','19:00')]),
      branch('ananda-valle-del-lili', 'Valle del Lili', 'Carrera 98B #25-130, Éxito Wow Valle del Lili, Cali', {}, [...hours([1,2],'11:30','19:00'),...hours([3,4,5,0],'11:00','19:00'),...hours([6],'10:00','19:00')]),
      branch('ananda-quintas-de-don-simon', 'Quintas de Don Simón', 'Calle 14 #76-86, Plazoleta QDS, local 3, Cali', {}, [...hours([1,0],'11:00','19:00'),...hours([2,3,4,5],'10:30','19:00'),...hours([6],'10:00','19:00')]),
      branch('ananda-cosmocentro', '', 'Calle 5 #50-103, La Montaña Cosmocentro, Cali', {mall:'Cosmocentro'}, [...hours([1,2],'11:30','19:00'),...hours([3,4,5,0],'11:00','19:00'),...hours([6],'10:00','19:00')]),
      branch('ananda-ingenio', 'El Ingenio', 'Carrera 80 #13C-21, local 18, Plazoleta QDS, Cali', {}, hours([0,1,2,3,4,5,6],'11:00','20:00')),
      branch('ananda-avenida-sexta', '', 'Avenida 6 #30N-47, La Montaña, Cali', {}, [...hours([1],'11:00','19:00'),...hours([2,3,4,5],'10:30','19:00'),...hours([6],'10:00','19:00'),...hours([0],'10:00','18:00')]),
      branch('ananda-la-flora', 'La Flora', 'Avenida 3N #52N-46, Éxito Wow La Flora, Cali', {}, [...hours([1,2],'11:30','19:30'),...hours([3,4,5],'11:00','19:30'),...hours([6],'10:00','19:30'),...hours([0],'11:00','19:00')]),
      branch('ananda-cristales', 'Cristales', 'Calle 11, Avenida Circunvalar #36D-86, La Montaña Cristales, Cali', {}, [...hours([1,2],'11:30','19:00'),...hours([3,4,5,0],'11:00','19:00'),...hours([6],'10:00','19:00')]),
      branch('ananda-alfaguara', 'Alfaguara', 'Calle 2 #22-175, Éxito Wow Alfaguara, Jamundí', {city:'Jamundí'}, [...hours([1,2],'11:30','19:00'),...hours([3,4,5,0],'11:00','19:00'),...hours([6],'10:00','19:00')])]],
  ['heladosyulika', 'yulika-frozen-yogurt', 'Yülika Frozen Yogurt', 'Comida',
    'Un parche dulce para refrescarte con frozen yogurt.',
    [branch('yulika-pance','Pance',''),branch('yulika-granada','Granada',''),branch('yulika-unicentro','Ciudad Jardín','',{mall:'Unicentro'})]],
  ['thepublegend', 'the-pub-legend', 'The Pub Legend', 'Tomar algo',
    'Armá la noche con comida de pub, música y shows en vivo en Granada.',
    [branch('the-pub-legend-granada','Granada','Avenida 9N #16-33, Granada, Cali',{menu_url:'http://app.menupp.co/menu/legend',whatsapp:'https://wa.me/message/PVZZOZ2LLP7OK1'})]],
  ['criollan_lovers', 'criollan-lovers', 'Criollan Lovers', 'Comida',
    'Caé por cocina criolla con sabores de Perú y el Pacífico, acompañada de coctelería del Pacífico colombiano.',
    [branch('criollan-lovers-san-antonio','San Antonio','Calle 4 #5-02, San Antonio, Cali',{menu_url:'https://menupp.co/criollanlovers',website_url:'https://criollanlovers.co/',whatsapp:'https://wa.me/573219299005',business_status:'operational'})]],
  ['cielitolindo_co', 'cielito-lindo', 'Cielito Lindo', 'Comida',
    'Un lugar para hacer una pausa en la vía antigua Cali–Yumbo.',
    [branch('cielito-lindo-via-cali-yumbo','','Calle 10 #23-240, vía antigua Cali-Yumbo',{menu_url:'https://app.menupp.co/restaurant/cielitolindo',hours:'Lun-Mar 09:30-16:30 · Mié-Dom y festivos 09:30-22:30',holiday_mode:'custom',holiday_open_time:'09:30',holiday_close_time:'22:30'},[...hours([1,2],'09:30','16:30'),...hours([0,3,4,5,6],'09:30','22:30')])]],
  ['guruclubroom', 'guru-clubroom', 'Gurú Clubroom', 'Tomar algo',
    'Coctelería de autor y cocina mediterránea para parchar en un salón de Granada.',
    [branch('guru-clubroom-granada','Granada','Avenida 9A Norte #10N-22, Granada, Cali',{menu_url:'https://guruclubroom.com/menu',website_url:'https://guruclubroom.com/',whatsapp:'https://wa.me/573171383701',hours:'Mar-Dom desde las 18:00; cierre por confirmar'})]],
  ['casacuchuflettos', 'casa-cuchuflettos', 'Casa Cuchuflettos', 'Familiar',
    'Desconectate un rato y armá el parche alrededor de juegos de mesa y algo rico para comer.',
    [branch('casa-cuchuflettos-san-antonio','San Antonio','Carrera 10 #4-33, Cali',{whatsapp:'https://wa.me/573162127029',menu_url:'https://cuchuflettos.com/menu/',website_url:'https://cuchuflettos.com/',hours:'Mar-Dom 16:00-22:00',supplemental_info:{consumptionPolicy:'El sitio solicita consumo de $10.000 por persona por cada hora de permanencia. No equivale al presupuesto de una comida.'}},hours([0,2,3,4,5,6],'16:00','22:00')),
      branch('casa-cuchuflettos-limonar','Limonar','Calle 13 #65A-20, Cali',{whatsapp:'https://wa.me/573153742901',menu_url:'https://cuchuflettos.com/menu/',website_url:'https://cuchuflettos.com/',hours:'Lun no festivo 10:00-21:30 · Mar-Dom 08:00-22:00 · Lun festivo 08:00-22:00',holiday_mode:'custom',holiday_open_time:'08:00',holiday_close_time:'22:00'},[...hours([1],'10:00','21:30'),...hours([0,2,3,4,5,6],'08:00','22:00')])]],
  ['piropo.rest', 'piropo', 'Piropo', 'Comida',
    'Caé por cocina caleña en pleno Bulevar del Río.',
    [branch('piropo-bulevar-del-rio','Centro','Calle 7 #1-10, Cali',{menu_url:'https://menupp.co/piropo',phone:'+573108464822'})]],
  ['caffedamoreco', 'caffe-damore', 'Caffè D’Amore', 'Comida',
    'Un parche inspirado en la costa Amalfitana para hacer una pausa en Granada.',
    [branch('caffe-damore-granada','Granada','Avenida 9N #14N-57, Granada, Cali',{menu_url:'https://menupp.co/casadamore',hours:'Lun-Jue 12:00-21:00 · Vie 12:00-22:00 · Sáb-Dom 09:00-21:00'},[...hours([1,2,3,4],'12:00','21:00'),...hours([5],'12:00','22:00'),...hours([0,6],'09:00','21:00')])]],
];

const result = {startedAt:stamp, created:[], updated:[], pending:[], status:'partial_integration'};
const writeContract = (data, mode) => ({data,write:{mode,fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}});
function pendingBudget() {return {menu_items:[],budget_scenarios:[],min_budget:0,typical_budget:0,max_budget:0,budget_basis:'Presupuesto por confirmar'};}
function newBranch(spec, username) {
  const data = {slug:spec.slug,neighborhood:spec.neighborhood,address:spec.address,city:'Cali',mall:'',hours:'Horario por confirmar',instagram:`https://www.instagram.com/${username}/`,is_active:true,business_status:'unknown',latitude:null,longitude:null,min_people:null,max_people:null, ...pendingBudget(), ...spec.extra,catalog_status:'reviewed_with_pending',missing_fields:['google_places','coordinates','menu_review',...(!spec.address?['address']:[]),...(!spec.weeklyHours?['weekly_hours']:[])]};
  const row = writeContract(data,'create');
  if(spec.weeklyHours){row.weeklyHours=spec.weeklyHours;row.write.hours='replace';}
  return row;
}
async function integrate(username, input) {
  const dir=`${root}/${username}`;
  input.schemaVersion=1;
  input.coverage={profile:'reviewed_saved_evidence',bio:'reviewed_field_scope_only; menu review incomplete unless explicitly noted',highlights:'blocked_missing_chrome_devtools',googlePlaces:'blocked_missing_environment_api_key'};
  input.pending=['Google Places y coordenadas sin contrastar: falta GOOGLE_PLACES_API_KEY.','Destacadas sin revisar: Chrome DevTools no disponible.','Cover y galería no descargados por los recolectores de esta skill.',...(input.pending??[])];
  input.fieldDecisions=[{fields:input.write.fields,sources:input.data.source_urls??[input.data.instagram],consultedAt:stamp,status:'preferred',reason:'Datos explícitos del perfil oficial o web propia, sin confirmación independiente de Places; campos fuera del alcance conservados.'}];
  await save(`${dir}/consolidated.json`,input);
  const report=await integrateCatalog(`${dir}/consolidated.json`,catalog,{});
  await save(`${dir}/integration.json`,report);
  let c=await read(catalog),spot=c.spots.find(s=>s.slug===input.data.slug);
  const manifest=await read(`${dir}/logo.json`).catch(()=>null);
  if(manifest?.status==='needs_visual_review') {
    const verdict=['bbccerveceria','floresylechugasbar','lanapacali'].includes(username)?'not_logo':'logo';
    const args=[helper,'finish',`${dir}/logo.json`,verdict];
    if(verdict==='logo')args.push(catalog,String(spot.id),manifest.sha256);
    execFileSync('node',args,{stdio:'pipe'});
    c=await read(catalog);spot=c.spots.find(s=>s.id===spot.id);
    if(verdict==='logo'){input.data.logo_url=spot.logo_url;input.write.fields.push('logo_url');await save(`${dir}/consolidated.json`,input);}
  }
  const record={username,id:spot.id,slug:spot.slug,branches:report.changes.filter(x=>x.entity==='branch').map(x=>x.id)};
  result[input.write.mode==='create'?'created':'updated'].push(record);
  await save(`${root}/integration-summary.json`,result);
  console.log(JSON.stringify(record));
}

for(const [username,slug,name,category,short_description,specs] of newPlaces) {
  const c=await read(catalog);
  if(c.spots.some(s=>s.slug===slug)){console.log(`Already integrated: ${slug}`);continue;}
  const source_urls=[`https://www.instagram.com/${username}/`,...specs.flatMap(x=>[x.extra.website_url,x.extra.menu_url]).filter(Boolean)];
  const input={...writeContract({slug,name,category,short_description,type:'place',city:'Cali',instagram:source_urls[0],source_urls,is_active:true,is_featured:false,likes:'0',business_status:'unknown',cover_image_url:'',gallery_urls:[],catalog_status:'reviewed_with_pending',missing_fields:['cover_image','gallery','google_places','menu_review'],reviewed_at:stamp},'create'),branches:specs.map(s=>newBranch(s,username))};
  if(username==='anandatallerdulce')input.pending=['Solo puntos públicos de Cali y Jamundí; excluidos fábrica exclusiva delivery, clínicas, aeropuerto y Bogotá. Menú web pendiente de revisión.'];
  if(username==='cinemaprimitivo')input.pending=['Primitivo Sensorial es la sede anfitriona; no se crea otra ficha de primitivorooftop sin identidad/alcance independientes. Precio infantil no usado como presupuesto general.'];
  if(username==='floresylechugasbar')input.pending=['Dirección presente dentro de comentario HTML: no se trata como dirección vigente confirmada. Logo de perfil corresponde a La Comitiva, no asignado.'];
  await integrate(username,input);
}

// Existing identities keep stable IDs, media, unreviewed menus and unmentioned branches.
for(const record of progress.startedScope.filter(r=>r.matches.length)) {
  const c=await read(catalog),old=c.spots.find(s=>s.id===record.matches[0].id);
  const input={...writeContract({id:old.id,slug:old.slug,instagram:record.instagram},'update'),branches:[],pending:['Revisión parcial de identidad/logo y campos explícitos; cartas y restantes sedes aún no revalidadas.']};
  if(record.username==='lafugitiva.co') {
    if(!c.branches.some(b=>b.spot_id===old.id&&/dapa/i.test(b.neighborhood??'')))input.branches.push(newBranch(branch('la-fugitiva-dapa','Dapa','Kilómetro 7, vía principal de Dapa',{city:'Yumbo',hours:'Solo con reserva previa; horario por confirmar'}),record.username));
  }
  if(record.username==='bengala.bandolero') {
    if(!c.branches.some(b=>b.spot_id===old.id&&/banco-popular/.test(b.slug)))input.branches.push(newBranch(branch('bengala-bandolero-banco-popular','Centro','Carrera 4 #9-60, Torre Banco Popular, penthouse, Cali',{hours:'Jue-Sáb 19:00-03:00'},hours([4,5,6],'19:00','03:00')),record.username));
    input.pending.push('Perfil anuncia dirección actual; no reutilizar coordenadas de Miraflores. Cierre temporal de esa sede anterior conservado; apertura de la nueva no confirmada por fecha.');
  }
  if(record.username==='palomulata'&&!c.branches.some(b=>b.spot_id===old.id&&/san-antonio/.test(b.slug)))input.branches.push(newBranch(branch('palo-mulata-san-antonio','San Antonio','Calle 2 #10-69, San Antonio, Cali'),record.username));
  await integrate(record.username,input);
}
for(const username of ['lanapacali','primitivorooftop']) {
  const manifest=await read(`${root}/${username}/logo.json`).catch(()=>null);
  if(manifest?.status==='needs_visual_review')execFileSync('node',[helper,'finish',`${root}/${username}/logo.json`,username==='lanapacali'?'not_logo':'cleanup']);
}
result.pending.push({username:'lanapacali',reason:'Cierre temporal explícito; sede actual indeterminada. No crear dirección inventada ni ficha de visita.'},{username:'primitivorooftop',reason:'Perfil inaccesible tras cuatro intentos; relación con anfitrión de Cinema Primitivo, evitar duplicado.'});
result.finishedAt=new Date().toISOString();
await save(`${root}/integration-summary.json`,result);

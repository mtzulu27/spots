import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102',catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const contract=(data,mode)=>({data,write:{mode,fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}});
const weekly=(days,open_time,close_time)=>days.map(day_of_week=>({day_of_week,is_closed:false,open_time,close_time}));
const pendingBranch={is_active:true,business_status:'unknown',min_budget:0,typical_budget:0,max_budget:0,budget_basis:'Presupuesto por confirmar',budget_scenarios:[],menu_items:[],min_people:null,max_people:null,latitude:null,longitude:null,catalog_status:'reviewed_with_pending',missing_fields:['google_places','coordinates','menu_review']};
async function integrate(username,input,name='identity') {
  input.schemaVersion=1;
  input.coverage={profile:'reviewed_official_profile',bio:'reviewed_official_website',highlights:'blocked_missing_devtools',googlePlaces:'blocked_missing_api_key'};
  await save(`${root}/${username}/${name}-consolidated.json`,input);
  const report=await integrateCatalog(`${root}/${username}/${name}-consolidated.json`,catalog,{});
  await save(`${root}/${username}/${name}-integration.json`,report);
  return report;
}
let c=await read(catalog);
if(!c.spots.some(s=>s.slug==='primitivo-sensorial')) {
  const spot={slug:'primitivo-sensorial',type:'place',name:'Primitivo Sensorial',short_description:'Despertá los sentidos con un brunch en la terraza. La experiencia dura dos horas y media y tiene reserva previa.',category:'Comida',city:'Cali',instagram:'https://www.instagram.com/primitivosensorial/',is_active:true,business_status:'unknown',cover_image_url:'',gallery_urls:[],likes:'0',is_featured:false,catalog_status:'reviewed_with_pending',missing_fields:['cover_image','gallery','google_places','menu_review'],source_urls:['https://www.instagram.com/primitivosensorial/','https://primitivosensorial.com/brunch/','https://primitivosensorial.com/reserva-brunch/','https://primitivosensorial.com/sistema-de-reservas']};
  const data={...pendingBranch,slug:'primitivo-sensorial-plaza-del-lili',city:'Cali',neighborhood:'Valle del Lili',address:'Calle 48 #86-133, terraza del Hotel Plaza del Lili, Cali',hours:'Lun-Dom 07:00-12:00',phone:'+573147338401',instagram:spot.instagram,website_url:'https://primitivosensorial.com/brunch/',supplemental_info:{reservation:'Brunch con reserva. Duración de dos horas y media; grupos de más de 18 personas deben consultar disponibilidad.'}};
  const b=contract(data,'create');b.write.hours='replace';b.weeklyHours=weekly([0,1,2,3,4,5,6],'07:00','12:00');
  const input={...contract(spot,'create'),branches:[b],fieldDecisions:[{fields:['instagram','name','hours','address'],status:'preferred',sources:spot.source_urls,reason:'Cuenta vigente mencionada por Cinema Primitivo y enlazada desde la misma web oficial. Brunch y cine son experiencias distintas en el mismo recinto; la ficha de cine se conserva separada.'}],pending:['La cuenta antigua primitivorooftop no respondió. La relación procede de enlaces oficiales actuales, no de una redirección confirmada.','Carta de brunch aún sin precios utilizables en el HTML extraído.']};
  await integrate('primitivorooftop',input);
  c=await read(catalog);const created=c.spots.find(s=>s.slug===spot.slug);
  const manifest=await read(`${root}/primitivorooftop/current-logo.json`);
  if(manifest.status==='needs_visual_review')execFileSync('node',['/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/profile-logo.mjs','finish',`${root}/primitivorooftop/current-logo.json`,'logo',catalog,String(created.id),manifest.sha256]);
  c=await read(catalog);input.data.logo_url=c.spots.find(s=>s.id===created.id).logo_url;input.write.fields.push('logo_url');
  await save(`${root}/primitivorooftop/identity-consolidated.json`,input);
}
c=await read(catalog);
if(!c.spots.some(s=>s.slug==='la-napa')) {
  const data={slug:'la-napa',type:'place',name:'La Ñapa',short_description:'El lugar informa cierre temporal y por ahora no tiene servicio. La dirección de su sede está por confirmar.',category:'Comida',city:'Cali',instagram:'https://www.instagram.com/lanapacali/',is_active:true,business_status:'temporarily_closed',cover_image_url:'',gallery_urls:[],likes:'0',is_featured:false,catalog_status:'reviewed_with_pending',missing_fields:['branch_address','logo','cover_image','gallery','google_places'],source_urls:['https://www.instagram.com/lanapacali/']};
  await integrate('lanapacali',{...contract(data,'create'),branches:[],fieldDecisions:[{fields:['business_status','is_active'],status:'preferred',source:data.instagram,reason:'Cierre temporal explícito, ficha visible pero sin inventar una sede ni habilitar una visita.'}],pending:['Sede y dirección indeterminadas; no se crea una sucursal ficticia.','Foto de perfil publicitaria rechazada como logo.']});
}
c=await read(catalog);
const ananda=c.spots.find(s=>s.slug==='ananda-taller-dulce');
const additions=[
  ['ananda-cafe-fundacion-valle-del-lili','Valle del Lili','Carrera 98 #18-49, Clínica Fundación Valle del Lili, Cali','+573225321607',[...weekly([1,2,3,4,5],'06:00','19:00'),...weekly([6],'08:00','16:00')]],
  ['ananda-cafe-imbanaco','','Carrera 38 Bis #5B2-04, Centro Médico Imbanaco, Cali','+573183002827',[...weekly([1,2,3,4,5],'06:00','20:00'),...weekly([6],'08:00','16:00')]],
  ['ananda-cafe-clinica-occidente','','Calle 18 Norte #5N-34, Torre B, Clínica de Occidente, Cali','+573026225043',[...weekly([1,2,3,4,5],'06:00','19:00'),...weekly([6],'08:00','16:00'),...weekly([0],'09:00','16:00')]],
];
const branches=[];
for(const [slug,neighborhood,address,phone,weeklyHours]of additions) {
  if(c.branches.some(b=>b.slug===slug))continue;
  const b=contract({...pendingBranch,slug,neighborhood,address,phone,city:'Cali',hours:'Consultar horario semanal publicado',instagram:'https://www.instagram.com/anandatallerdulce/',website_url:'https://anandaweb.com/puntos-de-venta/',supplemental_info:{access:'Café ubicado dentro de una clínica. Consultar las condiciones de acceso; el servicio a habitación tiene cobertura interna.'}},'create');
  b.write.hours='replace';b.weeklyHours=weeklyHours;branches.push(b);
}
if(branches.length)await integrate('anandatallerdulce',{...contract({id:ananda.id,slug:ananda.slug},'update'),branches,fieldDecisions:[{fields:['branches','address','phone','weeklyHours'],status:'preferred',source:'https://anandaweb.com/puntos-de-venta/',reason:'Se incluyen los tres Ananda Café de Cali que publica la web; no se presupone libre acceso ni cierre los domingos omitidos.'}],pending:['Acceso a cafés dentro de clínicas por confirmar.','Se excluyen la fábrica exclusiva para domicilios, las sedes de Bogotá y los muelles aeroportuarios con acceso restringido.']},'cafes');
console.log(JSON.stringify({identities:['primitivo-sensorial','la-napa'],anandaCafeBranchesAdded:branches.length}));

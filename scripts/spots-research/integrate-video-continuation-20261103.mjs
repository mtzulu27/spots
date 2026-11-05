import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {integrateCatalog} from './integrate-catalog.mjs';
const exec = promisify(execFile);
const root='docs/catalog-review/discovery/video-intake-20261103';
const catalogPath='apps/mobile/public/spots-catalog.json';
const skill='/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const stamp=new Date().toISOString();
const entity=data=>({data,write:{mode:'create',fields:Object.keys(data).filter(k=>k!=='slug')}});
const hoursFromGoogle=place=>{
  const periods=place.regularHoursRaw?.periods??[];
  const names=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const clock=p=>`${String(p.hour??0).padStart(2,'0')}:${String(p.minute??0).padStart(2,'0')}`;
  const rows=[];
  for(let d=0;d<7;d++){
    const ps=periods.filter(p=>p.open?.day===d);
    assert.ok(ps.length<=1,'Split hours require explicit review');
    if(ps[0]?.close)rows.push({day_of_week:d,is_closed:false,open_time:clock(ps[0].open),close_time:clock(ps[0].close)});
    else if(place.regularHours?.some(s=>s.toLowerCase().startsWith(`${names[d]}:`)&&/cerrado/i.test(s)))rows.push({day_of_week:d,is_closed:true,open_time:null,close_time:null});
  }return rows;
};
function reviewedBudget(items,scenarios){
  const totals=scenarios.map(s=>s.lines.reduce((sum,line)=>{
    const matches=items.filter(i=>i.name===line.name&&i.category===line.category&&i.presentation===line.presentation);
    assert.equal(matches.length,1,`Missing reviewed product ${line.name}`);
    return sum+matches[0].price*Math.ceil(2/line.groupSize)*line.quantity;
  },0)/2);
  assert.ok(totals[0]<totals[1]&&totals[1]<totals[2]);
  return {menu_items:items,budget_scenarios:scenarios,min_budget:totals[0],typical_budget:totals[0],max_budget:totals[2],budget_basis:scenarios[0].concept,menu_items_verified_at:stamp,menu_calculation_note:'Consumo propuesto para mesa de dos; no promedio. No incluye propina ni cover no confirmado. El restaurante puede actualizar los precios.'};
}
const line=(name,category,presentation='',groupSize=1)=>({name,category,presentation,groupSize,quantity:1});
const scenario=(concept,lines,note='Propuesta por persona con precios normales de la carta oficial; cover no confirmado, no incluido.')=>({concept,lines,note});
async function reviewedMenus(username){
  if(username==='macanudo.hifi'){
    const source='https://macanudohifi.com/menu/';const items=[];
    const add=(category,rows)=>rows.forEach(([name,price,presentation=''])=>items.push({name,price:price*1000,presentation,category,currency:'COP',sourceUrl:source,verifiedAt:stamp,calculationIncluded:true}));
    add('drinks',[
      ['Espresso',8],['Capuchino',8],['Americano',7],['Carajillo',46],['Espresso Martini',45],
      ['Solo de Mango',47],['Viccelo',48],['Viccelo Tonic',42],['Beat de Lulo',42],['Carmesí',46],['Obsidiana',46],['Funky Passion',46],['Radiante',46],['Astillero',46],['Jade',46],['Sol',46],['Red Groove',45],['Macallan Derby',56],['Hifi Coffee',50],
      ['Old Fashioned Monkey Shoulder',43],['Penicillin Monkey Shoulder',45],['Margarita',47],['Gin and tonic',47],['Dry Martini',42],['Moscow Mule',47],['Negroni',47],['Old Fashioned',45],['Whisky Sour',42],['New York Sour',47],['Pisco Sour',42],['Penicillin',47],['Irish Maid',42],['Eva Peron',46],['Mint Julep',42],['Paloma',47],['Aperol Spritz',45],['Clover Club',40],
      ['Duvel',36],['Delirium Tremens',48],['Erdinger Dunkel',36],['Erdinger Pikantus',36],['Paulaner Weissbier',36],['Paulaner Dunkel',36],['Paulaner Sin Alcohol',36],['Stella Artois',20],['Corona',20],['Corona 0 Alcohol',20],['Club Colombia',18],['Club Colombia Trigo',18],['Asahi',20],['Peroni',20],['Delirium Nocturnum',48],['Erdinger Weissbier',34],['Erdinger Sin Alcohol',34],
      ['Soda Frutos del Bosque',23],['Gaseosas',13],['Agua Botella',13],['Ginger',13],['Soda',13],['Tonica',13],['Tonica Fever Tree',23],['Redbull',19],['Agua con gas Botella',13],['Limonada Natural',16],['Agua Mineral San Pellegrino',21],['Agua Mineral Panna',21],['Fake Hibiscus Spritz',26],['Mananciata',26],['Life Kombucha',23],['Redbull Sugar Free',19],['Ginger Beer Fiver Tree',21],
    ]);
    add('starters',[['Picoteo Romano',57],['Picoteo Skyler',35],['Spin Dip',22],['Lafayette Dip',22]]);
    for(const [name,large,personal=26] of [
      ['Bianca carbonara',46],['Pera y nueces',46],['Bosque de hongos con Queso',46],['Peperoni',46],['Burrata & Serrano',49],['Luna Roja',49],['Cuatro Quesos',49],['Quesos y Anchoas',56,28],['Bufala y Ricota',46],['Hawaroni',46],['Pepinillos y Azul',46],['Miguelon',46],['Macadamia y Pistacho (vegana)',41],['Macadamia y Espinaca picante',41],['Margarita (vegana)',41],['Fugazetta',41],['Meat Lovers',62,28],['Bosque de Hongos con Macadamia (vegana)',46],['Margarita con Mozzarella',41],['Hongos sin Queso',41],
    ])add('mains',[[name,large,'Grande'],[name,personal,'Personal']]);
    add('desserts',[['Tiramisú',15]]);
    return {...reviewedBudget(items,[
      scenario('Club Colombia y Spin Dip para compartir',[line('Club Colombia','drinks'),line('Spin Dip','starters','',2)],'Una cerveza por persona y un Spin Dip por cada dos. Propuesta de compartir, no rendimiento certificado.'),
      scenario('Pizza personal y cóctel de mango',[line('Bianca carbonara','mains','Personal'),line('Solo de Mango','drinks')]),
      scenario('Pizza personal, Macallan Derby y tiramisú',[line('Meat Lovers','mains','Personal'),line('Macallan Derby','drinks'),line('Tiramisú','desserts')]),
    ]),menu_url:source};
  }
  if(username==='mundanobaroficial'){
    const evidence=await read('docs/catalog-review/benchmarks/mundano-menupp-links-2026-11-03T14-07-05-842Z.json');
    const m=evidence.menus.find(m=>m.source.includes('/7BykACQlIKZpCpunRwqT/'));
    assert.ok(m?.metadata.active&&!m.metadata.hide);const cats=new Map(m.categories.map(c=>[c.id,c])),items=[];
    for(const p of m.products){
      const c=cats.get(p.product_category);if(!c||p.disabled||/2x1|PROMO/i.test(p.product_name))continue;
      let ancestor=c;const seen=new Set();let disabled=false;
      while(ancestor&&!seen.has(ancestor.id)){seen.add(ancestor.id);disabled ||= !!ancestor.disabled;ancestor=cats.get(ancestor.hierarchy);}
      if(disabled)continue;
      const name=p.product_name.trim();const category=c.name==='Hamburguesas'?'mains':name==='CHURROS CON AREQUIPO'?'desserts':c.name==='Otros Platos'?'starters':'drinks';
      for(const v of p.price??[]){if(v.disable||v.noStock||!(Number(v.price)>0))continue;
        const item={name,category,presentation:[v.label?.trim(),c.name.trim()].filter(Boolean).join(' · '),price:Number(v.price),currency:'COP',sourceUrl:m.source,sourceProductId:p.id,menuSection:c.name.trim(),verifiedAt:stamp,calculationIncluded:true};
        assert.ok(!items.some(i=>i.name===item.name&&i.presentation===item.presentation&&i.category===item.category));items.push(item);
      }
    }
    return {...reviewedBudget(items,[
      scenario('Club Colombia y empanadas para compartir',[line('CLUB COLOMBIA','drinks','Cervezas'),line('EMPANADAS','starters','x4 unidades · Otros Platos',2)],'Una cerveza por persona y cuatro empanadas para dos. Propuesta compartida, no rendimiento confirmado.'),
      scenario('Hamburguesa Mundano y mojito',[line('MUNDANO BURGUER','mains','Hamburguesas'),line('MOJITO','drinks','BACARDI BLANCO · Coctelería Clásica')]),
      scenario('Cajun BBQ para dos, margarita y churros',[line('CAJUN BBQ','starters','Otros Platos',2),line('MARGARITA','drinks','JIMADOR · Coctelería Clásica'),line('CHURROS CON AREQUIPO','desserts','Churros · Otros Platos')],'Cajun BBQ compartido para dos según carta; cóctel y churros por persona. Cover no confirmado, no incluido.'),
    ]),menu_url:m.source};
  }
  return {};
}
const specs=[
  {numbers:[14],username:'ines.cocinayvida',slug:'ines-cocina-y-vida',name:'Inés Cocina y Vida',category:'Comida',copy:'Caé a Santa Mónica por un café y quedate a conocer la tienda o sus talleres. Un parche para comer algo y compartir sin afán.',tags:['cafe','tienda','talleres','Santa Mónica'],address:'Av. 6 Bis Norte #26N-49, Santa Mónica, Cali',neighborhood:'Santa Mónica',phone:'+573188171313',website:'https://linktr.ee/ines.cocinayvida',pending:['current_menu','current_prices','coordinates','instagram_highlights','photos'],logoHash:'2d1bf49cb016666b5a447bfdae0a644ddf2feaa0f8ca188f7a6511124beb1b7f'},
  {numbers:[9],username:'elpatiodelmuseo',slug:'el-patio-del-museo',name:'El Patio del Museo',category:'Comida',copy:'Caé a la terraza del Museo La Tertulia y quedate entre comida, piano y arte. Un parche para encontrarse bajo el árbol del museo.',tags:['terraza','piano bar','arte','Museo La Tertulia'],address:'Av. 1 #5 Oeste, bajo el árbol del Museo La Tertulia, Cali',neighborhood:'El Peñón',phone:'+573169085572',website:'https://elpatiodelmuseo.com/',pending:['current_menu','current_prices','coordinates','instagram_highlights','photos'],logoHash:'3d6620c9edf1a062189ba3c0926f5132a79df9194fdbce98c24c22145fb7e2bd'},
  {numbers:[32],username:'icepubcali',slug:'icepub-cali',name:'IcePub Gastro Bar',category:'Tomar algo',copy:'Armá el parche en Ciudad Jardín y caé a pasar la noche con tus amigos. Solo para mayores de edad; consultá la reserva antes de ir.',tags:['gastrobar','Ciudad Jardín','mayores de edad'],address:'Carrera 105 #14-250, Ciudad Jardín, Cali',neighborhood:'Ciudad Jardín',phone:'+573122416528',pending:['current_menu','current_prices','coordinates','instagram_highlights','photos'],logoHash:'2189368991642ee6eb4ebe95fa659fe6fe93e4fb90c9c94e6023ecf2c5d70dc4'},
  {numbers:[27],username:'blackhausclub',slug:'black-haus-club',name:'Black Haus Club',category:'Vida nocturna',copy:'Armá la noche en Ciudad Jardín y caé con tu parche. Consultá la programación y las condiciones de ingreso antes de ir.',tags:['club','Ciudad Jardín'],address:'Calle 13 #101-45, Ciudad Jardín, Cali',neighborhood:'Ciudad Jardín',phone:'+573225446927',website:'https://menupp.co/blackhaus',pending:['profile_biography','weekly_hours','current_menu','current_prices','coordinates','logo','instagram_highlights','photos']},
  {numbers:[62],username:'arawatacali',slug:'arawata-club-de-escalada',name:'Arawata · Club de Escalada y Montañismo',category:'Deporte y bienestar',copy:'Cambiá de plan y probá la escalada en Cañaverales. Consultá sus actividades de aventura y ecoturismo para armar un parche distinto.',tags:['escalada','montañismo','ecoturismo','Cañaverales'],address:'Carrera 61 #18A-35, Parque Cañaverales, Cali',neighborhood:'Cañaverales',phone:'+573186794927',pending:['current_prices','coordinates','website_unavailable','instagram_highlights','photos'],logoHash:'dcda9b209eed20696877a9f1fdcc46764a079418d609f64c711c1bd394c1411f'},
  {numbers:[44,45],username:'migo.col',slug:'migo-cholados-y-raspados',name:'Migo · Cholados y Raspados',category:'Comida',copy:'Refrescá el parche con un cholado, una lulada o un raspado de frutas. Buscá tu sede y caé por algo bien caleño.',tags:['cholados','raspados','frutas','lulada'],phone:'+573241601124',website:'https://menupp.co/migo',pending:['branch_menu_prices','instagram_highlights','photos'],logoHash:'ecb63abe5580146ba42045157c5b95d0839388a3a1e79688ce7646ac4535241a'},
  {numbers:[29],username:'macanudo.hifi',slug:'macanudo-hifi',name:'Macanudo HiFi',category:'Tomar algo',copy:'Escuchá tus canciones de otra manera entre vinilos, pizza y cocteles de autor. Armá el parche en Granada: acá el sonido es protagonista.',tags:['hifi','vinilos','pizza','cocteles','Granada'],address:'Av. 9 Norte #15AN-27H, Granada, Cali',neighborhood:'Granada',phone:'+573136317047',website:'https://macanudohifi.com/',pending:['liquor_presentations_review','instagram_highlights','photos'],logoHash:'f2138b083746e9de456120bf444e02d2f889853f80ae931ff4bd538f47a0678e'},
  {numbers:[50],username:'mundanobaroficial',slug:'mundano-bar',name:'Mundano Bar',category:'Vida nocturna',copy:'Cantá los clásicos del pop y el rock de los 90 y 2000, pedí algo de comer y quedate por la música en vivo. Armá la noche con tu parche en Granada.',tags:['pop','rock','musica en vivo','hamburguesas','cocteles','Granada'],address:'Calle 15 Norte #15, Granada, Cali',neighborhood:'Granada',phone:'+573180700934',website:'https://menupp.co/mundano',pending:['instagram_highlights','photos'],logoHash:'cfdbd557fee865429a90be63e32adb5780bfc5d870ca69fb86d185711cd04502'},
];
const summary=await read(`${root}/integration-summary.json`);
const currentBefore=await read(catalogPath);
const createdIds=[],createdBranchIds=[];
for(const spec of specs){
  const directory=`${root}/${spec.username}`;
  const catalog=await read(catalogPath);
  const instagram=`https://www.instagram.com/${spec.username}/`;
  const collision=catalog.spots.find(s=>s.slug===spec.slug||s.instagram?.replace(/\/$/,'').toLowerCase()===instagram.replace(/\/$/,'').toLowerCase());
  if(collision){console.log(JSON.stringify({username:spec.username,status:'already_exists_preserved',id:collision.id}));continue;}
  const gp=await read(`${directory}/google-places.json`), place=gp.selected;
  assert.ok(place?.placeId,`Identity review incomplete: ${spec.username}`);
  assert.equal(place.businessStatus,'OPERATIONAL');
  const base={city:'Cali',address:spec.address??'',neighborhood:spec.neighborhood??'',mall:'',phone:spec.phone,whatsapp:spec.phone,instagram,is_active:true,business_status:'operational',catalog_status:'reviewed_with_pending',latitude:null,longitude:null,hours:'Horario por confirmar',min_budget:0,typical_budget:0,max_budget:0,budget_basis:'Presupuesto por confirmar',budget_scenarios:[],menu_items:[],min_people:null,max_people:null,missing_fields:spec.pending};
  const makeBranch=(slug,overrides={},google=place)=>{
    const data={slug,...base,...overrides};
    const b=entity(data);
    if(google){data.google_place_id=google.placeId;data.google_maps_url=google.googleMapsUrl;const h=hoursFromGoogle(google);if(h.length){b.weeklyHours=h;b.write.hours='replace';data.hours=google.regularHours.join('; ');}}
    if(spec.website)data.website_url=spec.website;
    b.write.fields=Object.keys(data).filter(k=>k!=='slug');return b;
  };
  let branches;
  if(spec.username==='migo.col'){
    const menu=await read('docs/catalog-review/benchmarks/migo-menupp-links-2026-11-03T14-00-58-050Z.json');
    branches=menu.locations.map(loc=>{
      const boch=loc.name==='Bochalema';const slug=boch?'bochalema-plaza':loc.name==='Calima'?'calima':'mallplaza';
      return makeBranch(`migo-${slug}`,{address:boch?'Centro Comercial Bochalema Plaza, Calle 25 #109-35, Cali':loc.address,neighborhood:boch?'Bochalema':loc.name==='Calima'?'Calima':'Cuarto de Legua',mall:boch?'Bochalema Plaza':loc.name==='Calima'?'Centro Comercial Calima':'Mallplaza Cali',latitude:loc.location.latitude,longitude:loc.location.longitude,hours:'12:00 p. m. a 8:00 p. m., según el perfil oficial; días por confirmar.',menu_url:'https://menupp.co/migo',missing_fields:[...spec.pending,...(boch?[]:['weekly_hours'])],supplemental_info:'Sede confirmada por Instagram y Menupp. Coordenadas publicadas por la marca: no certifican el punto del local dentro del mall. No se asigna el Place ID del centro comercial al negocio. Horarios de reservas de Menupp inactivos y con otra zona horaria: descartados. Linktree omite Calima y menciona Llano Grande; se prioriza Instagram y Menupp coincidentes, sin inventar cierre o sede Llano Grande. Los precios de la tienda Linktree no se aplican a todas las sedes sin verificar su alcance.'},boch?place:null);
    });
  }else{
    const suffix={ 'ines.cocinayvida':'santa-monica','elpatiodelmuseo':'la-tertulia','icepubcali':'ciudad-jardin','blackhausclub':'ciudad-jardin','arawatacali':'canaverales','macanudo.hifi':'granada','mundanobaroficial':'granada'}[spec.username];
    branches=[makeBranch(`${spec.slug}-${suffix}`,{supplemental_info:spec.username==='icepubcali'?'Ingreso solo para mayores de edad. Límite de reservas a las 6:00 p. m.: no equivale a horario de apertura.':spec.username==='blackhausclub'?'Perfil sin biografía tras cuatro intentos. Marca y usuario vinculados por Menupp; sede contrastada con video y Google. Carta enlazada inactiva: precios pendientes. Imagen de perfil sin logo legible: no asignada.':spec.username==='arawatacali'?'Dirección confirmada por Instagram; horarios de Google porque el perfil no los publica. Website sin DNS tras cuatro intentos.':spec.username==='elpatiodelmuseo'?'La web oficial confirma sede, contacto y horarios. Menú requiere carga dinámica: no se presume leído.':'Horarios de lunes a sábado explícitos en Instagram; domingo cerrado según Google. Carta de WhatsApp no leída: presupuesto pendiente.'})];
  }
  const reviewedMenu=await reviewedMenus(spec.username);
  if(Object.keys(reviewedMenu).length){
    Object.assign(branches[0].data,reviewedMenu);
    const menupp=await read(`docs/catalog-review/benchmarks/${spec.username==='macanudo.hifi'?'macanudo-menupp-links-2026-11-03T14-06-58-887Z':'mundano-menupp-links-2026-11-03T14-07-05-842Z'}.json`);
    const location=menupp.locations.find(l=>l.name===(spec.username==='macanudo.hifi'?'Cali':'Mundano'));
    Object.assign(branches[0].data,{latitude:location.location.latitude,longitude:location.location.longitude,supplemental_info:spec.username==='macanudo.hifi'?'Ingreso 21+. Dirección según Instagram; se prioriza sobre numeración distinta en web/Google. Horarios de web oficial y Google coincidentes. Carta de comida y bebidas revisada completa; presentaciones de licores quedan pendientes y no se usan para presupuesto. Coordenadas publicadas por Menupp oficial.':'Carta solo de la sede Mundano: no se copian cartas de Gintonería ni Lulito del mismo grupo. Horario de Google: la configuración de reservas Menupp está inactiva. Coordenadas del Menupp oficial.'});
    branches[0].write.fields=Object.keys(branches[0].data).filter(k=>k!=='slug');
  }
  const sources=[instagram,...(spec.website?[spec.website]:[]),place.googleMapsUrl];
  const data={slug:spec.slug,name:spec.name,type:'place',category:spec.category,city:'Cali',short_description:spec.copy,instagram,source_urls:sources,is_active:true,is_featured:false,likes:'0',business_status:'operational',catalog_status:'reviewed_with_pending',missing_fields:[...new Set(spec.pending)],tags:spec.tags,subcategories:[],moods:[],cover_image_url:'',gallery_urls:[],reviewed_at:stamp};
  const consolidated={schemaVersion:1,...entity(data),branches,coverage:{profile:spec.username==='blackhausclub'?'partial_exhausted_four_attempts':'identity_reviewed',bio:'reviewed_with_explicit_pending',highlights:'blocked_shared_browser_capability',google:'identity_and_branch_reviewed',media:'Profile logo only; no covers or galleries.'},fieldDecisions:[{field:'identity_and_branch',status:'confirmed',sources,checkedAt:stamp,reason:'Perfil oficial o Menupp con el mismo usuario, más sede del video y contraste con Google. No crear a partir de coincidencia solo de nombre.'},{field:'weeklyHours',status:'preferred',sources,checkedAt:stamp,reason:'Perfil y web oficial cuando dan horario; Google completa días ausentes sin inventar cierre. No se convierten límites de reserva en horario.'},{field:'budget',status:'pending',sources,checkedAt:stamp,reason:'Sin carta vigente utilizable para esta sede. No usar promedios de Google ni delivery como precio de visita.'}],pending:[...new Set(branches.flatMap(b=>b.data.missing_fields))]};
  await save(`${directory}/consolidated.json`,consolidated);
  const result=await integrateCatalog(`${directory}/consolidated.json`,catalogPath,{});await save(`${directory}/integration.json`,result);
  const fresh=await read(catalogPath), spot=fresh.spots.find(s=>s.slug===spec.slug),bs=fresh.branches.filter(b=>b.spot_id===spot.id);
  createdIds.push(spot.id);createdBranchIds.push(...bs.map(b=>b.id));
  const added={numbers:spec.numbers,id:spot.id,slug:spot.slug,name:spot.name,username:spec.username,branches:bs.map(b=>({id:b.id,slug:b.slug,items:b.menu_items.length,budgets:b.budget_scenarios.length})),pending:consolidated.pending};
  if(spec.logoHash){
    const {stdout}=await exec('node',[`${skill}/profile-logo.mjs`,'finish',`${directory}/logo.json`,'logo',catalogPath,String(spot.id),spec.logoHash]);
    added.logo=JSON.parse(stdout);assert.equal(added.logo.status,'assigned');
    consolidated.data.logo_url=added.logo.logoUrl;consolidated.write.fields.push('logo_url');
    await save(`${directory}/consolidated.json`,consolidated);
  }
  summary.created.push(added);summary.complete=false;summary.finishedAt=new Date().toISOString();
  await save(`${root}/integration-summary.json`,summary);console.log(JSON.stringify(added));
}
const after=await read(catalogPath);
assert.deepEqual(after.spots.filter(s=>!createdIds.includes(s.id)),currentBefore.spots);
assert.deepEqual(after.branches.filter(b=>!createdBranchIds.includes(b.id)),currentBefore.branches);
await save(`${root}/continuation-verification.json`,{checkedAt:new Date().toISOString(),createdIds,createdBranchIds,unrelatedRowsPreserved:true,published:false});

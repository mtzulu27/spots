import fs from 'node:fs/promises';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102',catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const progress=await read(`${root}/progress.json`),stamp=new Date().toISOString();
const contacts={
  'la-fugitiva-granada':{phone:'+573164466385',whatsapp:'https://wa.me/573164466385',menu_url:'https://menupp.co/lafugitiva/venue/KA02JmhSPeMDi36lMUwO/menu/ybPEHOHHgTJSjPSoRJ6N'},
  'la-fugitiva-dapa':{phone:'+573174543682',whatsapp:'https://wa.me/573174543682',menu_url:'https://menupp.co/lafugitiva/venue/jhfJgnsgRrj3ovActhCE/menu/rN5VbqwhU0Q5mD5jCHiE'},
  'capriatto-granada-cali':{phone:'+573159350514',whatsapp:'https://wa.me/573159350514',menu_url:'https://menupp.co/cappriato/venue/3FbhaLcFEHQirbK3ApsG/menu/SCPrUzwhIHrPhdZ4IG7U',address:'Avenida 9 Norte #20N-17, Cali'},
  'capriatto-mall-la-leyenda-cali':{phone:'+573019965773',whatsapp:'https://wa.me/573019965773',menu_url:'https://menupp.co/cappriato/venue/7t2lERHCJyInGm8UymrC/menu/9a1c5dbd-91bb-498a-ace0-262090f19c35'},
  'palo-mulata-lago-verde':{phone:'+573215616277',whatsapp:'https://wa.me/573215616277',address:'Calle 16A #122-70, local C5, Lago Verde, Pance, Cali',menu_url:'https://menupp.co/palomulata/venue/a6HVlSG26Cn7hFY6FjSr/menu/cf274272-616f-4c3a-b387-2c63ee149c83'},
  'palo-mulata-san-antonio':{phone:'+573215616277',whatsapp:'https://wa.me/573215616277',menu_url:'https://menupp.co/palomulata/venue/ob9Jw0kGpoWha7XIf4OY/menu/95baeb22-aa3c-4a4e-ad05-ea90d100f287'},
  'lorso-ibiza-122':{phone:'+573117153373',whatsapp:'https://wa.me/573117153373',website_url:'https://lorso.flowlab.in/menu',hours:'Lun-Dom 11:00-23:00'},
  'premier-wings-ibiza-122':{phone:'+573137225158',whatsapp:'https://wa.me/573137225158',website_url:'https://premierwings.niceeat.co/',menu_url:'https://premierwings.niceeat.co/carta/menu-principal'},
  'cabo-leones-granada':{website_url:'https://app.mezzy.co/r/cabo-leones',menu_url:'https://app.mezzy.co/r/cabo-leones/menu'},
  'piropo-bulevar-del-rio':{whatsapp:'https://wa.me/573108464822'},
};
const descriptions={
  'lafugitiva.co':'Pizza y un parche con tu mascota; la visita es con reserva previa.',
  'bengala.bandolero':'Tragos y música para adultos: armá la noche con tu parche. Ingreso para mayores de 21 años.',
  bonnepasteleria:'Caé por brunch, pastelería y café para hacer una pausa dulce.',
  constantinapizzeria:'Pizza napolitana contemporánea, recetas italianas y manos colombianas para compartir el parche.',
  brazzburger:'Un parche de hamburguesas con sedes en Pance, El Peñón, Ciudad Jardín y San Fernando.',
  cappriato:'Caé por sándwiches en Granada o en Mall La Leyenda.',
  lorsoristorantecali:'Cocina italiana para parchar en el segundo piso de Ibiza 122.',
  'somos.braun':'Una pausa dulce con postres, soft serve y café.',
  'premierwings.co':'Alitas, hamburguesas y coctelería para armar el parche en Ibiza 122.',
  caboleones:'Coctelería y buena mesa para un parche al atardecer en Granada.',
  greensbolosclub:'Armá el parche de bolos con amigos o familia. Las reservas son solo para cumpleaños y eventos empresariales.',
  palomulata:'Cortes angus, parrilla y catas privadas para parchar en Lago Verde o San Antonio.',
};
const visibleReviewedBranches=new Set([
  'cabo-leones-granada','greens-bolos-club-acopi','greens-bolos-club-ciudad-jardin',
  'palo-mulata-lago-verde','la-fugitiva-granada',
]);
const audit=[];
for(const record of progress.startedScope) {
  const current=await read(catalog);
  const spot=current.spots.find(s=>s.instagram===record.instagram||record.matches.some(m=>m.id===s.id));
  if(!spot)continue;
  const data={id:spot.id,slug:spot.slug,instagram:record.instagram,source_urls:[...new Set([...(spot.source_urls??[]),record.instagram])],catalog_status:'reviewed_with_pending'};
  if(spot.business_status==='temporarily_closed')data.is_active=true;
  if(descriptions[record.username])data.short_description=descriptions[record.username];
  if(record.username==='cappriato')data.name='Cappriato';
  const branches=current.branches.filter(b=>b.spot_id===spot.id).map(b=>{
    const update={id:b.id,slug:b.slug,instagram:record.instagram,...contacts[b.slug]};
    if(b.business_status==='temporarily_closed')update.is_active=true;
    if(visibleReviewedBranches.has(b.slug)&&b.business_status!=='permanently_closed') {
      update.is_active=true;
      if(!b.business_status)update.business_status='unknown';
    }
    if(record.username==='heladosyulika')Object.assign(update,{website_url:'https://www.heladosyulika.com/',menu_url:'https://www.heladosyulika.com/menu',phone:'+573147551546',whatsapp:'https://wa.me/573147551546'});
    if(record.username==='anandatallerdulce')update.website_url='https://anandaweb.com/puntos-de-venta/';
    if(record.username==='somos.braun')update.whatsapp='https://wa.me/573171736805';
    const entity={data:update,write:{mode:'update',fields:Object.keys(update).filter(k=>!['id','slug'].includes(k))}};
    if(b.slug==='lorso-ibiza-122'){entity.write.hours='replace';entity.weeklyHours=[0,1,2,3,4,5,6].map(day_of_week=>({day_of_week,is_closed:false,open_time:'11:00',close_time:'23:00'}));}
    return entity;
  });
  const acquisition=await read(`${root}/${record.username}/acquisition.json`);
  const input={schemaVersion:1,data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))},branches,fieldDecisions:[{fields:['instagram','short_description','name','phone','whatsapp','menu_url','website_url','hours'],status:'preferred',source:record.instagram,consultedAt:stamp,reason:'Perfil y enlaces oficiales revisados. Contactos Menupp asociados por ID de sede; no se copian horarios inactivos ni coordenadas entre sedes.'}],coverage:{profile:acquisition.profileCoverage,bio:'field_level_review',googlePlaces:'blocked_missing_api_key',highlights:'blocked_missing_chrome_devtools'},pending:['Corroboración de sedes con Places y destacadas pendiente.','Sedes preexistentes no mencionadas no se cierran ni se borran por silencio del perfil.']};
  if(['bonnepasteleria','constantinapizzeria'].includes(record.username))input.pending.push('El menú nuevo enlazado se identifica como Domicilios y está inactivo; sus precios no se usan como carta de visita.');
  if(record.username==='heladosyulika')input.pending.push('La web confirma tres puntos y venta por peso, pero no expone las direcciones completas ni tarifa utilizable por HTTP. No confundir umbral de fidelización con presupuesto.');
  if(record.username==='greensbolosclub')input.pending.push('Las dos sedes proceden del catálogo previo y no tienen cierre comercial confirmado. Se mantienen visibles con estado desconocido; perfil vigente confirma la marca, no revalida por sí solo cada dirección.');
  await save(`${root}/${record.username}/branches-consolidated.json`,input);
  const report=await integrateCatalog(`${root}/${record.username}/branches-consolidated.json`,catalog,{});
  await save(`${root}/${record.username}/branches-integration.json`,report);
  audit.push({username:record.username,spotId:spot.id,branches:branches.map(b=>({id:b.data.id,slug:b.data.slug,reviewedFields:b.write.fields})),status:'partial_source_review'});
}
await save(`${root}/branch-reconciliation.json`,{consultedAt:stamp,records:audit});
console.log(JSON.stringify({places:audit.length,branches:audit.reduce((n,r)=>n+r.branches.length,0)}));

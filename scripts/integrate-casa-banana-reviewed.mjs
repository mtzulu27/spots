import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='apps/mobile/public/spots-catalog.json';
const root='docs/catalog-review/benchmarks';
const out=`${root}/casabananaa-reviewed`;
const raw=fs.readFileSync(file,'utf8'), original=JSON.parse(raw), next=structuredClone(original);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const extracted=read(`${root}/casabanana-menupp-links-2026-09-07T05-13-25-577Z.json`);
const manifest=read(`${root}/casabananaa-highlights/manifest.json`);
const now=new Date().toISOString();
const place=next.spots.find(p=>p.id===3);
assert.equal(place.slug,'casa-banana-granada');
assert.equal(next.branches.filter(b=>b.spot_id===3).length,2);
place.name='Casa Bananá';
place.short_description='Un parche de brunch y postres con tortas de banano, tostadas francesas, sándwiches y café. Elegí entre Granada y Pance para desayunar sin afán o hacer una pausa dulce con tu gente.';
place.category='Comida'; place.subcategories=['Brunch','Café','Postres'];
place.tags=['brunch','postres','café','tortas de banano','desayunos','sándwiches'];
place.moods=['comer rico','plan tranqui','con amigos','pareja'];
place.is_active=true;place.business_status='operational';place.catalog_status='reviewed_with_pending';place.updated_at=now;
place.missing_fields=['menu_price_tuna_melt_pance'];
const result={generatedAt:now,data:place,fieldDecisions:[{fields:['name','short_description','category','subcategories','tags','moods'],status:'preferred',sources:['https://www.instagram.com/casabananaa/',extracted.source],checkedAt:now,reason:'Identidad confirmada por enlace de bio y direcciones; nombre comercial Casa Bananá, no el título genérico Brunch y postres. Concepto sintetizado de las cartas.'}],branches:[],pending:[],coverage:{profile:true,menus:2,googlePlaces:2,highlightsImagesRead:4,photos:'Preservadas, sin descargar ni revalidar URLs firmadas existentes.'}};
let hourId=Math.max(...next.branchHours.map(h=>h.id),...(next.hours||[]).map(h=>h.id))+1;
const newHours=[];
for(const spec of [{key:'granada',id:6,locationId:'O2jCZkQ65B2GzX3nRmp3',address:'Avenida 9 Norte #12N-10, Granada, Cali'},{key:'pance',id:5,locationId:'mekiP3lb8Ou8ytqKgOq1',address:'Puerto 125, local 2, Carrera 125 con Calle 16A, Pance, Cali'}]){
  const branch=next.branches.find(b=>b.id===spec.id);assert.equal(branch.spot_id,3);
  const gReport=read(`${root}/casabananaa-google-${spec.key}.json`),g=gReport.selected;
  assert.equal(g.businessStatus,'OPERATIONAL');assert.match(g.name,/Casa Bananá/);
  const loc=extracted.locations.find(l=>l.id===spec.locationId),menu=extracted.menus.find(m=>m.locationId===spec.locationId);
  assert.equal(menu.metadata.active,true);
  const cats=new Map(menu.categories.map(c=>[c.id,c]));
  const inventory=[],items=[],pending=[];
  for(const p of menu.products){
    const section=cats.get(p.product_category);const name=p.product_name?.trim()||p.name?.trim();
    const prices=Array.isArray(p.price)?p.price:p.price?[p.price]:[];
    const normalized=[];
    for(const v of prices){
      // A decimal such as 29.9 in a COP menu is ambiguous, not an implicit thousands multiplier.
      const n=Number(v.price),valid=Number.isInteger(n)&&n>0;
      const price=valid?n:null;
      normalized.push({label:v.label?.trim()||null,price,currency:'COP',status:valid?'confirmed':'pending',available:!v.disable&&!v.noStock});
      if(!valid)pending.push({field:'menu_items.price',productId:p.id,name,presentation:v.label||null,reason:'Importe decimal o no interpretable en COP; no se escala ni se copia de la otra sede.'});
      if(!valid||p.disabled||section?.disabled||v.disable||v.noStock||(p.hierarchy&&p.hierarchy!=='root'))continue;
      const title=section?.name?.trim()||'';
      const category=/Bebidas/.test(title)?'drinks':title==='Postres'?'desserts':title==='Entradas'?'starters':/Desayunos|Sándwiches|Tostadas Francesas/.test(title)?'mains':'extras';
      const excluded=/market|kids|regalos|agregar/i.test(title);
      items.push({name:name+(v.label?.trim()?` - ${v.label.trim()}`:''),price,category,menuSection:title,sourceUrl:menu.source,verifiedAt:now,unit:v.label?.trim()||'unidad',calculationIncluded:!excluded,...(excluded?{exclusionReason:'Market, porción infantil o adición: no comparable con consumo individual adulto.'}:{})});
    }
    inventory.push({id:p.id,name,description:(p.description||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(),section:section?.name?.trim()||null,parentId:p.hierarchy||null,available:!p.disabled&&!section?.disabled,prices:normalized,optionIds:p.options||[]});
  }
  Object.assign(branch,{address:spec.address,hours:'Lun 13:00-20:00 · Mar-Dom 09:00-20:00',holiday_mode:'custom',holiday_open_time:'09:00',holiday_close_time:'20:00',holiday_split_open_time:null,holiday_split_close_time:null,
    menu_url:menu.source,menu_items:items,phone:loc.phone,whatsapp:`https://wa.me/${loc.wa_phone.replace(/\D/g,'')}`,instagram:'https://www.instagram.com/casabananaa/',website_url:'',
    latitude:g.latitude,longitude:g.longitude,google_maps_url:g.googleMapsUrl.split('&g_mp=')[0],google_place_id:g.placeId,business_status:'operational',is_active:true,updated_at:now,
    menu_calculation_note:'Carta oficial de esta sede. Presentaciones separadas; Market, menú infantil y adiciones excluidos del cálculo individual.'+(pending.length?' Tuna Melt de Pance pendiente por importe ambiguo en la fuente.':''),
    catalog_status:pending.length?'reviewed_with_pending':'reviewed',missing_fields:pending.length?['menu_price_tuna_melt']:[]});
  for(let day=0;day<7;day++)newHours.push({id:hourId++,branch_id:branch.id,day_of_week:day,is_closed:false,open_time:day===1?'13:00:00':'09:00:00',close_time:'20:00:00',split_open_time:null,split_close_time:null,sort_order:(day||7)*10});
  const source=manifest.items[0];
  const decisions=[
    {fields:['hours','holiday_mode','holiday_open_time','holiday_close_time'],status:spec.key==='granada'?'confirmed':'preferred',sources:[source.source,extracted.source,branch.google_maps_url],publishedAt:source.publishedAt,checkedAt:now,reason:spec.key==='granada'?'Semana coincidente con Google; festivos explícitos en destacada oficial.':'Placa oficial sin nombre de sede aplicada por criterio: configuración de esta sede coincide en todos los días; Google no aporta horario. Festivos de la placa común.'},
    {fields:['latitude','longitude','google_maps_url','address'],status:'confirmed',sources:['https://www.instagram.com/casabananaa/',branch.google_maps_url],checkedAt:gReport.checkedAt,reason:'Ficha Google coincide con sede y dirección de bio/destacadas.'},
    {fields:['phone','whatsapp','menu_url','menu_items'],status:'confirmed',sources:[extracted.source,menu.source],checkedAt:extracted.finishedAt,reason:'Enlace oficial de la bio; cada carta y contacto asociados al locationId de su sede. El handle antiguo de Menupp no reemplaza al perfil solicitado.'},
    {fields:['business_status'],status:'preferred',sources:[branch.google_maps_url],checkedAt:gReport.checkedAt,reason:'Google reporta operacional sin anuncio oficial contrario encontrado.'},
    {fields:['min_budget','max_budget','typical_budget','budget_basis','min_people','max_people'],status:'preferred',sources:['existing_catalog'],checkedAt:now,reason:'Valores existentes fuera del recálculo solicitado; conservados sin recalcular ni marcar como revalidados. Rango de personas editorial, no aforo.'},
  ];
  result.branches.push({data:branch,fieldDecisions:decisions,pending,coverage:{weeklyDays:7,holidays:'explicit_common_board',menuProducts:menu.products.length,menuAppPriceRows:items.length},menu:{source:menu.source,items:inventory,modifiers:menu.modifiers,variants:menu.variants}});
}
const ids=new Set([5,6]);next.branchHours=next.branchHours.filter(h=>!ids.has(h.branch_id)).concat(newHours);if(next.hours)next.hours=next.hours.filter(h=>!ids.has(h.branch_id)).concat(newHours);next.generatedAt=now;
assert.deepEqual(next.spots.filter(s=>s.id!==3),original.spots.filter(s=>s.id!==3));assert.deepEqual(next.branches.filter(b=>b.spot_id!==3),original.branches.filter(b=>b.spot_id!==3));
assert.equal(place.cover_image_url,original.spots.find(s=>s.id===3).cover_image_url);assert.deepEqual(place.gallery_urls,original.spots.find(s=>s.id===3).gallery_urls);
assert.equal(newHours.length,14);assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent catalog update; rerun');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/consolidated.json`,JSON.stringify(result,null,2)+'\n');fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify(result.branches.map(b=>({id:b.data.id,slug:b.data.slug,prices:b.data.menu_items.length,pending:b.pending})),null,2));

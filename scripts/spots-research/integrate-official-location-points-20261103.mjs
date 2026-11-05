import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102',catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const records=[
  ['criollan_lovers','criollan-lovers-san-antonio','criollanlovers-menupp-links-2026-11-03T04-36-14-530Z.json','WaehysWXO1MDFZzBmKBl','San Antonio'],
  ['piropo.rest','piropo-bulevar-del-rio','piropo-menupp-links-2026-11-03T04-36-45-325Z.json','9zn7KpLEYHpYjX8P7Deq','Cali'],
  ['lafugitiva.co','la-fugitiva-dapa','lafugitiva-menupp-links-2026-11-03T05-51-10-781Z.json','jhfJgnsgRrj3ovActhCE','Dapa'],
  ['palomulata','palo-mulata-san-antonio','palomulata-menupp-links-2026-11-03T04-38-23-770Z.json','ob9Jw0kGpoWha7XIf4OY','San Antonio, Cali'],
];
const results=[];
for(const [username,slug,file,id,label] of records){
  const raw=await read(`docs/catalog-review/benchmarks/${file}`),location=raw.locations.find(l=>l.id===id);
  assert.equal(location.name,label);
  assert.ok(raw.menus.some(m=>m.locationId===id&&m.metadata.active),'A location must have its own active reviewed menu');
  const {latitude,longitude}=location.location;
  assert.ok(Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>3&&latitude<4&&longitude>-77&&longitude<-76);
  const c=await read(catalog),branch=c.branches.find(b=>b.slug===slug),spot=c.spots.find(s=>s.id===branch.spot_id);
  assert.equal(spot.instagram.replace(/\/+$/,''),`https://www.instagram.com/${username}`);
  if(branch.latitude!=null||branch.longitude!=null){results.push({slug,status:'existing_point_preserved'});continue;}
  const data={id:branch.id,slug,latitude,longitude,supplemental_info:{...(branch.supplemental_info??{}),coordinateEvidence:{source:raw.source,locationId:id,locationName:label,method:'official_menupp_location_record',independentlyVerified:false,note:'Punto publicado por la marca, pendiente corroboración con Google Places. No implica puerta exacta verificada.'}},missing_fields:(branch.missing_fields??[]).filter(k=>k!=='coordinates')};
  const input={schemaVersion:1,data:{id:spot.id,slug:spot.slug},write:{mode:'update',fields:[]},branches:[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['latitude','longitude'],source:raw.source,status:'preferred',reason:`Registro oficial ${label}, ID de sede coincidente con su carta activa; solo se completa un punto ausente, no se geocodifica por aproximación ni se copia de otra sede.`}],coverage:{coordinates:'official_source_not_independently_verified',googlePlaces:'blocked_missing_api_key',highlights:'blocked_missing_devtools'},pending:['Verificar exactitud y ubicación de la puerta con Google Places.']};
  const prefix=`${root}/${username}/location-${slug}`;
  await fs.writeFile(`${prefix}-consolidated.json`,JSON.stringify(input,null,2)+'\n');
  await fs.writeFile(`${prefix}-integration.json`,JSON.stringify(await integrateCatalog(`${prefix}-consolidated.json`,catalog,{}),null,2)+'\n');
  results.push({slug,status:'official_point_integrated_pending_corroboration',latitude,longitude});
}
await fs.writeFile(`${root}/official-location-review.json`,JSON.stringify({reviewedAt:new Date().toISOString(),results},null,2)+'\n');
console.log(JSON.stringify(results));

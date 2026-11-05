import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {requiredFields} from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-place-completion.mjs';
import {scenarioBudget} from '../../apps/mobile/lib/budget-scenarios.ts';

const root='docs/catalog-review/discovery/main-2-skill-review-20261103';
const original='docs/catalog-review/discovery/video-intake-20261103';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const save=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
await fs.mkdir(root,{recursive:true});
const summary=await read(`${original}/integration-summary.json`);
const raw=await fs.readFile('apps/mobile/public/spots-catalog.json');
const catalog=JSON.parse(raw),checkedAt=new Date().toISOString();
const rows=[];
for(const item of summary.created){
  const spot=catalog.spots.find(s=>s.id===item.id);
  const branches=catalog.branches.filter(b=>b.spot_id===item.id);
  const localFiles=[];
  for(const url of [spot?.logo_url,spot?.cover_image_url,...(spot?.gallery_urls??[])].filter(Boolean)){
    if(!url.startsWith('/')){localFiles.push({url,status:'external_url_not_local_verified'});continue;}
    try{const bytes=await fs.readFile(`apps/mobile/public${url}`);localFiles.push({url,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
    catch(e){localFiles.push({url,status:'missing',error:e.code});}
  }
  rows.push({id:item.id,name:item.name,username:item.username,expectedBranchIds:item.branches.map(b=>b.id),actualBranchIds:branches.map(b=>b.id),spotPresent:!!spot,localFiles,coverPresent:!!spot?.cover_image_url,galleryCount:spot?.gallery_urls?.length??0,branches:branches.map(b=>({id:b.id,addressPresent:!!b.address,coordinatesPresent:Number.isFinite(b.latitude)&&Number.isFinite(b.longitude),mapLinkPresent:!!b.google_maps_url,businessStatus:b.business_status,menuItems:b.menu_items?.length??0,budgetScenarios:b.budget_scenarios?.length??0,budgetTotals:(b.budget_scenarios??[]).map(s=>scenarioBudget(b.menu_items,2,s).perPerson),missingFields:b.missing_fields??[]})),closure:'not_certified',note:'Structural local audit only. Presence, file hashes and budget calculation are not source revalidation or visual app acceptance.'});
}
await save(`${root}/prior-work-structural-audit.json`,{checkedAt,catalogSha256:crypto.createHash('sha256').update(raw).digest('hex'),rows,published:false});
const dir=`${root}/absentacali`;
await fs.mkdir(dir,{recursive:true});
const absenta=rows[0];
await save(`${dir}/initial-evidence.json`,{checkedAt,username:'absentacali',priorDossier:path.resolve(original,'absentacali'),catalogAudit:absenta,scope:'Repair incomplete evidence; retain valid same-day sources. No production publication.'});
try{await fs.access(`${dir}/completion.json`);}
catch(e){
  if(e.code!=='ENOENT')throw e;
  const field=()=>({status:'blocked',evidence:['initial-evidence.json'],reason:'Evidencia histórica conservada; falta contrastar cobertura y comprobar la app antes del cierre.',checks:[{source:'catalog_local',outcome:'structural_presence_only',evidence:['initial-evidence.json'],reason:'Presencia de datos no implica validación actual ni aceptación visual.'}]});
  await save(`${dir}/completion.json`,{version:1,place:'absentacali',status:'blocked',scope:'full',branchInventory:absenta.actualBranchIds.map(id=>({id:String(id),evidence:['initial-evidence.json']})),linkQueue:[],sources:['profile_http','official_links','instagram_session','google_places','web_search','media_review'].map(kind=>({kind,status:'blocked',evidence:['initial-evidence.json'],note:'Matriz de revisión; rescatar evidencia pertinente y cerrar antes de avanzar.'})),entities:[{kind:'place',id:String(absenta.id),fields:Object.fromEntries(requiredFields.place.map(f=>[f,field()]))},...absenta.actualBranchIds.map(id=>({kind:'branch',id:String(id),fields:Object.fromEntries(requiredFields.branch.map(f=>[f,field()]))}))],remainingActions:['Revisar evidencia guardada de perfil, carta y Places','Completar destacadas, publicaciones y fotos','Contrastar ambas sedes, integrar campos corregidos con turno de escritura y verificar app'],integration:{status:'pending',evidence:[]},verification:{status:'pending',evidence:[]}});
}
await save(`${root}/progress.json`,{checkedAt,currentReview:'absentacali',reviewQueue:summary.created.map(r=>({id:r.id,username:r.username})),closed:[],resumeAfterReview:{directory:'docs/catalog-review/discovery/video-revalidation-20261103/pet-camp',row:1},catalogWritesThisPass:false,published:false});
console.log(JSON.stringify({places:rows.length,branches:rows.reduce((n,r)=>n+r.actualBranchIds.length,0),missingCovers:rows.filter(r=>!r.coverPresent).length,missingGallery:rows.filter(r=>r.galleryCount<3).length,currentReview:'absentacali',catalogChanged:false}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateCatalog } from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-place.mjs';
const root='docs/catalog-review/cafe-pintado-2026-09-05';
const file='apps/mobile/public/spots-catalog.json';
const raw=fs.readFileSync(file,'utf8'), before=JSON.parse(raw), next=structuredClone(before);
const google=JSON.parse(fs.readFileSync(`${root}/google-full-review.json`,'utf8'));
const ids=[124,975,976,977], changes=[];
const at=new Date().toISOString();
function set(row,key,value){if(JSON.stringify(row[key])!==JSON.stringify(value)){changes.push({id:row.id,field:key,before:row[key]??null,after:value});row[key]=value;}}
const spot=next.spots.find(s=>s.id===113 && s.slug==='cafe-pintado');assert(spot);
set(spot,'name','Café Pintado');
set(spot,'category','Arte y cultura');
set(spot,'catalog_status','blocked');
set(spot,'missing_fields',['weekly_hours_conflict','branch_menu_scope','ceramics_prices','real_media','palmira_city_integration','mallplaza_closure_type']);
set(spot,'is_active',false);set(spot,'updated_at',at);
for(const [index,id] of ids.entries()){
  const b=next.branches.find(b=>b.id===id && b.spot_id===113),g=google[index];assert(b && g);
  set(b,'latitude',g.latitude);set(b,'longitude',g.longitude);set(b,'google_maps_url',g.googleMapsUrl);
  if(id===975 || id===976)set(b,'address',g.address);
  if(g.phone)set(b,'phone',g.phone.replace(/\D/g,''));
  set(b,'menu_url','https://heyzine.com/flip-book/391a0570bc.html');
  set(b,'instagram','https://www.instagram.com/cafepintado/');
  set(b,'is_active',false);set(b,'updated_at',at);
}
const palmira=google[4];
assert(!next.branches.some(b=>b.slug==='cafe-pintado-llanogrande'),'Sede existente: revisar antes de repetir');
const added={id:Math.max(...next.branches.map(b=>b.id))+1,spot_id:113,slug:'cafe-pintado-llanogrande',city:'Palmira',neighborhood:'Palmira',mall:'Llanogrande',address:palmira.address,latitude:palmira.latitude,longitude:palmira.longitude,google_maps_url:palmira.googleMapsUrl,instagram:'https://www.instagram.com/cafepintado/',hours:'Por confirmar',is_active:false,catalog_status:'blocked',created_at:at,updated_at:at};
next.branches.push(added);ids.push(added.id);changes.push({id:added.id,field:'branch',before:null,after:added});
assert.deepEqual(next.spots.filter(s=>s.id!==113),before.spots.filter(s=>s.id!==113));
assert.deepEqual(next.branches.filter(b=>!ids.includes(b.id)),before.branches.filter(b=>!ids.includes(b.id)));
for(const key of Object.keys(before).filter(k=>!['spots','branches'].includes(k)))assert.deepEqual(next[key],before[key]);
const validation=ids.map(id=>validateCatalog(next,next.branches.find(b=>b.id===id).slug));
assert(validation.every(v=>v.errors.length===0));
const report={startedAt:'2026-09-06T03:33:40Z',deadlineAt:'2026-09-06T03:38:40Z',savedAt:at,status:'reviewed_with_unresolved_fields_hidden',changes,validation,
  instagram:{url:'https://www.instagram.com/cafepintado/',selected:['Horarios','Sedes','Mallplaza'],bio:'Pacific Mall, Puerto 125, Unicentro, Mallplaza cerrado por remodelacion, Llanogrande Palmira',hours:{reviewed:2,total:2,text:'Lun-Vie 13:30-21:00; Sab-Dom-Fest 11:00-22:00',age:'86 semanas'},sedes:{reviewed:1,status:'partial',observed:'Primera historia muestra Llanogrande; video no revisado completo'},mallplaza:{status:'blocked',note:'Visor no abrio de forma estable; cierre por remodelacion confirmado solo en bio'}},
  googleEvidence:'google-full-review.json',verdict:{identity:'Coinciden marca, ciudades y centros comerciales; conservar IDs existentes. Llanogrande nueva sede confirmada por bio, destacada y Google.',category:'Arte y cultura principal: perfil Arte y entretenimiento, actividad central de pintar; oferta de cafeteria secundaria. Multicategoria requiere integracion, no se afirma implementada.',coordinates:'Pines individuales Google asociados a sedes confirmadas por bio.',hours:'Conflicto no resuelto; no sobrescribir como verificado.',mallplaza:'Ambas fuentes indican no operativa; temporal versus definitivo pendiente.'},
  menu:{status:'document_unchanged',extraction:'menu-extraction.json',products:52,sha256:'fd5c4c5e584ccc923dfa5495a7da3b9f2ec2df5519cdca95bec53fdef86f7688',branchScope:'pending; no se copiaron productos a sedes sin evidencia de alcance'},
  pending:['Confirmar horarios por sede y festivos','App toma ciudad de marca: Llanogrande permanece oculta hasta resolver integracion de Palmira','Confirmar alcance de carta por sede y tarifa de pintura','Recibir portada, logo y galeria','Prueba visual de ficha y calculadora pendiente: lugar oculto'],unrelatedRecordsUnchanged:true};
report.instagram.sedes={opened:11,total:11,status:'location_text_reviewed',note:'Textos visibles revisados en las 11 historias: Llanogrande, Unicentro, Mallplaza y Pacific. Videos pausados para lectura, no se afirma visionado audiovisual integral.'};
report.instagram.mallplaza={status:'complete',reviewed:1,total:1,age:'8 semanas',text:'Mallplaza se encuentra en remodelacion; invita a Pacific Center y Unicentro Cali'};
fs.writeFileSync(`${root}/full-review-latest.json`,JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--apply')){
  assert.equal(fs.readFileSync(file,'utf8'),raw,'Cambio concurrente');
  fs.writeFileSync(`${root}/before-full-review.json`,JSON.stringify({spot:before.spots.find(s=>s.id===113),branches:before.branches.filter(b=>b.spot_id===113),addedBranchId:added.id},null,2));
  fs.writeFileSync(`${file}.partial.tmp`,JSON.stringify(next,null,2)+'\n');fs.renameSync(`${file}.partial.tmp`,file);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
}
console.log(JSON.stringify({applied:process.argv.includes('--apply'),changes:changes.length,errors:validation.flatMap(v=>v.errors),warnings:validation.flatMap(v=>v.warnings),public:false}));

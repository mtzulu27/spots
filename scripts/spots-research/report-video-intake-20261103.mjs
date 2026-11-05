import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {scenarioBudget} from '../../apps/mobile/lib/budget-scenarios.ts';
const root='docs/catalog-review/discovery/video-intake-20261103';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const summary=await read(`${root}/integration-summary.json`);
const original=await read(`${root}/reconciliation.json`);
const previous=await read(`${root}/review-status.json`);
const catalog=await read('apps/mobile/public/spots-catalog.json');
const integrated=new Map();
const ids=new Set(),branchIds=new Set();
const now=new Date().toISOString();
const budgetAudit=[];
for(const record of summary.created){
  assert.ok(!ids.has(record.id));ids.add(record.id);
  const spot=catalog.spots.find(s=>s.id===record.id);
  assert.equal(spot.slug,record.slug);assert.equal(spot.is_active,true);
  record.numbers.forEach(number=>{assert.ok(!integrated.has(number));integrated.set(number,record);});
  if(spot.logo_url)await fs.access(`apps/mobile/public${spot.logo_url}`);
  for(const b of record.branches){
    assert.ok(!branchIds.has(b.id));branchIds.add(b.id);
    const branch=catalog.branches.find(row=>row.id===b.id);
    assert.equal(branch.spot_id,spot.id);assert.equal(branch.is_active,true);
    assert.ok([0,3].includes(branch.budget_scenarios.length));
    const totals=branch.budget_scenarios.map(s=>scenarioBudget(branch.menu_items,2,s).perPerson);
    if(totals.length){assert.ok(totals.every(n=>Number.isFinite(n)&&n>0));assert.ok(totals[0]<totals[1]&&totals[1]<totals[2]);assert.equal(branch.min_budget,totals[0]);assert.equal(branch.typical_budget,totals[0]);assert.equal(branch.max_budget,totals[2]);}
    else {assert.equal(branch.typical_budget,0);assert.equal(branch.budget_basis,'Presupuesto por confirmar');}
    budgetAudit.push({id:branch.id,name:spot.name,items:branch.menu_items.length,scenarios:totals});
  }
  const dir=`${root}/${record.username}`;
  const c=await read(`${dir}/consolidated.json`);
  if(['macanudo.hifi','mundanobaroficial'].includes(record.username)){
    const repair=await read(`${dir}/menu-repair-review.json`).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    c.fieldDecisions=c.fieldDecisions.filter(d=>!['budget','menu_items_and_budget_scenarios'].includes(d.field));
    const macanudoReason=repair?.reviewStatus==='reviewed_and_integrated'
      ? `Carta oficial revisada e integrada: ${budgetAudit.filter(b=>record.branches.some(r=>r.id===b.id)).map(b=>b.items).join(', ')} entradas por sede, incluidas presentaciones de licores. Se conservan tres escenarios validados con el motor real; botellas y tragos permanecen separados.`
      : 'Carta HTML oficial: 116 entradas revisadas de comida y bebidas; formato $ k convertido a miles en contexto COP de la sede Cali. Tres consumos explícitos; no bebidas de botella como individuales. Presentaciones adicionales de licores pendientes.';
    c.fieldDecisions.push({field:'menu_items_and_budget_scenarios',status:'preferred',sources:[c.branches[0].data.menu_url],checkedAt:now,reason:record.username==='macanudo.hifi'?macanudoReason:'Carta pública Menupp de la sede Mundano, moneda COP explícita. Se excluyen productos y categorías desactivados, variantes sin stock, promociones y precios cero. No se copian productos de Gintonería ni Lulito.'});
    if(record.username==='macanudo.hifi'){
      c.fieldDecisions=c.fieldDecisions.filter(d=>d.field!=='address');
      c.fieldDecisions.push({field:'address',status:'preferred',sources:['https://www.instagram.com/macanudo.hifi/','https://menupp.co/macanudo'],checkedAt:now,reason:'Instagram y Menupp coinciden en la numeración de sede. No conservar como alternativa la numeración distinta de Google/web.'});
    }
    await save(`${dir}/consolidated.json`,c);
  }
  const logo=await read(`${dir}/logo.json`).catch(()=>null);
  assert.notEqual(logo?.status,'needs_visual_review',`Unfinished temporary logo for ${record.username}`);
}
const notes={
  1:'PetCamp tiene varias sedes y marcas candidatas. Web candidata publica dos sedes, pero también contacto placeholder; identidad del video y perfil aún por contrastar.',
  3:'Nombre y mall La Leyenda coinciden con Google; perfil oficial sin identificar. No se inventó Instagram.',
  4:'Candidato Deligurt en la misma dirección de Pacific Center; falta confirmar el local y perfil oficial.',
  6:'Jogoso campestre coincide con Km 2 vía Puerto Tejada; falta vincular perfil oficial sin confundir tienda de productos.',
  8:'Búsqueda adicional no resolvió identidad FAVA; no asociar resultados de farmacias o universidades.',
  15:'NONNA Granada coincide por nombre y sede; Instagram oficial no localizado. Precios de Rappi no sirven como carta presencial.',
  24:'Perfil quicklyshotsoficial incompleto tras cuatro intentos; Beacons bloqueado. La ficha Google de Granada está contrastada; identidad del perfil vigente pendiente.',
  35:'Google reporta cierre temporal de Dopamina; web oficial sin DNS. Falta contraste oficial, no se crea ficha como operacional.',
  48:'Google reporta Coyote cerrado permanentemente. Linktree sin enlaces propios ni prueba de reapertura; no se crea ficha activa.',
  55:'Web oficial Zona Roja redirige a Paintball Cali, en construcción; contacto comercial disponible, perfil y revisión completa pendientes.',
  57:'Cuenta pueblitoextremo contrastada por WhatsApp coincidente con el candidato Cali MotorSports Tracks. Falta confirmar operación y sede actual de la pista de Sameco; no se integra solo por la coincidencia del teléfono.',
  65:'Sitio oficial e Instagram espirareterra.taller vinculados. Talleres de cerámica y macramé verificados, sin precios. Conflicto de ubicación entre Cristales (web) y otras áreas en directorios/enlace de reseñas; sede actual pendiente.',
};
const rows=original.records.map(r=>{
  const added=integrated.get(r.number),prior=previous.rows.find(p=>p.number===r.number);
  if(added)return {number:r.number,name:r.name,branch:r.location,video:r.video,status:'integrated_local',spotId:added.id,reason:'Identidad y sede contrastadas; ficha persistida en catálogo local. Campos ausentes marcados pendientes.'};
  return {...prior,...(notes[r.number]?{reason:notes[r.number]}:{})};
});
const counts={sourceRows:rows.length,excludedExisting:rows.filter(r=>r.status==='excluded_existing').length,integratedSourceRows:rows.filter(r=>r.status==='integrated_local').length,newPlaces:ids.size,newBranches:branchIds.size,pending:rows.filter(r=>r.status==='pending').length};
assert.equal(counts.excludedExisting+counts.integratedSourceRows+counts.pending,65);
const verification={checkedAt:now,catalogPersisted:true,uniqueIds:true,branchRelations:true,realBudgetEngineValidated:true,logoFilesPresent:true,noOwnPendingLogoTemporaries:true,appVisualQA:false,published:false,budgetAudit};
await save(`${root}/verification.json`,verification);
await save(`${root}/review-status.json`,{checkedAt:now,counts,complete:false,published:false,rows,separateEvent:{name:'Gran Mercado Medieval',status:'excluded_itinerant_event'},verification});
summary.reviewCounts=counts;summary.complete=false;summary.finishedAt=now;
await save(`${root}/integration-summary.json`,summary);
const md=`# Cruce de listas e integración local\n\nComparado con Main y el catálogo real. No se ha terminado toda la cola: los pendientes no se cuentan como duplicados ni como altas.\n\n- ${counts.sourceRows} registros de origen.\n- ${counts.excludedExisting} coincidencias existentes excluidas de nuevas altas.\n- ${counts.newPlaces} lugares nuevos, ${counts.newBranches} sedes (${counts.integratedSourceRows} filas de origen).\n- ${counts.pending} filas pendientes.\n- Gran Mercado Medieval separado por ser itinerante.\n- Sin despliegue en Hostinger. Sin portadas ni galerías nuevas.\n- Destacadas bloqueadas por el perfil de navegador ocupado; no se cerraron sesiones ajenas.\n\n## Altas locales\n\n${summary.created.map(r=>`- ${r.name}, ID ${r.id}, ${r.branches.length} sede(s). Pendientes: ${r.pending.join(', ')}.`).join('\n')}\n\n## Validación\n\nIDs únicos, relaciones de sedes, archivos de logo y presupuestos comprobados con el motor real de la app. No equivale a comprobación visual ni publicación. La pasada anterior no encontró servidor en localhost:8082; esta continuación no lo inició. Los escritores verificaron que las filas ajenas permanecieran intactas durante sus escrituras.\n\n## Detalle por registro\n\n| # | Lugar | Estado | ID | Motivo |\n|---|---|---|---|---|\n${rows.map(r=>`| ${r.number} | ${r.name.replaceAll('|','/')} | ${r.status} | ${r.spotId??'—'} | ${r.reason.replaceAll('|','/')} |`).join('\n')}\n`;
await fs.writeFile(`${root}/REVISION.md`,md);
console.log(JSON.stringify({counts,validation:'passed',published:false},null,2));

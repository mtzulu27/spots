import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';

const root = 'docs/catalog-review/discovery/video-intake-20261103';
const catalogPath = 'apps/mobile/public/spots-catalog.json';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const save = (path, data) => fs.writeFile(path, JSON.stringify(data, null, 2) + '\n');
const summary = await read(`${root}/integration-summary.json`);
const checkedAt = new Date().toISOString();
const before = await read(catalogPath);
const ownIds = new Set(summary.created.map(row => row.id));
const ownBranchIds = new Set(summary.created.flatMap(row => row.branches.map(b => b.id)));
const changes = [];
const time = point => `${String(point.hour ?? 0).padStart(2, '0')}:${String(point.minute ?? 0).padStart(2, '0')}`;
const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

for (const record of summary.created) {
  const directory = `${root}/${record.username}`;
  const consolidated = await read(`${directory}/consolidated.json`);
  const branchUpdates = [];
  for (const b of record.branches) {
    const pance = b.slug === 'absenta-bar-alto-pance';
    const filename = pance ? 'google-places-pance.json' : record.username === 'sinfrenoscali' ? 'google-places-details.json' : 'google-places.json';
    const evidence = await read(`${directory}/${filename}`);
    const place = evidence.selected;
    assert.ok(place?.placeId, `Missing reviewed Google identity for ${b.slug}`);
    const original = consolidated.branches.find(row => row.data.slug === b.slug);
    const branch = before.branches.find(row => row.id === b.id);
    assert.equal(branch.spot_id, record.id);
    const data = {id:b.id, slug:b.slug, google_place_id:place.placeId, google_maps_url:place.googleMapsUrl, business_status:'operational'};
    const weeklyHours = [...(original.weeklyHours ?? [])];
    const descriptions = place.regularHours ?? [];
    const periods = place.regularHoursRaw?.periods ?? [];
    // Preserve explicit Instagram days; Google only fills days not specified there.
    for (let day = 0; day < 7; day++) {
      if (weeklyHours.some(row => row.day_of_week === day)) continue;
      const matching = periods.filter(period => period.open?.day === day);
      assert.ok(matching.length <= 1, `Split hours need explicit review: ${b.slug}`);
      if (matching.length) {
        const period = matching[0];
        assert.ok(period.close, 'Do not infer 24-hour opening from incomplete periods');
        weeklyHours.push({day_of_week:day, is_closed:false, open_time:time(period.open), close_time:time(period.close)});
      } else if (descriptions.some(text => text.toLowerCase().startsWith(`${days[day]}:`) && /cerrado/i.test(text))) {
        weeklyHours.push({day_of_week:day, is_closed:true, open_time:null, close_time:null});
      }
    }
    const update = {data, write:{mode:'update',fields:Object.keys(data).filter(k => !['id','slug'].includes(k))}};
    if (weeklyHours.length) {
      update.weeklyHours = weeklyHours.sort((a,b) => a.day_of_week-b.day_of_week);
      update.write.hours = 'replace';
      data.hours = descriptions.join('; ');
      update.write.fields.push('hours');
      data.missing_fields = branch.missing_fields.filter(field => !['weekly_hours','monday_non_holiday_hours','other_weekdays_hours'].includes(field));
      update.write.fields.push('missing_fields');
    }
    branchUpdates.push(update);
    Object.assign(original.data, data);
    original.write = {mode:'update',fields:Object.keys(original.data).filter(k => !['id','slug'].includes(k))};
    if (update.weeklyHours) {
      original.weeklyHours = update.weeklyHours;
      original.write.hours = 'replace';
    }
    consolidated.fieldDecisions.push({field:`branches.${b.slug}.google_identity_and_hours`, status:'preferred', checkedAt, sources:[place.googleMapsUrl], reason:'Identidad y dirección contrastadas con perfil/web oficial y video. Instagram conserva prioridad en días explícitos; Google completa días omitidos. Fecha de edición de Google no disponible; no se importan coordenadas de Google a Mapbox.'});
  }
  const patch = {schemaVersion:1,data:{id:record.id,slug:record.slug,business_status:'operational'},write:{mode:'update',fields:['business_status']},branches:branchUpdates};
  await save(`${directory}/hours-update.json`, patch);
  const result = await integrateCatalog(`${directory}/hours-update.json`, catalogPath, {});
  await save(`${directory}/hours-integration.json`, result);
  consolidated.data.id = record.id;
  consolidated.data.business_status = 'operational';
  consolidated.write.mode = 'update';
  consolidated.pending = consolidated.branches.flatMap(b => b.data.missing_fields ?? []);
  await save(`${directory}/consolidated.json`, consolidated);
  record.pending = [...new Set(consolidated.pending)];
  changes.push({id:record.id,branches:branchUpdates.map(b => ({id:b.data.id,hours:b.weeklyHours?.length ?? 0}))});
}

const catalog = await read(catalogPath);
// Verify this pass did not touch Main's records, photos or other collections.
assert.deepEqual(catalog.spots.filter(s => !ownIds.has(s.id)), before.spots.filter(s => !ownIds.has(s.id)));
assert.deepEqual(catalog.branches.filter(b => !ownBranchIds.has(b.id)), before.branches.filter(b => !ownBranchIds.has(b.id)));
for (const collection of ['hours','branchHours']) {
  assert.deepEqual(catalog[collection].filter(row => !ownBranchIds.has(row.branch_id)), before[collection].filter(row => !ownBranchIds.has(row.branch_id)));
}
for (const collection of ['spots','branches']) {
  assert.equal(new Set(catalog[collection].map(row => row.id)).size, catalog[collection].length);
}
for (const record of summary.created) {
  const spot = catalog.spots.find(s => s.id === record.id);
  assert.equal(spot.is_active, true);
  if (spot.logo_url) await fs.access(`apps/mobile/public${spot.logo_url}`);
  for (const {id} of record.branches) {
    const b = catalog.branches.find(row => row.id === id);
    assert.equal(b.spot_id, spot.id);
    assert.ok([0,3].includes(b.budget_scenarios.length));
    const costs = b.budget_scenarios.map(s => s.lines.reduce((sum,line) => {
      const items = b.menu_items.filter(item => item.name===line.name && item.category===line.category && item.presentation===line.presentation && item.calculationIncluded!==false);
      assert.equal(items.length,1);
      assert.ok(Number.isInteger(line.quantity) && line.quantity>0 && Number.isInteger(line.groupSize) && line.groupSize>0);
      return sum + items[0].price * Math.ceil(2/line.groupSize) * line.quantity;
    },0)/2);
    if (costs.length) {
      assert.ok(costs[0]<costs[1] && costs[1]<costs[2]);
      assert.equal(b.typical_budget,costs[0]);
      assert.equal(b.max_budget,costs[2]);
    } else assert.equal(b.typical_budget,0);
  }
}

const reconciliation = await read(`${root}/reconciliation.json`);
const integrated = new Map(summary.created.flatMap(row => row.numbers.map(n => [n,row])));
const reasons = {
  1:'Varias sedes PetCamp; el video no identifica cuál. Falta contrastar el perfil oficial y la sede.',
  2:'La búsqueda devuelve el centro comercial y otras tiendas; no confirma identidad de Chipi Pets.',
  3:'Coincidencia de nombre y zona; perfil oficial y datos de la sede aún sin verificar.',
  4:'Varias coincidencias Deligurt; confirmar el local de Pacific Center y su perfil.',
  5:'La web distingue tienda, guardería y evento. Dirección exacta de la guardería del video pendiente; no usar la tienda como sede.',
  6:'Sede campestre candidata identificada; falta contrastar perfil y datos oficiales.',
  7:'No se ha confirmado que el parque y el restaurante Ventolini sean la misma entidad del video.',
  8:'Sin coincidencia fiable para FAVA; los resultados no corresponden al negocio.',
  9:'Coincidencia El Patio del Museo y web oficial localizada; recolección completa pendiente.',
  14:'Coincidencia INÉS Cocina y Vida en Santa Mónica; Linktree localizado, revisión completa pendiente.',
  15:'Coincidencia NONNA Granada; falta validar perfil oficial y completar fuentes.',
  24:'Quickly tiene más de una sede; falta revisión completa de Granada.',
  25:'180 es ambiguo; no asociar automáticamente a restaurantes 180 Grados.',
  27:'Black Haus Ciudad Jardín y carta Menupp localizados; revisión completa pendiente.',
  29:'Macanudo HiFi Granada candidato; handle y fuentes oficiales pendientes de confirmar.',
  32:'Ice Pub Ciudad Jardín candidato; perfil @icepubcali pendiente de validar.',
  34:'RÛM está dentro de Caile según video; no se confirma una marca/sede independiente. No duplicar Caile.',
  35:'Google reporta cierre temporal. Falta contrastarlo con el perfil de Dopamina; no afirmar apertura.',
  38:'Hay tres Mantra en el catálogo; el video no permite asignarlo con certeza.',
  40:'Ciudad y sede no explícitas; identidad Casa Nova Bar Bistro pendiente.',
  44:'Candidata Migo Bochalema Plaza; perfil oficial y fuentes completas pendientes.',
  45:'Conservar como sede distinta de Migo; Calima todavía no consultada individualmente.',
  48:'Google reporta cierre permanente de Coyote; contrastar Linktree/perfil antes de crear ficha.',
  49:'Nombre provisional La Casa; identidad no confirmada.',
  50:'Mundano Granada candidato; falta confirmar identidad oficial y vigencia.',
  51:'Amores Sospechosos y otra marca comparten dirección candidata; posible cambio de marca sin resolver.',
  52:'Operador y ciudad/sede exacta no confirmados.',
  53:'El uniforme no identifica por sí solo al operador del lugar; no crear Combate Urbano por esa evidencia.',
  54:'Cuatrimotos Cali es un nombre oral; falta validar operador y sede.',
  55:'Zona Roja El Lido y web localizadas; perfil y extracción completa pendientes.',
  56:'Grafía provisional del nombre; identidad y sede no confirmadas.',
  57:'Grafía provisional y zona Sameco; operador exacto no confirmado.',
  58:'Nombre oral Guerreros Pance; ubicación exacta sin confirmar.',
  59:'Servicio Paseos y Aventuras 4x4 provisional; resultados no identifican operador fiable.',
  61:'Cascada candidata identificada; acceso y operador de la experiencia pendientes, no crear como negocio abierto.',
  62:'Arawata: falta confirmar ciudad y sede del video.',
  65:'Espirare Terra: distinguir taller/evento de la sede anfitriona Natyvaco; ciudad no confirmada.',
};
const rows = reconciliation.records.map(row => ({number:row.number,name:row.name,branch:row.location,video:row.video,status:row.catalogMatch?'excluded_existing':integrated.has(row.number)?'integrated_local':'pending',spotId:row.catalogMatch?.id ?? integrated.get(row.number)?.id ?? null,reason:row.catalogMatch?'Ya existe; se conserva la ficha y no se crea otra marca.':integrated.has(row.number)?'Identidad verificada e integración local persistida.':reasons[row.number]}));
assert.ok(rows.every(row => row.reason));
const counts = {sourceRows:rows.length,excludedExisting:rows.filter(r=>r.status==='excluded_existing').length,integratedSourceRows:rows.filter(r=>r.status==='integrated_local').length,newPlaces:summary.created.length,newBranches:summary.created.reduce((n,r)=>n+r.branches.length,0),pending:rows.filter(r=>r.status==='pending').length};
await save(`${root}/review-status.json`,{checkedAt,counts,complete:false,published:false,rows,separateEvent:{name:'Gran Mercado Medieval',status:'excluded_itinerant_event',reason:'Evento itinerante; no crear como lugar permanente.'},verification:{catalogPersisted:true,unrelatedRowsPreserved:true,budgetReferencesValid:true,logoFilesPresent:true,appVisualQA:false,reason:'localhost:8082 no respondió; no se inició servidor ni se modificó producción.'}});
await fs.writeFile(`${root}/REVISION.md`, `# Cruce de listas e integración local\n\nComparado con Main y el catálogo real. La revisión completa sigue pendiente: no todos los candidatos restantes están agotados.\n\n- ${counts.sourceRows} registros de origen.\n- ${counts.excludedExisting} coincidencias existentes excluidas de nuevas altas.\n- ${counts.newPlaces} lugares nuevos, ${counts.newBranches} sedes (${counts.integratedSourceRows} filas de origen).\n- ${counts.pending} filas pendientes; no fueron descartadas como duplicados.\n- Gran Mercado Medieval separado por ser itinerante.\n- Sin despliegue en Hostinger. Sin portadas ni galerías nuevas.\n- Destacadas bloqueadas por el perfil de navegador ocupado; no se cerraron sesiones ajenas.\n\n## Altas locales\n\n${summary.created.map(row=>`- ${row.name}, ID ${row.id}. Pendientes: ${row.pending.join(', ')}.`).join('\n')}\n\n## Detalle por registro\n\n| # | Lugar | Estado | ID | Motivo |\n|---|---|---|---|---|\n${rows.map(row=>`| ${row.number} | ${row.name.replaceAll('|','/')} | ${row.status} | ${row.spotId??'—'} | ${row.reason.replaceAll('|','/')} |`).join('\n')}\n`);
summary.hourUpdates = changes;
summary.reviewCounts = counts;
summary.finishedAt = checkedAt;
summary.complete = false;
await save(`${root}/integration-summary.json`, summary);
await save(`${root}/verification.json`, {checkedAt,counts,assertionsPassed:true,changes,published:false});
console.log(JSON.stringify({counts,assertionsPassed:true,published:false},null,2));

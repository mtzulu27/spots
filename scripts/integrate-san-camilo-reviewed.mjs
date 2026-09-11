import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const file = 'apps/mobile/public/spots-catalog.json';
const folder = 'docs/catalog-review/cafe-san-camilo-2026-09-06';
const raw = fs.readFileSync(file, 'utf8');
const base = JSON.parse(raw);
const next = structuredClone(base);
const source = JSON.parse(fs.readFileSync(`${folder}/menu-extraction.json`, 'utf8'));
const now = new Date().toISOString();
const ids = [4776, 5220, 5221, 5222];
assert.equal(source.items.length, 130);
assert.equal(next.branches.filter(b => b.spot_id === 3531).length, 4);

const menu = source.items.map(item => {
  let category = 'extras';
  let unit = 'unidad';
  let reason;
  if (item.section === 'BRUNCH' || item.section === 'BON BRGR DAPA') category = 'mains';
  else if (/^(Calientes|Frias)/.test(item.section)) { category = 'drinks'; unit = 'bebida individual'; }
  else if (item.section === 'Pasteleria') category = 'desserts';
  else if (item.section === 'Panadería') category = /Integral|Mantequilla|Tres Quesos|Pandebonitos/.test(item.name) ? 'starters' : 'desserts';
  if (/^Affogato/.test(item.name)) { category = 'desserts'; unit = 'porcion'; }
  if (/^(Chemex|Prensa Francesa|V60)$/.test(item.name)) { unit = 'metodo de filtrado'; reason = 'Numero de tazas no especificado; no comparable con una bebida individual.'; }
  if (/^Combo X/.test(item.name)) { unit = 'paquete'; reason = 'Paquete de varias unidades, excluido del promedio individual.'; }
  if (item.section === 'Cafe para Preparar') { unit = /Media/.test(item.name) ? 'media libra' : 'libra'; reason = 'Cafe para preparar en casa, no consumo de una visita.'; }
  if (item.section === 'Especiales Dapa') { category = /^Cube/.test(item.name) ? 'drinks' : 'mains'; unit = 'para compartir'; reason = 'Especial de Dapa para compartir; vigencia del menu mundial por confirmar.'; }
  if (item.section === 'Menu Infantil') { category = 'mains'; unit = 'plato infantil'; reason = 'Porcion infantil excluida del presupuesto adulto.'; }
  return { name: item.name, price: item.price, category, menuSection: item.section, sourceUrl: item.sourceUrl,
    verifiedAt: '2026-09-06T05:57:19.155Z', unit, calculationIncluded: !reason, ...(reason ? { exclusionReason: reason } : {}) };
});
const stats = (items, category) => {
  const values = items.filter(i => i.category === category && i.calculationIncluded).map(i => i.price);
  assert.ok(values.length);
  return { minimum: Math.min(...values), maximum: Math.max(...values), average: values.reduce((a,b) => a+b,0)/values.length, sampleSize: values.length };
};
const candidates = JSON.parse(fs.readFileSync(`${folder}/google-places.json`, 'utf8')).candidates;
const placeIds = ['ChIJg0SgoWCnMI4RL2DUPSB2WKY', 'ChIJgXtiSQChMI4RyrkDvqbptu8', 'ChIJwcn3VTehMI4R4t3isLhJBso', 'ChIJBTQoNQCvMI4RtByVk4UJJng'];
const changes = [];
for (const [index, id] of ids.entries()) {
  const branch = next.branches.find(b => b.id === id);
  assert.equal(branch.spot_id, 3531);
  const place = candidates.find(p => p.placeId === placeIds[index]);
  assert.equal(place.businessStatus, 'OPERATIONAL');
  branch.latitude = place.latitude;
  branch.longitude = place.longitude;
  branch.google_maps_url = place.googleMapsUrl.split('&g_mp=')[0];
  branch.website_url = 'https://san-camilo.com/';
  branch.menu_items = menu.filter(i => id === 5222 || !/Dapa|DAPA/.test(i.menuSection));
  const mains = stats(branch.menu_items, 'mains');
  const drinks = stats(branch.menu_items, 'drinks');
  branch.min_budget = mains.minimum + drinks.minimum;
  branch.max_budget = mains.maximum + drinks.maximum;
  branch.typical_budget = mains.average + drinks.average;
  branch.budget_basis = 'Referencia de brunch por persona: un plato individual promedio + una bebida individual promedio de la carta oficial de Café San Camilo. No incluye propina ni compras para llevar.';
  branch.menu_calculation_note = 'Carta de referencia de la marca; confirmar disponibilidad en la sede. Los productos expresamente de Dapa solo se incluyen en Dapa. Paquetes, café por libra, porciones infantiles, especiales para compartir y filtrados sin número de tazas no se mezclan en los promedios individuales.';
  branch.min_people = 1;
  branch.max_people = 4;
  branch.updated_at = now;
  if (id === 5220) branch.mall = 'Giardino Mall';
  // User explicitly selected the official Instagram schedules on 2026-09-06.
  branch.is_active = true;
  changes.push({ branchId:id, prices:branch.menu_items.length, mains, drinks, typicalBudget:branch.typical_budget, active:branch.is_active });
}
let hourId = Math.max(0, ...next.branchHours.map(h => Number(h.id)||0), ...next.hours.map(h => Number(h.id)||0));
const schedules = {
  4776: day => ['07:30:00','22:00:00'],
  5220: day => [day===0||day===6?'08:00:00':'09:00:00','21:00:00'],
  5221: day => [day===0||day===6?'08:00:00':'08:30:00','20:30:00'],
  5222: day => day===1?null:[day===0||day===6?'09:00:00':'15:00:00',day===0||day===6?'21:30:00':'20:30:00'],
};
for (const branch of next.branches.filter(b=>ids.includes(b.id))) {
  const holiday = branch.id===5222?null:schedules[branch.id](0);
  branch.holiday_mode = holiday?'custom':'inherit';
  branch.holiday_open_time = holiday?.[0]??null;
  branch.holiday_close_time = holiday?.[1]??null;
  branch.hours = branch.id===4776?'Todos los días y festivos 07:30-22:00':branch.id===5220?'Lun-Vie 09:00-21:00 · Sáb-Dom y festivos 08:00-21:00':branch.id===5221?'Lun-Vie 08:30-20:30 · Sáb-Dom y festivos 08:00-20:30':'Lunes por confirmar · Mar-Vie 15:00-20:30 · Sáb-Dom 09:00-21:30 · Festivos por confirmar';
}
for (const key of ['branchHours','hours']) {
  next[key] = next[key].filter(h => !ids.includes(h.branch_id));
  for (const id of ids) for (let day=0;day<7;day++) {
    const times = schedules[id](day);
    if (!times) continue;
    next[key].push({id:++hourId, branch_id:id, day_of_week:day, is_closed:false,
      open_time:times[0], close_time:times[1], split_open_time:null, split_close_time:null, sort_order:(day||7)*10});
  }
}
const spot = next.spots.find(s => s.id === 3531);
spot.is_active = true;
spot.catalog_status = 'needs_info';
spot.updated_at = now;
spot.short_description = 'Caé por un café y armá el brunch con bagels, croissants rellenos, pancakes o un bowl de açaí. También hay pastelería y bebidas frías para un parche sin afán. En Dapa encontrás, además, una carta de hamburguesas.';
const outside = d => ({...d, spots:d.spots.filter(s=>s.id!==3531),branches:d.branches.filter(b=>!ids.includes(b.id)),
  branchHours:d.branchHours.filter(h=>!ids.includes(h.branch_id)),hours:d.hours.filter(h=>!ids.includes(h.branch_id))});
assert.deepEqual(outside(base),outside(next));
for (const b of next.branches.filter(b=>ids.includes(b.id))) {
  assert.ok(Number.isFinite(b.latitude)&&Number.isFinite(b.longitude));
  assert.ok(b.menu_items.every(i=>Number.isFinite(i.price)&&i.price>0));
  assert.equal(b.created_at,base.branches.find(x=>x.id===b.id).created_at);
}
assert.equal(spot.created_at,base.spots.find(s=>s.id===3531).created_at);
const result = { reviewedAt:now, catalogWritten:false, status:'integrated_with_documented_unknowns', hoursDecision:'Usuario: usa los horarios que extrajiste de historias o de la bio. Se aplican horarios oficiales de Instagram; diferencias con Maps conservadas como antecedentes, no consenso.', sourceHash:createHash('sha256').update(raw).digest('hex'), changes,
  decisions:{menuScope:'Carta de referencia de marca, no garantia de disponibilidad identica por sede. Secciones Dapa separadas.',groupSize:'Sugerencia editorial 1-4 personas, no aforo.',panceHours:'Instagram oficial 2025-02-06; Google no publica horario; sin contradiccion encontrada.'},
  conflicts:[{branchId:4776,instagram:'Todos los dias y festivos 07:30-22:00',maps:'Lun-vie 09:00-21:30; sab-dom 08:30-21:30'},
    {branchId:5220,instagram:'Lun-vie 09:00-21:00; sab-dom y festivos 08:00-21:00',maps:'Todos los dias 09:00-21:00'},
    {branchId:5222,instagram:'Mar-vie 15:00-20:30; sab-dom 09:00-21:30; lunes y festivos no especificados',maps:'Lunes cerrado; mar-vie 15:00-20:30; sab-dom 09:30-21:00'}],
  pending:['Dapa: lunes y festivos por confirmar.','Sura: direccion, pin y estado actual sin confirmar; no se crea una sede por inferencia.','Logo y contactos adicionales no aportados.','Comprobacion visual de UI pendiente.'],
  evidenceFiles:['review.json','menu-extraction.json','google-places.json','highlights-video-evidence.json'],
  before:{spot:base.spots.find(s=>s.id===3531),branches:base.branches.filter(b=>ids.includes(b.id)),branchHours:base.branchHours.filter(h=>ids.includes(h.branch_id)),hours:base.hours.filter(h=>ids.includes(h.branch_id))} };
fs.writeFileSync(`${folder}/integration-candidate.json`,JSON.stringify(next,null,2)+'\n');
fs.writeFileSync(`${folder}/integration-result.json`,JSON.stringify(result,null,2)+'\n');
if (process.argv.includes('--apply')) {
  assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent catalog change; aborting');
  fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
  result.catalogWritten = true;
  fs.writeFileSync(`${folder}/integration-result.json`,JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({applied:result.catalogWritten,changes,pending:result.pending},null,2));

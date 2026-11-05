import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102';
const catalog='apps/mobile/public/spots-catalog.json';
const c=JSON.parse(await fs.readFile(catalog,'utf8'));
const source='https://cuchuflettos.com/';
const report=JSON.parse(await fs.readFile('docs/catalog-review/benchmarks/cuchuflettos.com-website-2026-11-03T04-42-01-411Z.json','utf8'));
assert.ok(report.pages.find(p=>p.finalUrl===source).text.includes('consumo mínimo de $10.000 por persona por cada hora'));
const spot=c.spots.find(s=>s.slug==='casa-cuchuflettos');
const input={schemaVersion:1,data:{id:spot.id,slug:spot.slug},write:{mode:'update',fields:[]},branches:c.branches.filter(b=>b.spot_id===spot.id).map(b=>({data:{id:b.id,slug:b.slug,supplemental_info:{...(b.supplemental_info??{}),consumptionPolicy:'El sitio solicita consumo de $10.000 por persona por cada hora de permanencia. No equivale al presupuesto de una comida.'}},write:{mode:'update',fields:['supplemental_info']}})),fieldDecisions:[{fields:['supplemental_info'],source,status:'preferred',reason:'La política de sostenibilidad es general para Casa Cuchuflettos, no exclusiva de San Antonio.'}],coverage:{policy:'official_home_reviewed'},pending:['Carta dinámica sin precios legibles por el extractor HTTP; no se calculan escenarios a partir del consumo mínimo.']};
await fs.writeFile(`${root}/casacuchuflettos/policy-consolidated.json`,JSON.stringify(input,null,2)+'\n');
await fs.writeFile(`${root}/casacuchuflettos/policy-integration.json`,JSON.stringify(await integrateCatalog(`${root}/casacuchuflettos/policy-consolidated.json`,catalog,{}),null,2)+'\n');

const braunReport=JSON.parse(await fs.readFile('docs/catalog-review/benchmarks/somosbraun.com-website-2026-11-03T05-30-11-398Z.json','utf8'));
const page=braunReport.pages.find(p=>p.finalUrl==='https://somosbraun.com/ubicacion/');
const schedule=[['braun-mallplaza','mallplaza cali','11:30','20:00','22:30'],['braun-ibiza-122','pance','11:00','21:30','22:00'],['braun-unicentro','unicentro cali','10:30','20:00','20:30']];
const braun=c.spots.find(s=>s.slug==='braun');
const records=schedule.map(([slug,label,open,close,weekend])=>{
  const start=page.text.indexOf(`CALI mallplaza cali`),local=page.text.slice(start,page.text.indexOf('CHÍA',start));
  const segment=local.slice(local.indexOf(label));
  assert.ok(segment.includes(open)&&segment.includes(close)&&segment.includes(weekend));
  const b=c.branches.find(b=>b.spot_id===braun.id&&b.slug===slug);
  const hours=c.branchHours.filter(h=>h.branch_id===b.id);
  assert.equal(hours.length,7);
  for(const h of hours){assert.equal(h.open_time.slice(0,5),open);assert.equal(h.close_time.slice(0,5),[5,6].includes(h.day_of_week)?weekend:close);}
  return {branchId:b.id,slug,label,status:'existing_weekly_hours_confirmed',source:page.finalUrl,days:hours.map(h=>({day:h.day_of_week,open:h.open_time,close:h.close_time})),pending:['Dirección y coordenadas exactas por corroborar con Places.','El catálogo de productos web no prueba precios presenciales por sede.']};
});
await fs.writeFile(`${root}/somos.braun/official-hours-review.json`,JSON.stringify({reviewedAt:new Date().toISOString(),scope:'Cali únicamente',records},null,2)+'\n');
console.log(JSON.stringify({consumptionPolicyBranches:input.branches.length,braunSchedulesConfirmed:records.length}));

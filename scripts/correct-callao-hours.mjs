import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'apps/mobile/public/spots-catalog.json';
const folder = 'docs/catalog-review/callao-2026-09-06';
const raw = fs.readFileSync(file, 'utf8');
const before = JSON.parse(raw), next = structuredClone(before);
const branch = next.branches.find(b => b.id === 30);
assert.equal(branch.slug, 'callao-centro');
assert.equal(branch.spot_id, 24);
branch.hours = 'Lun-Mié 17:00-00:00 · Jue-Sáb 17:00-03:00 · Dom cerrado · Festivos por confirmar';
branch.updated_at = new Date().toISOString();
for (const key of ['branchHours', 'hours']) {
  const rows = next[key].filter(h => h.branch_id === 30);
  assert.equal(rows.length, 7);
  assert.equal(new Set(rows.map(h => h.day_of_week)).size, 7);
  for (const h of rows) {
    const day = h.day_of_week;
    assert.ok(Number.isInteger(day) && day >= 0 && day <= 6);
    Object.assign(h, {is_closed:day === 0, open_time:day === 0 ? null : '17:00:00',
      close_time:day === 0 ? null : day <= 3 ? '00:00:00' : '03:00:00',
      split_open_time:null, split_close_time:null});
  }
}
const omitChanges = d => ({...d, branches:d.branches.map(b => {
  if (b.id !== 30) return b;
  const {hours, updated_at, ...rest} = b;
  return rest;
}), branchHours:d.branchHours.filter(h=>h.branch_id!==30), hours:d.hours.filter(h=>h.branch_id!==30)});
assert.deepEqual(omitChanges(before), omitChanges(next));
const report = {checkedAt:branch.updated_at, source:'check-in-hours.json',
  decision:'Usuario confirma horarios Instagram y ordena domingo cerrado sin excepcion, incluso previo a lunes festivo. No se implementa regla condicional. Festivos siguen sin horario publicado.',
  previous:{hours:before.branches.find(b=>b.id===30).hours,branchHours:before.branchHours.filter(h=>h.branch_id===30),hoursRows:before.hours.filter(h=>h.branch_id===30)},
  proposed:{hours:branch.hours,branchHours:next.branchHours.filter(h=>h.branch_id===30)},
  applied:false};
fs.writeFileSync(`${folder}/hours-candidate.json`, JSON.stringify(next,null,2)+'\n');
if (process.argv.includes('--apply')) {
  assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent catalog change');
  fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
  report.applied=true;
}
fs.writeFileSync(`${folder}/hours-correction.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({applied:report.applied,hours:branch.hours,scope:'Only branch 30 schedule fields and its weekly rows'},null,2));

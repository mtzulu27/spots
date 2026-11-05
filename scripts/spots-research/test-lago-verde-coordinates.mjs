import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = path.join(root, 'apps/mobile/public/spots-catalog.json');
const evidenceDir = path.join(root, 'docs/catalog-review/lago-verde-coordinates-20261101');
const backupPath = path.join(evidenceDir, 'local-coordinate-test.json');
const mode = process.argv[2];
assert.ok(['apply', 'restore'].includes(mode), 'Use apply or restore');
const text = await fs.readFile(catalogPath, 'utf8');
const catalog = JSON.parse(text);
const original = structuredClone(catalog);
const fields = ['latitude', 'longitude'];
const selected = new Map([
  [66,0],[85,0],[92,0],[1931,0],[5118,1],[5152,0],[5161,0],
  [5163,0],[5199,0],[5229,0],[5232,0],[5239,0],[5241,0],
  [86,0],[87,0],[93,0],[1932,0],[1934,0],[1936,0],[1937,0],
  [1940,0],[5119,0],[5154,0],[5242,3],[5243,0],
]);
const pair = b => Object.fromEntries(fields.map(k => [k, b[k] ?? null]));
function stats(c) {
  const spots = new Map(c.spots.map(s => [s.id,s]));
  const active = c.branches.filter(b => /lago\s*verde/i.test(b.mall || '') && b.is_active !== false
    && b.business_status !== 'permanently_closed' && spots.get(b.spot_id)?.is_active !== false
    && spots.get(b.spot_id)?.business_status !== 'permanently_closed');
  const located = active.filter(b => fields.every(k => Number.isFinite(b[k])));
  const groups = new Map();
  for (const b of located) {
    const key = fields.map(k => b[k].toFixed(7)).join(',');
    groups.set(key, [...(groups.get(key) || []), b.id]);
  }
  return {active:active.length, located:located.length, distinctPoints:groups.size,
    coincidentGroups:[...groups.values()].filter(ids => ids.length > 1)};
}
let changes;
if (mode === 'apply') {
  const audit = JSON.parse(await fs.readFile(path.join(evidenceDir,'audit.json'),'utf8'));
  changes = [...selected].map(([id,index]) => {
    const r = audit.rows.find(r => r.branchId === id);
    const b = catalog.branches.find(b => b.id === id);
    assert.ok(r && b && /lago\s*verde/i.test(b.mall || ''), `Missing branch ${id}`);
    assert.deepEqual(pair(b), pair(r.current), `Coordinates changed since audit: ${id}`);
    const c = r.candidates[index];
    assert.ok(fields.every(k => Number.isFinite(c[k])), `Invalid candidate ${id}`);
    return {id, slug:b.slug, before:pair(b), after:Object.fromEntries(fields.map(k => [k,Number(c[k].toFixed(7))])),
      candidatePlaceId:c.placeId, candidateName:c.name};
  });
  // Exclusive creation prevents overwriting the original rollback values on a second run.
  await fs.writeFile(backupPath, JSON.stringify({purpose:'Temporary local comparison only. Not approved for production.',
    appliedAt:new Date().toISOString(), changes}, null, 2)+'\n', {flag:'wx'});
} else {
  const backup = JSON.parse(await fs.readFile(backupPath,'utf8'));
  assert.ok(!backup.restoredAt, 'Already restored');
  changes = backup.changes;
}
for (const change of changes) {
  const b = catalog.branches.find(b => b.id === change.id);
  assert.ok(b, `Missing branch ${change.id}`);
  assert.deepEqual(pair(b), mode === 'apply' ? change.before : change.after, `Refusing to overwrite newer coordinates: ${change.id}`);
  Object.assign(b, mode === 'apply' ? change.after : change.before);
}
const control = structuredClone(catalog);
for (const change of changes) Object.assign(control.branches.find(b => b.id === change.id), mode === 'apply' ? change.before : change.after);
assert.deepEqual(control, original, 'Non-coordinate data changed');
assert.equal(await fs.readFile(catalogPath,'utf8'),text,'Catalog changed concurrently');
await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
assert.deepEqual(JSON.parse(await fs.readFile(catalogPath,'utf8')), catalog);
if (mode === 'restore') {
  const backup = JSON.parse(await fs.readFile(backupPath,'utf8'));
  backup.restoredAt = new Date().toISOString();
  await fs.writeFile(backupPath,JSON.stringify(backup,null,2)+'\n');
}
console.log(JSON.stringify({mode, selected:changes.length,
  changed:changes.filter(c=>JSON.stringify(c.before)!==JSON.stringify(c.after)).length,
  before:stats(original),after:stats(catalog),rollback:backupPath},null,2));

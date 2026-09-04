import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectCatalog, diffCatalog, mergeEvents } from '../lib/catalog-updates/engine.mjs';
const catalog = () => ({ spots: [{ id: 1, type: 'place', name: 'Lugar', slug: 'lugar', is_active: true, updated_at: 'old', category: 'Comida' }], branches: [{ id: 10, spot_id: 1, slug: 'lugar-centro', is_active: true, min_budget: 10000, hours: 'Lun 9-17' }], branchHours: [] });
const when = '2026-09-04T14:00:00Z';
const changes = (a, b) => diffCatalog(projectCatalog(a), projectCatalog(b), when);
test('first visit and unchanged catalog produce no fake new places', () => {
  assert.deepEqual(diffCatalog(null, projectCatalog(catalog()), when), []);
  assert.deepEqual(changes(catalog(), catalog()), []);
});
test('timestamps, likes and editorial/audit flags are not updates', () => {
  const next = catalog(); Object.assign(next.spots[0], { updated_at: 'new', likes: 100, editorial_badge: 'verified' });
  assert.deepEqual(changes(catalog(), next), []);
});
test('real schedule, price and menu changes coalesce by branch', () => {
  const next = catalog(); Object.assign(next.branches[0], { hours: 'Lun 9-20', min_budget: 20000, menu_url: 'https://example.com/menu' });
  const [event] = changes(catalog(), next);
  assert.equal(event.type, 'updatedPlace'); assert.deepEqual(event.fields, ['horarios', 'presupuesto', 'menú']);
  assert.equal(event.branchId, 10); assert.equal(event.occurredAt, when);
});
test('weekly hours detected; metadata-only rows ignored', () => {
  const next = catalog(); next.branchHours.push({ id: 1, branch_id: 10, day_of_week: 1, open_time: '09:00', close_time: '18:00' });
  assert.deepEqual(changes(catalog(), next)[0].fields, ['horarios']);
  const old = structuredClone(next); next.branchHours[0].id = 999;
  assert.deepEqual(changes(old, next), []);
});
test('draft removal never claims business closure', () => {
  const next = catalog(); next.spots[0].is_active = false;
  assert.deepEqual(changes(catalog(), next), []);
});
test('new location distinguished from first public place', () => {
  const next = catalog(); next.branches.push({ ...next.branches[0], id: 11, slug: 'lugar-sur' });
  assert.equal(changes(catalog(), next)[0].type, 'newBranch');
  assert.equal(changes({ spots: [], branches: [] }, catalog())[0].type, 'newPlace');
});
test('new unpublished data does not notify', () => {
  const next = catalog(); next.branches[0].is_active = false;
  assert.deepEqual(changes({ spots: [], branches: [] }, next), []);
});
test('same transition has a stable id and is deduplicated across publication and reload', () => {
  const next = catalog(); next.branches[0].hours = 'Lun 10-18';
  const first = changes(catalog(), next); const second = diffCatalog(projectCatalog(catalog()), projectCatalog(next), '2026-09-05T12:00:00Z');
  assert.equal(first[0].id, second[0].id);
  assert.equal(mergeEvents(first, second).length, 1);
  assert.equal(mergeEvents(first, second)[0].occurredAt, when);
});
test('parches do not enter the place feed', () => {
  const next = catalog(); next.spots[0].type = 'event';
  assert.deepEqual(projectCatalog(next), {});
});
test('malformed catalog cannot silently erase the baseline', () => {
  assert.throws(() => projectCatalog({ error: 'offline' }));
});

test('successive updates and branches of a place condense, preserving the first ID', () => {
  const next = catalog(); next.branches[0].hours = 'Lun 10-18';
  const [first] = changes(catalog(), next);
  const second = { ...first, id: 'second', branchId: 11, occurredAt: '2026-09-04T16:00:00Z', fields: ['fotos'] };
  const merged = mergeEvents([first], [second]);
  assert.equal(merged.length, 1); assert.equal(merged[0].id, first.id);
  assert.deepEqual(merged[0].fields, ['horarios', 'fotos']);
  assert.equal(merged[0].occurredAt, second.occurredAt);
  assert.equal(mergeEvents(merged, [first, second]).length, 1);
});
test('a new notification starts after 24 hours, without a sliding window', () => {
  const next = catalog(); next.branches[0].hours = 'Lun 10-18';
  const [first] = changes(catalog(), next);
  const near = { ...first, id: 'near', occurredAt: '2026-09-05T13:00:00Z' };
  const later = { ...first, id: 'later', occurredAt: '2026-09-05T14:00:00Z' };
  assert.equal(mergeEvents([first, near, later]).length, 2);
  assert.equal(mergeEvents([first, { ...near, spotId: 2 }]).length, 2);
});

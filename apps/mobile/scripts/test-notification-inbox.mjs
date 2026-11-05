import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotificationIds, collectNotificationIds, isNotificationDismissed, updateNotificationIds } from '../lib/notification-inbox.mjs';

test('stored IDs validate independently and recover from corrupt storage', () => {
  assert.deepEqual([...parseNotificationIds('["a",3,null,"a","b"]')], ['a','b']);
  for (const raw of [null,'broken','{}']) assert.equal(parseNotificationIds(raw).size,0);
});
test('bulk operations cover history beyond the first 40 rows', () => {
  const events=Array.from({length:120},(_,i)=>({id:`event-${i}`}));
  const ids=collectNotificationIds(events);
  const read=updateNotificationIds(new Set(),ids,true);
  assert.equal(read.size,120);
  assert.equal(events.filter(event=>!read.has(event.id)).length,0);
});
test('clear covers grouped IDs without deleting event history or new notifications', () => {
  const events=[{id:'group',memberIds:['a','b']},{id:'other'}];
  const original=JSON.stringify(events);
  const dismissed=new Set(collectNotificationIds(events));
  assert.equal(events.filter(event=>!isNotificationDismissed(event,dismissed)).length,0);
  assert.equal(isNotificationDismissed({id:'new-group',memberIds:['b']},dismissed),true);
  assert.equal(isNotificationDismissed({id:'future-event'},dismissed),false);
  assert.equal(JSON.stringify(events),original);
});
test('clear survives reload; undo preserves previously dismissed entries', () => {
  const before=new Set(['previous']);
  const ids=['a','b'];
  const after=updateNotificationIds(before,ids,true);
  const reloaded=parseNotificationIds(JSON.stringify([...after]));
  assert.equal(isNotificationDismissed({id:'a'},reloaded),true);
  assert.deepEqual([...updateNotificationIds(reloaded,ids,false)],['previous']);
  assert.deepEqual([...before],['previous']);
});

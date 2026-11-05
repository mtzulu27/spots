import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationGroup, notificationTime } from '../lib/notification-display.mjs';

const now = new Date('2026-10-31T04:30:00Z');
test('groups by Colombian calendar day, including UTC midnight', () => {
  assert.equal(notificationGroup('2026-10-31T03:25:00Z', now), 'Hoy');
  assert.equal(notificationGroup('2026-10-30T04:59:00Z', now), 'Ayer');
  assert.equal(notificationGroup('2026-10-28T12:00:00Z', now), 'Esta semana');
  assert.equal(notificationGroup('2026-10-20T12:00:00Z', now), 'Anteriores');
});
test('invalid and future dates are safe', () => {
  assert.equal(notificationGroup('not a date', now), null);
  assert.equal(notificationTime('not a date', now), '');
  assert.equal(notificationTime('2026-11-01T00:00:00Z', now), 'Ahora');
});
test('compact relative timestamps', () => {
  assert.equal(notificationTime('2026-10-31T04:29:45Z', now), 'Ahora');
  assert.equal(notificationTime('2026-10-31T04:25:00Z', now), '5 min');
  assert.equal(notificationTime('2026-10-31T02:30:00Z', now), '2 h');
  assert.equal(notificationTime('2026-10-30T04:30:00Z', now), '1 d');
  assert.match(notificationTime('2026-10-01T12:00:00Z', now), /1.*oct/);
});

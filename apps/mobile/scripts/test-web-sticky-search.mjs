import test from 'node:test';
import assert from 'node:assert/strict';
import { observeStickySearch } from '../lib/web-sticky-search.mjs';

function harness(scrollTop = 0) {
  const windowTarget = new EventTarget();
  const doc = new EventTarget();
  const viewport = Object.assign(new EventTarget(), { scrollTop, clientHeight: 844, isConnected: true, getBoundingClientRect: () => ({ top: 0 }) });
  let visible = true;
  let profileBottom = 74.5;
  const profile = { isConnected: true, parentElement: {}, getClientRects: () => visible ? [{}] : [], getBoundingClientRect: () => ({ bottom: visible ? profileBottom - viewport.scrollTop : 0, height: visible ? 42.5 : 0 }) };
  const frames = new Map();
  let sequence = 0;
  let resize;
  let disconnected = false;
  const environment = {
    document: doc,
    getComputedStyle: () => ({ rowGap: '28px' }),
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() { disconnected = true; } },
  };
  const values = [];
  const stop = observeStickySearch({ viewport, profile, environment, onChange: value => values.push(value) });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  return { viewport, values, stop, flush, frames, resize: () => resize(), hide: value => { visible = !value; }, bottom: value => { profileBottom = value; }, windowTarget, doc, disconnected: () => disconnected };
}

test('initial and scrolling states use natural profile threshold', () => {
  const h = harness();
  assert.equal(h.values.at(-1), false);
  h.viewport.scrollTop = 844;
  h.viewport.dispatchEvent(new Event('scroll'));
  h.flush();
  assert.equal(h.values.at(-1), true);
  h.viewport.scrollTop = 50;
  h.viewport.dispatchEvent(new Event('scroll'));
  h.flush();
  assert.equal(h.values.at(-1), false);
  h.stop();
});
test('restored tab is already sticky without a new layout or scroll event', () => {
  const h = harness(844);
  assert.equal(h.values[0], true);
  h.flush();
  assert.equal(h.values.at(-1), true);
  h.stop();
});
test('hidden layouts do not erase sticky state; resize and restoration resync', () => {
  const h = harness(844);
  h.hide(true);
  h.resize(); h.flush();
  assert.equal(h.values.at(-1), true);
  h.hide(false);
  h.viewport.scrollTop = 0;
  h.resize(); h.flush();
  assert.equal(h.values.at(-1), false);
  h.viewport.scrollTop = 844;
  h.windowTarget.dispatchEvent(new Event('pageshow')); h.flush();
  assert.equal(h.values.at(-1), true);
  h.stop();
});
test('profile size changes move the threshold without measuring pinned geometry', () => {
  const h = harness(110);
  assert.equal(h.values.at(-1), true);
  h.bottom(120); h.resize(); h.flush();
  assert.equal(h.values.at(-1), false);
  h.stop();
});
test('cleanup cancels pending work and removes subscriptions', () => {
  const h = harness();
  h.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.disconnected(), true);
  const count = h.values.length;
  h.viewport.scrollTop = 844;
  h.viewport.dispatchEvent(new Event('scroll'));
  h.windowTarget.dispatchEvent(new Event('focus'));
  h.doc.dispatchEvent(new Event('visibilitychange'));
  h.flush();
  assert.equal(h.values.length, count);
});

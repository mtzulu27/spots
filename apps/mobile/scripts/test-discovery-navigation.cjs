const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../components/discovery-navigation.tsx'), 'utf8');
const declaration = source.match(/const destinations = ([\s\S]*?) as const;/)[1];
const compiled = ts.transpileModule(`export const destinations = ${declaration};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const api = { exports: {} };
new Function('exports', compiled)(api.exports);
const { destinations } = api.exports;

test('four visible destinations retain their order and callbacks', () => {
  assert.deepEqual(destinations.map(([id]) => id), ['explore', 'map', 'contribute', 'account']);
  assert.deepEqual(destinations.map(([, , , callback]) => callback), ['onExplore', 'onMap', 'onContribute', 'onAccount']);
  assert.equal(destinations.some(([, icon]) => icon === 'ticket-outline'), false);
});

test('account occupies the final visible slot and Parches is not selected', () => {
  assert.equal(destinations.findIndex(([id]) => id === 'account'), 3);
  assert.equal(destinations.findIndex(([id]) => id === 'parches'), -1);
  assert.match(source, /if \(index < 0\) return;/);
  assert.match(source, /opacity: activeIndex < 0 \? 0 : 1/);
});

test('both indicator tracks use the visible count instead of five-tab coordinates', () => {
  assert.match(source, /const lastIndex = tabs.length - 1/);
  assert.match(source, /inputRange: \[0, lastIndex\]/);
  assert.match(source, /step \* \(lastIndex \+ 0.5\)/);
  assert.match(source, /const step = \(navWidth - 16\) \/ tabs.length/);
  assert.equal((source.match(/tabs.map\(/g) || []).length, 2);
});

test('persistent surface and interrupted-animation retargeting remain intact', () => {
  assert.match(source, /webRoot.render\(<NavigationSurface/);
  assert.match(source, /queueMicrotask\(/);
  assert.match(source, /getComputedStyle\(cursor\).transform/);
  assert.match(source, /webAnimations.current.forEach\(animation => animation.cancel\(\)\)/);
  assert.match(source, /moveTo\(index\); onPress\(\)/);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../lib/people-label.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', 'module', compiled)(loaded.exports, loaded);
const { formatPeopleLabel: label } = loaded.exports;
for (const max of [undefined, null, NaN, Infinity, 0, -1, 1.5]) {
  assert.equal(label(undefined, max, true), 'Por definir');
}
assert.equal(label(2, 6, true), '2-6 personas');
assert.equal(label(2, 6), '2-6');
assert.equal(label(undefined, 6, true), '1-6 personas');
assert.equal(label(1, 1, true), '1 persona');
assert.equal(label(6, 2, true), 'Por definir');
assert.equal(label(NaN, 6, true), 'Por definir');
console.log('13 people label checks passed');

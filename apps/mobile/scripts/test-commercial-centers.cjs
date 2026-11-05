const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../lib', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(module.exports, id => id.startsWith('@/lib/') ? load(id.slice(6)) : require(id), module);
  return module.exports;
}
const { findRegisteredCommercialCenter } = load('commercial-centers');
const { normalizeCommercialCenterLabel } = load('mock-spots');
const filters = load('explore-filters');
for (const alias of ['Ibiza 122 Food Mall', 'Ibiza 122', 'ibiza122', ' IBIZA 122 ']) {
  assert.equal(findRegisteredCommercialCenter(alias).neighborhood, 'Pance');
  assert.equal(normalizeCommercialCenterLabel(alias), 'Ibiza 122');
}
const spot = {id: 1, type:'place', name:'Example', brandName:'Example', category:'Comida', subcategories:[], interests:[], tags:[], moods:[], city:'Cali', shortDescription:'', description:'', address:'', neighborhood:'Pance', hubName:'Ibiza 122', hours:'', maxPeople:6, minBudget:0, maxBudget:0, latitude:null, longitude:null};
for (const query of ['Ibiza 122 Food Mall', 'Ibiza 122', 'ibiza122', 'Pance Ibiza 122']) {
  assert.equal(filters.createSpotFilter(filters.DEFAULT_FILTERS, query)(spot), true, query);
  assert.equal(filters.createSpotFilter(filters.DEFAULT_FILTERS, query)({...spot, hubName:'Lago Verde'}), false, query);
}
assert.equal(normalizeCommercialCenterLabel('Parque Comercial Lago Verde'), 'Lago Verde');
assert.equal(findRegisteredCommercialCenter('Ibiza'), undefined);
console.log('Commercial center aliases, Pance association and search isolation passed.');

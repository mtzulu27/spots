const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name, override) {
  const source = fs.readFileSync(override || path.join(__dirname, '../lib', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(module.exports, id => id.startsWith('@/lib/') ? load(id.slice(6)) : require(id), module);
  return module.exports;
}
const current = load('explore-filters');
const baseline = process.argv[2] ? load('explore-filters', process.argv[2]) : current;
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/spots-catalog.json'), 'utf8'));
const brands = new Map(catalog.spots.map(s => [s.id, s]));
const spots = catalog.branches.flatMap(b => {
  const s = brands.get(b.spot_id);
  return s ? [{id:b.id, type:'place', name:s.name, brandName:s.name, category:s.category || '', subcategories:s.subcategories || [], interests:[], tags:s.tags || [], moods:s.moods || [], city:s.city || 'Cali', shortDescription:s.short_description || '', description:s.short_description || '', address:b.address || '', neighborhood:b.neighborhood || '', hubName:b.mall || '', hours:b.hours || '', maxPeople:b.max_people || 0, minBudget:b.min_budget || 0, maxBudget:b.max_budget || 0, latitude:b.latitude, longitude:b.longitude}] : [];
});
const queries = ['', 'c', 'ca', 'cafe', 'café gardenia', 'pizza', 'abierto ahora', 'Pance', 'tomar algo', 'barato', 'domingo', 'zzzzzz'];
const filters = [current.DEFAULT_FILTERS, {...current.DEFAULT_FILTERS, interests:['Comida']}, {...current.DEFAULT_FILTERS, people:4, maxBudget:60000}];
let oldMs=0, newMs=0;
for (const f of filters) for (const q of queries) {
  let start=performance.now();
  const expected=spots.filter(s=>baseline.matchesSpotToFilters(s,f,q));
  oldMs+=performance.now()-start;
  start=performance.now();
  const actual=spots.filter(current.createSpotFilter(f,q));
  newMs+=performance.now()-start;
  assert.deepEqual(actual.map(s=>s.id),expected.map(s=>s.id),q);
}
assert.equal(current.createSpotFilter(current.DEFAULT_FILTERS, 'zzzzzz')(spots[0]), false);
console.log(JSON.stringify({cases:queries.length*filters.length,places:spots.length,baselineMs:Math.round(oldMs),preparedMs:Math.round(newMs),sameResults:true}));

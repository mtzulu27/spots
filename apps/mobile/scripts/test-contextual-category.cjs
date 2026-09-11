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
const { getContextualSpotCategory, matchesSpotToFilters, DEFAULT_FILTERS } = load('explore-filters');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/spots-catalog.json'), 'utf8'));
const row = catalog.spots.find(s => s.id === 1517);
const branch = catalog.branches.find(s => s.id === 1931);
const spot = { type: 'place', category: row.category, subcategories: row.subcategories, interests: [], tags: row.tags, moods: row.moods,
  name: row.name, brandName: row.name, shortDescription: row.short_description, description: row.short_description,
  branchName: 'Lago Verde', hubName: 'Lago Verde', neighborhood: 'Pance', city: 'Cali', address: branch.address,
  hours: branch.hours, maxPeople: branch.max_people, minBudget: branch.min_budget, maxBudget: branch.max_budget };
const before = JSON.stringify(spot);
assert.equal(getContextualSpotCategory(spot), 'Comida');
assert.equal(getContextualSpotCategory(spot, ['Tomar algo']), 'Tomar algo');
assert.equal(getContextualSpotCategory(spot, ['Cocktails']), 'Tomar algo');
assert.equal(getContextualSpotCategory(spot, [], 'tomar algo'), 'Tomar algo');
assert.equal(getContextualSpotCategory(spot, [], 'cócteles'), 'Tomar algo');
assert.equal(getContextualSpotCategory(spot, [], 'Agave Azul'), 'Comida');
assert.equal(getContextualSpotCategory(spot, ['Comida', 'Tomar algo']), 'Comida');
assert.equal(getContextualSpotCategory(spot, ['Yoga']), 'Comida');
assert.equal(getContextualSpotCategory({...spot, type:'event'}, ['Tomar algo']), 'Comida');
assert.equal(matchesSpotToFilters(spot, {...DEFAULT_FILTERS, interests:['Tomar algo']}, ''), true);
assert.equal(JSON.stringify(spot), before);
console.log('11 contextual category checks passed, including Agave Azul and unchanged primary category');

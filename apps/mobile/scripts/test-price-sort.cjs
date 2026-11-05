const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../lib/explore-filters.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('exports','require','module',compiled)(loaded.exports, () => ({}), loaded);
const {sortSpots, formatApproxBudgetPerPersonLabel} = loaded.exports;
const spots = [
  {id:'typical',minBudget:10000,maxBudget:70000,typicalBudget:60000},
  {id:'min',minBudget:30000,maxBudget:80000},
  {id:'max-only',minBudget:0,maxBudget:40000},
  {id:'unknown',minBudget:0,maxBudget:0},
  {id:'invalid',minBudget:NaN,maxBudget:Infinity,typicalBudget:NaN},
  {id:'tie',minBudget:30000,maxBudget:50000},
];
assert.deepEqual(sortSpots(spots,'priceAsc').map(s=>s.id),['min','tie','max-only','typical','unknown','invalid']);
assert.deepEqual(sortSpots(spots,'priceDesc').map(s=>s.id),['typical','max-only','min','tie','unknown','invalid']);
assert.equal(spots[0].id,'typical');
assert.equal(formatApproxBudgetPerPersonLabel(10000,70000,60000),'~$60.000 COP / pers.');
assert.equal(formatApproxBudgetPerPersonLabel(0,40000),'~$40.000 COP / pers.');
assert.equal(formatApproxBudgetPerPersonLabel(NaN,Infinity),'Por definir');
console.log('6 price sorting and label regression checks passed');

const ranking = {exports:{}};
const rankingSource = fs.readFileSync(path.join(__dirname,'../lib/discovery-ranking.ts'),'utf8');
new Function('exports','require','module',ts.transpileModule(rankingSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(ranking.exports, id => id.includes('explore-filters') ? loaded.exports : {}, ranking);
const reported = [
  {id:'alma',minBudget:60000,maxBudget:60000},
  {id:'cofi',minBudget:0,maxBudget:0},
  {id:'brunch',minBudget:16000,maxBudget:18000},
  {id:'cappriato',minBudget:57000,maxBudget:57000},
];
assert.deepEqual(ranking.exports.rankSearchResults(reported,'',new Date(),'priceDesc').map(s=>s.id),['alma','cappriato','brunch','cofi']);
assert.deepEqual(ranking.exports.rankSearchResults(reported,'',new Date(),'priceAsc').map(s=>s.id),['brunch','cappriato','alma','cofi']);
console.log('2 rendered search pipeline regression checks passed');

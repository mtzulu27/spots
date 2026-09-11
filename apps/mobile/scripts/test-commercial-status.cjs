const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  if (name === 'supabase') return { backendEnabled:false };
  if (name === 'public-json-cache') return {};
  const base = path.join(__dirname,'../lib',name);
  const source = fs.readFileSync(fs.existsSync(base+'.ts') ? base+'.ts' : base+'.tsx','utf8');
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports:{}};
  cache.set(name,module.exports);
  new Function('exports','require','module',compiled)(module.exports,id => {
    if (id === 'react-native') return {Platform:{OS:'web'}};
    if (id.startsWith('@/lib/')) return load(id.slice(6));
    if (id.startsWith('./')) return load(id.slice(2));
    return require(id);
  },module);
  return module.exports;
}
const {mapRowsToSpots} = load('spots-store');
const {aggregatePlaceBranches} = load('mock-spots');
const {getDiscoveryStatus,rankDiscovery,rankSearchResults} = load('discovery-ranking');
const {getOpenStatusFromSchedule} = load('schedule-status');
const {isSpotOpenNow,matchesSpotToFilters,DEFAULT_FILTERS} = load('explore-filters');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/spots-catalog.json'),'utf8'));
const rows = catalog.spots.filter(s=>s.id===35);
const branches = catalog.branches.filter(b=>b.spot_id===35);
const spots = mapRowsToSpots(rows,branches,catalog.branchHours);
// Missing optional location labels must not abort refresh of the whole catalog.
for (const missing of [undefined, null, '']) {
  const sparse = branches.map(b => b.id === 42 ? {...b, neighborhood:missing, mall:missing} : b);
  const mapped = mapRowsToSpots(rows,sparse,catalog.branchHours);
  assert.equal(mapped.length,spots.length);
  const target = mapped.find(s=>s.branchId===42);
  assert.equal(target.neighborhood,'');
  assert.equal(target.hubName,'');
  assert.equal(target.typicalBudget,spots.find(s=>s.branchId===42).typicalBudget);
}
assert.doesNotThrow(()=>mapRowsToSpots(catalog.spots,catalog.branches,catalog.branchHours));
assert.equal(spots.length,8);
const temporary = spots.find(s=>s.id==='chilitaco-mallplaza');
assert.equal(temporary.businessStatus,'temporarily_closed');
assert.equal(spots.find(s=>s.id==='chilitaco-llanogrande').city,'Palmira');
const monday = new Date('2026-09-07T18:00:00Z');
assert.equal(getDiscoveryStatus(temporary,monday).label,'Cerrado temporalmente');
assert.equal(getOpenStatusFromSchedule(temporary.hours,new Date('2026-09-07T13:00:00'),temporary.businessStatus).tone,'closed');
assert.equal(isSpotOpenNow(temporary),false);
assert.equal(matchesSpotToFilters(temporary,{...DEFAULT_FILTERS,days:['Lun']},''),false);
const aggregate = aggregatePlaceBranches(spots);
assert.equal(aggregate.businessStatus,'operational');
assert.equal(getDiscoveryStatus(aggregate,monday).availability,0);
assert.equal(aggregatePlaceBranches([temporary]).businessStatus,'temporarily_closed');
// Identical schedule strings with different commercial status must not collide in ranking caches.
const open = {...temporary,id:'open-fixture',businessStatus:'operational'};
assert.equal(rankSearchResults([temporary,open],'',monday)[0].id,open.id);
assert.equal(rankDiscovery([temporary,open],null,'',monday).today[0].spot.id,open.id);
assert.equal(mapRowsToSpots(rows,branches.map(b=>({...b,business_status:'permanently_closed'})),[]).length,0);
assert.equal(mapRowsToSpots(rows.map(s=>({...s,business_status:'permanently_closed'})),branches,[]).length,0);
assert.equal(mapRowsToSpots(rows,branches.map(b=>b.id===temporary.branchId?{...b,business_status:'permanently_closed'}:b),[]).length,7);
assert.ok(mapRowsToSpots(rows.map(s=>({...s,business_status:'temporarily_closed'})),branches,[]).every(s=>s.businessStatus==='temporarily_closed'));
assert.equal(catalog.branchHours.filter(h=>branches.some(b=>b.id===h.branch_id)).length,56);
assert.ok(branches.every(b=>b.holiday_mode==='custom'&&b.google_maps_url&&b.latitude&&b.longitude));
console.log('Commercial-status, optional location labels and full-catalog mapping checks passed');

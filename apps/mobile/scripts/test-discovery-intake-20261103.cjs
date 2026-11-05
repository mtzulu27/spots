const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  if(name==='supabase')return {backendEnabled:false};
  if(name==='public-json-cache')return {};
  const base=path.join(__dirname,'../lib',name);
  const source=fs.readFileSync(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx','utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module={exports:{}};cache.set(name,module.exports);
  new Function('exports','require','module',compiled)(module.exports,id=>{
    if(id==='react-native')return {Platform:{OS:'web'}};
    if(id.startsWith('@/lib/'))return load(id.slice(6));
    if(id.startsWith('./'))return load(id.slice(2));
    return require(id);
  },module);
  return module.exports;
}
const root=path.join(__dirname,'../../../docs/catalog-review/discovery/profiles-20261102');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/spots-catalog.json'),'utf8'));
const queue=JSON.parse(fs.readFileSync(path.join(root,'progress.json'),'utf8')).startedScope;
const {mapRowsToSpots}=load('spots-store');
const {scenarioBudget}=load('budget-scenarios');
const {getDiscoveryStatus}=load('discovery-ranking');
const mapped=mapRowsToSpots(catalog.spots,catalog.branches,catalog.branchHours);
const scope=new Set();
for(const record of queue){
  const spot=record.username==='primitivorooftop'?catalog.spots.find(s=>s.slug==='primitivo-sensorial'):catalog.spots.find(s=>s.instagram===record.instagram||record.matches.some(m=>m.id===s.id));
  assert.ok(spot,`Missing catalog identity: ${record.username}`);
  assert.ok(!scope.has(spot.id),`Duplicate intake identity: ${record.username}`);scope.add(spot.id);
  assert.ok(mapped.some(s=>s.spotId===spot.id),`Not exposed by app adapter: ${spot.name}`);
}
assert.equal(scope.size,28);
const napa=mapped.find(s=>s.placeSlug==='la-napa');
assert.equal(napa.businessStatus,'temporarily_closed');
assert.equal(getDiscoveryStatus(napa,new Date()).label,'Cerrado temporalmente');
assert.equal(napa.maxPeople,0,'A branchless place must not invent a one-person capacity');
assert.equal(napa.instagram,'https://www.instagram.com/lanapacali/');
assert.equal(load('people-label').formatPeopleLabel(napa.minPeople,napa.maxPeople,true),'Por definir');
const yulikaGranada=catalog.branches.find(b=>b.slug==='yulika-granada');
assert.equal(yulikaGranada.address,'Avenida 9A #17N-12, Granada, Cali');
assert.equal(yulikaGranada.latitude,3.4619);
assert.equal(catalog.branchHours.filter(h=>h.branch_id===yulikaGranada.id).length,6);
assert.ok(!catalog.branchHours.some(h=>h.branch_id===yulikaGranada.id&&h.day_of_week===1),'Unknown Monday must not be fabricated');
for(const slug of ['yulika-pance','yulika-unicentro']){
  const b=catalog.branches.find(b=>b.slug===slug);
  assert.equal(b.latitude,null,'Granada coordinates must not spread to sibling branches');
  assert.equal(b.longitude,null);
}
const legend=catalog.branches.find(b=>b.slug==='the-pub-legend-granada');
assert.ok(legend.menu_url.startsWith('https://menupp.co/legendbar/'));
assert.equal(legend.min_budget,22950);
for(const slug of ['la-fugitiva-granada','la-fugitiva-dapa']){
  const branch=catalog.branches.find(b=>b.slug===slug);
  const copa=branch.menu_items.find(i=>i.name==='Copa de Vino'&&i.category==='drinks');
  assert.equal(copa?.price,12000,`${slug}: scalar Menupp prices must not be discarded`);
  assert.ok(branch.menu_items.some(i=>i.name==='Calabacín'&&i.price===5000));
  assert.equal(branch.min_budget,50000,'Inventory completion must preserve the reviewed scenario');
}
assert.ok(catalog.branches.find(b=>b.slug==='palo-mulata-san-antonio').menu_items.some(i=>i.name==='Campari'&&i.price===12000));
let menus=0;
for(const branch of catalog.branches.filter(b=>scope.has(b.spot_id)&&b.menu_items_verified_at?.startsWith('2026-11-03'))){
  assert.equal(branch.budget_scenarios.length,3,branch.slug);
  const budgets=branch.budget_scenarios.map(s=>scenarioBudget(branch.menu_items,2,s).perPerson);
  assert.equal(branch.min_budget,budgets[0],branch.slug);
  assert.equal(branch.typical_budget,budgets[0],branch.slug);
  assert.equal(branch.max_budget,budgets[2],branch.slug);
  assert.ok(budgets[0]<budgets[1]&&budgets[1]<budgets[2],branch.slug);
  for(const people of [1,3,5,8])for(const scenario of branch.budget_scenarios)assert.ok(scenarioBudget(branch.menu_items,people,scenario).total>0,branch.slug);
  menus++;
}
assert.ok(menus>=20,'Reviewed menus must not silently disappear');
for(const s of catalog.spots.filter(s=>scope.has(s.id)&&s.logo_url?.startsWith('/place-media/'))){
  assert.ok(fs.existsSync(path.join(__dirname,'../public',s.logo_url)),`Missing logo asset: ${s.name}`);
}
console.log(JSON.stringify({visibleIntakePlaces:scope.size,reviewedBranchMenus:menus,temporaryClosureBadge:'verified',budgetEngine:'verified_for_1_2_3_5_8_people'}));

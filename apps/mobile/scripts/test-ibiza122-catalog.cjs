const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(__dirname, '../lib', `${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  const module = {exports: {}};
  new Function('exports', 'require', 'module', code)(module.exports, id => id.startsWith('@/lib/') ? load(id.slice(6)) : require(id), module);
  cache.set(name, module.exports);
  return module.exports;
}
const {scenarioBudget} = load('budget-scenarios');
const filters = load('explore-filters');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/spots-catalog.json')));
const handles = ['somos.braun', 'constantinapizzeria', 'bonnepasteleria', 'zakanirestaurante', 'restaurantevoltaire', 'brazzburger', 'el_santo_taqueria', 'lorsoristorantecali', 'premierwings.co', 'dcirilococinaperuana', 'dejamusubachoque'];
const spots = catalog.spots.filter(s => handles.includes(s.instagram?.split('/').filter(Boolean).at(-1)));
assert.equal(spots.length, 11);
let branchCount = 0, calculatorCount = 0, ibizaCount = 0;
for (const spot of spots) {
  assert.equal(spot.is_active, true);
  assert.equal(typeof spot.likes, 'string');
  assert.ok(spot.logo_url && fs.existsSync(path.join(__dirname, '../public', spot.logo_url)));
  assert.notEqual(spot.cover_image_url, spot.logo_url, 'Never use the logo as a cover');
  const branches = catalog.branches.filter(b => b.spot_id === spot.id);
  for (const branch of branches) {
    branchCount++;
    assert.equal(branch.is_active, true);
    assert.ok(['Cali', 'Palmira'].includes(branch.city));
    if (branch.mall === 'Ibiza 122') ibizaCount++;
    const view = {id: branch.slug, type: 'place', name: spot.name, brandName: spot.name, category: 'Comida', subcategories: [], interests: [], tags: [], moods: [],
      city: branch.city, shortDescription: spot.short_description, description: spot.short_description, address: branch.address,
      neighborhood: branch.neighborhood, hubName: branch.mall, hours: branch.hours, maxPeople: 0, minBudget: branch.min_budget, maxBudget: branch.max_budget,
      businessStatus: branch.business_status, latitude: branch.latitude, longitude: branch.longitude};
    assert.equal(filters.createSpotFilter(filters.DEFAULT_FILTERS, '')(view), true, `Hidden from default feed: ${branch.slug}`);
    if (branch.business_status === 'unknown' || branch.business_status === 'temporarily_closed') assert.equal(filters.isSpotOpenNow(view), false, branch.slug);
    if (branch.budget_scenarios.length) {
      calculatorCount++;
      assert.deepEqual(branch.budget_scenarios.map(s => s.concept), ['Parche tranqui', 'Parche completo', 'Con toda']);
      const amounts = branch.budget_scenarios.map(s => scenarioBudget(branch.menu_items, 2, s).perPerson);
      assert.ok(amounts.every(Number.isFinite));
      assert.ok(amounts[0] < amounts[1] && amounts[1] < amounts[2]);
      assert.equal(branch.min_budget, amounts[0]);
      assert.equal(branch.typical_budget, amounts[0]);
      assert.equal(branch.max_budget, amounts[2]);
    } else {
      assert.equal(branch.min_budget, 0);
      assert.equal(branch.typical_budget, 0);
      assert.equal(branch.max_budget, 0);
      assert.equal(branch.budget_basis, 'Presupuesto por confirmar');
    }
  }
}
assert.equal(branchCount, 25);
assert.equal(ibizaCount, 11);
assert.equal(calculatorCount, 13);
console.log('11 unique brands, 25 visible branches, 11 Ibiza branches, 11 local logos, 13 exact calculators; unconfirmed openings never show open.');

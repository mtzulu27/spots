const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = process.cwd();
const appRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const ts = appRequire('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  if (name === 'supabase') return { backendEnabled: false };
  if (name === 'public-json-cache') return {};
  const base = path.join(root, 'apps/mobile/lib', name);
  const file = fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx';
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function('exports', 'require', 'module', compiled)(module.exports, id => {
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id.startsWith('@/lib/')) return load(id.slice(6));
    if (id.startsWith('./')) return load(id.slice(2));
    return appRequire(id);
  }, module);
  return module.exports;
}
const catalogPath = path.join(root, 'apps/mobile/public/spots-catalog.json');
const raw = fs.readFileSync(catalogPath, 'utf8');
const c = JSON.parse(raw);
const s = c.spots.find(s => s.id === 3650);
const branches = c.branches.filter(b => b.spot_id === 3650);
assert.equal(s.slug, 'don-samuel');
assert.equal(branches.length, 1);
const b = branches[0];
assert.equal(b.id, 5136);
assert.equal(b.neighborhood, 'Pance');
assert.equal(b.mall, 'Parque Comercial Lago Verde');
assert.equal(b.whatsapp, 'https://wa.me/573337002181');
assert.equal(b.business_status, 'unknown');
assert.equal(b.is_active, false);
assert.equal(b.latitude, null);
assert.equal(b.longitude, null);
assert.equal(b.google_maps_url, '');
assert.equal(b.hours, '');
assert.equal(c.branchHours.filter(h => h.branch_id === b.id).length, 0);
assert.equal((c.hours || []).filter(h => h.branch_id === b.id).length, 0);
assert.equal(b.menu_items.length, 41);
assert.ok(b.menu_items.every(i => i.price > 0 && i.currency === 'COP' && i.calculationIncluded === false));
assert.deepEqual(b.budget_scenarios, []);
assert.equal(b.min_budget, 0);
assert.equal(b.max_budget, 0);
assert.equal(b.typical_budget, 0);
assert.equal(b.budget_basis, 'Presupuesto por confirmar');
assert.equal(new Set(s.gallery_urls).size, 3);
const media = [s.logo_url, ...s.gallery_urls].map(url => {
  const bytes = fs.readFileSync(path.join(root, 'apps/mobile/public', url));
  assert.ok(bytes.length > 0);
  return { url, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
const { mapRowsToSpots } = load('spots-store');
const all = mapRowsToSpots(c.spots, c.branches, c.branchHours);
assert.ok(!all.some(p => p.spotId === 3650 || p.branchId === 5136));
const { scenarioBudget } = load('budget-scenarios');
assert.equal(scenarioBudget(b.menu_items, 2, b.budget_scenarios[0]).total, null);
const report = {
  checkedAt: new Date().toISOString(), status: 'passed',
  catalogSha256: crypto.createHash('sha256').update(raw).digest('hex'),
  ids: { place: s.id, branches: branches.map(b => b.id) },
  fields: 'Persisted local values match consolidated reviewed fields; identity and branch preserved.',
  visibility: 'Actual mapRowsToSpots adapter omits the inactive historical branch and does not synthesize a branchless place.',
  mappedBranches: all.length,
  menu: { products: new Set(b.menu_items.map(i => i.sourceProductId)).size, presentations: b.menu_items.length, visitCalculationEnabled: false },
  budget: 'Empty scenarios return null, not a zero-cost visit; explicit pending basis persisted.',
  media,
  unrelatedGeneralTest: 'test-commercial-status.cjs fails its fixed Chilitaco count (expects 8, catalog contains 7 eligible). The failed assertion concerns spot 35, not this integration.',
};
fs.writeFileSync(path.join(__dirname, 'local-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

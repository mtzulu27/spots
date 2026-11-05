const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(__dirname, '../lib', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function('exports', 'require', 'module', compiled)(module.exports, id =>
    id.endsWith('.json') ? require(path.resolve(__dirname, '../lib', id)) :
      id.startsWith('@/lib/') ? load(id.slice(6)) : id.startsWith('./') ? load(id.slice(2)) : require(id), module);
  return module.exports;
}

const { createSpotSearch, normalizeSpotSearch } = load('spot-search');
const { buildMenuSearchIndex } = load('menu-search-index');
const { createSpotFilter, createExploreSearch, DEFAULT_FILTERS } = load('explore-filters');
const { rankSearchResults } = load('discovery-ranking');
const now = new Date('2026-11-01T18:00:00Z');
function place(overrides = {}) {
  return {
    id: 'fixture', type: 'place', name: 'Local nuevo', brandName: 'Local nuevo',
    branchName: 'Sede sur', neighborhood: 'Pance', hubName: 'Lago Verde', city: 'Cali', address: '',
    category: 'Comida', subcategories: [], interests: [], tags: [], moods: [],
    description: '', shortDescription: '', hours: '', maxPeople: 6,
    minBudget: 15000, maxBudget: 25000, distanceKm: 1, feedPriorityRank: 1,
    ...overrides,
  };
}
const pottery = place({ category: 'Arte y cultura', tags: ['pintar ceramica'] });
const museum = place({ category: 'Arte y cultura', subcategories: ['Museos'] });
const matches = (spot, query, filters = DEFAULT_FILTERS, location) => createSpotFilter(filters, query, location)(spot);
const menuProduct = (overrides = {}) => ({ name: 'Producto nuevo', price: 12000, category: 'drinks',
  sourceUrl: 'https://example.com/carta', verifiedAt: '2026-11-01', ...overrides });

test('verified menus cover offerings without depending on brand tags', () => {
  const spot = place({ menuItems: [menuProduct({ name: 'Corona', menuSection: 'Cervezas' }),
    menuProduct({ name: 'Merlot', menuSection: 'Vinos' }),
    menuProduct({ name: 'Latte', menuSection: 'Bebidas calientes' }),
    menuProduct({ name: 'Pepperoni', category: 'mains', menuSection: 'Pizzas' }),
    menuProduct({ name: 'Kayak individual', category: 'tickets' })] });
  for (const query of ['cerveza', 'polas', 'vinos', 'cafe', 'pizza', 'kayak']) assert.ok(matches(spot, query), query);
  assert.equal(matches(spot, 'cerveza artesanal'), false);
  assert.ok(createSpotSearch('cerveza')(spot).fields.includes('menu'));
});

test('menu index requires source, recorded verification date and confirmed branch scope', () => {
  const spot = place({ menuItems: [menuProduct({ sourceUrl: '' }), menuProduct({ verifiedAt: '' }),
    menuProduct({ sourceScope: 'Carta de marca; aplicacion por sede pendiente de confirmacion' }),
    menuProduct({ sourceUrl: 'javascript:alert(1)' })] });
  assert.equal(buildMenuSearchIndex(spot).evidence.length, 0);
  assert.equal(buildMenuSearchIndex(spot).pending.length, 4);
  const branch = place({ menuUrl: 'https://example.com/menu', menuItemsVerifiedAt: '2026-10-01',
    menuItems: [{ name: 'Cerveza', category: 'drinks', price: 10000 }] });
  assert.ok(matches(branch, 'cerveza'));
  assert.equal(buildMenuSearchIndex(branch).evidence[0].verifiedAt, '2026-10-01');
  assert.ok(matches(place({ menuItems: [menuProduct({ name: 'Cerveza', sourceUrl: '', source_url: 'https://example.com/menu' })] }), 'cerveza'));
});

test('pricing exclusion is not unavailability, but unavailable products do not assert offers', () => {
  for (const unavailable of [{ available: false }, { availability: 'sold_out' }, { availability: 'disabled' }]) {
    assert.equal(matches(place({ menuItems: [menuProduct({ name: 'Cerveza', ...unavailable })] }), 'cerveza'), false);
  }
  assert.ok(matches(place({ menuItems: [menuProduct({ name: 'Cerveza botella para compartir', calculationIncluded: false })] }), 'cerveza'));
});

test('ingredients and mixed headings do not manufacture beverage offers', () => {
  for (const item of [menuProduct({ name: 'Pollo a la cerveza', category: 'mains' }),
    menuProduct({ name: 'Torta de café', category: 'desserts' }),
    menuProduct({ name: 'Salsa de vino', category: 'extras', menuSection: 'Adiciones' }),
    menuProduct({ name: 'Producto ambiguo', menuSection: 'Cerveza y Vino' })]) {
    for (const query of ['cerveza', 'cafe', 'vino']) assert.equal(matches(place({ menuItems: [item] }), query), false, `${item.name}: ${query}`);
  }
  assert.equal(matches(place({ menuItems: [menuProduct({ name: 'Limonada', menuSection: 'Bebidas sin café' })] }), 'cafe'), false);
});

test('menu evidence does not leak between branches or mutate source products', () => {
  const north = place({ neighborhood: 'Granada', menuItems: [menuProduct({ name: 'Cerveza' })], hubName: '' });
  const south = place({ neighborhood: 'Pance', menuItems: [], hubName: '' });
  const group = place({ branches: [north, south] });
  const before = JSON.stringify(group);
  assert.equal(matches(group, 'cerveza Pance'), false);
  assert.ok(matches(group, 'cerveza Granada'));
  assert.equal(JSON.stringify(group), before);
});

test('an alcohol-free beer query cannot be assembled from regular beer plus a mocktail', () => {
  assert.equal(matches(place({ menuItems: [menuProduct({ name: 'Cerveza' }), menuProduct({ name: 'Mocktail de lulo' })] }), 'cerveza sin alcohol'), false);
  assert.ok(matches(place({ menuItems: [menuProduct({ name: 'Cerveza sin alcohol' })] }), 'pola sin alcohol'));
});

test('empty home search does not build menu documents', () => {
  const spot = place();
  Object.defineProperty(spot, 'menuItems', { get() { throw new Error('should not scan menus'); } });
  assert.ok(createSpotSearch('')(spot).matches);
});

test('fresh exact-source evidence works without tags or a pricing transcription', () => {
  const data = require('../public/menu-search-sources.json');
  const source = Object.values(data.sources).find(source => source.sourceUrl.includes('/furtivocali/venue/'));
  assert.ok(source, 'Furtivo source was fetched and resolved');
  const spot = place({ menuUrl: source.sourceUrl, menuItems: [], tags: [] });
  assert.ok(matches(spot, 'cerveza'));
  assert.ok(matches(spot, 'vino'));
  const evidence = buildMenuSearchIndex(spot).evidence;
  assert.ok(evidence.some(product => product.name === 'Corona' && product.sourceUrl === source.sourceUrl));
  assert.equal(matches(place({ ...spot, menuUrl: 'https://example.com/other-sede' }), 'cerveza'), false);
});

test('a later verified catalog transcription supersedes an older source snapshot', () => {
  const data = require('../public/menu-search-sources.json');
  const source = Object.values(data.sources).find(source => source.sourceUrl.includes('/furtivocali/venue/'));
  const later = new Date(Date.parse(source.verifiedAt) + 86400000).toISOString();
  const spot = place({ menuUrl: source.sourceUrl, menuItems: [menuProduct({ name: 'Oferta nueva', verifiedAt: later })] });
  assert.ok(matches(spot, 'oferta nueva'));
  assert.equal(matches(spot, 'cerveza'), false);
});

test('single-location root snapshots stay bound to the reviewed catalog branch', () => {
  const data = require('../public/menu-search-sources.json');
  const entry = Object.entries(data.sources).find(([, source]) => source.scopeBranchId !== undefined);
  assert.ok(entry);
  const [menuUrl, source] = entry;
  assert.equal(buildMenuSearchIndex(place({ menuUrl, branchId: source.scopeBranchId })).evidence.length, source.products.length);
  assert.equal(buildMenuSearchIndex(place({ menuUrl, branchId: -1 })).evidence.length, 0);
});

test('normalization handles case, accents, punctuation and repeated whitespace', () => {
  assert.equal(normalizeSpotSearch('  CAFÉ—Pintado!  '), 'cafe pintado');
  assert.ok(matches(place({ name: 'Café Pintado', brandName: 'Café Pintado' }), 'CAFÉ PINTADO'));
});

test('new places become discoverable from structured facts without a business-specific rule', () => {
  assert.ok(matches(pottery, 'cerámica'));
  assert.ok(matches(pottery, 'pintar'));
  assert.ok(matches(pottery, 'pottery'));
  assert.ok(matches(place({ tags: ['kayak'] }), 'kayak'));
  assert.ok(matches(place({ subcategories: ['Yoga'] }), 'yoga'));
  assert.ok(matches(place({ moods: ['con amigos'] }), 'amigos'));
});

test('specific activities are not inferred from their parent category', () => {
  for (const query of ['ceramica', 'pintar ceramica', 'pottery']) {
    assert.equal(matches(museum, query), false, query);
    assert.equal(matches(place({ category: 'Arte y cultura', tags: ['arte'] }), query), false, query);
  }
  assert.ok(matches(museum, 'museo'));
  assert.ok(matches(museum, 'arte'));
});

test('equivalents do not turn coffee into any dessert or beer into every bar', () => {
  assert.ok(matches(place({ tags: ['cafetería'] }), 'café'));
  assert.equal(matches(place({ tags: ['postres', 'panaderia'] }), 'café'), false);
  assert.ok(matches(place({ tags: ['cerveza artesanal'] }), 'pola'));
  assert.equal(matches(place({ category: 'Tomar algo', tags: ['vino'] }), 'cerveza'), false);
  assert.equal(matches(place({ tags: ['sushi'] }), 'pizza'), false);
  assert.equal(matches(place({ name: 'Fauna', brandName: 'Fauna', category: 'Comida' }), 'ver animales'), false);
});

test('phrase concepts survive query stop words and preserve specificity', () => {
  assert.ok(matches(pottery, 'quiero pintar cerámica'));
  assert.ok(matches(place({ tags: ['pet friendly'] }), 'con mascotas'));
  assert.ok(matches(place({ tags: ['cerveza artesanal'] }), 'pola artesanal'));
  assert.equal(matches(place({ tags: ['cerveza'] }), 'pola artesanal'), false);
});

test('prose, menus and negative statements cannot assert services', () => {
  const proseOnly = place({ description: 'Cerca de un museo. No admite mascotas. No ofrecemos cerámica. Hay café en la foto.', menuItems: [{ name: 'Café' }] });
  for (const query of ['museo', 'pet friendly', 'ceramica', 'cafe']) assert.equal(matches(proseOnly, query), false, query);
  assert.equal(matches(place({ tags: ['no admite mascotas', 'sin ceramica', 'no hay cafe'] }), 'ceramica'), false);
  assert.equal(matches(place({ tags: ['no admite mascotas'] }), 'pet friendly'), false);
  assert.equal(matches(place({ tags: ['ceramica'] }), 'sin ceramica'), false);
});

test('explicit dietary absences remain searchable, without inferring them', () => {
  assert.ok(matches(place({ tags: ['sin gluten'] }), 'gluten free'));
  assert.ok(matches(place({ subcategories: ['Mocktails'] }), 'sin alcohol'));
  assert.equal(matches(place({ tags: ['saludable', 'vegetariano'] }), 'sin gluten'), false);
});

test('short fragments are name search, not accidental attribute substring matches', () => {
  assert.ok(matches(place({ name: 'Casa nueva', brandName: 'Casa nueva' }), 'ca'));
  assert.equal(matches(place({ name: 'Nexo', brandName: 'Nexo', tags: ['cafe'] }), 'ca'), false);
  assert.equal(matches(place({ name: 'Local nuevo', brandName: 'Local nuevo', tags: ['barato'] }), 'bar'), false);
});

test('all query concepts must be evidenced on the same sede', () => {
  const north = place({ id: 'north', neighborhood: 'Granada', tags: ['ceramica'], hubName: '' });
  const south = place({ id: 'south', tags: ['yoga'], neighborhood: 'Pance', hubName: '' });
  const grouped = place({ branches: [north, south] });
  assert.equal(createSpotSearch('ceramica Pance')(grouped).matches, false);
  assert.equal(matches(grouped, 'ceramica Pance'), false);
  assert.ok(matches(grouped, 'ceramica Granada'));
  assert.equal(matches(grouped, 'ceramica', { ...DEFAULT_FILTERS, maxBudget: 10000 }), false);
});

test('location, category, people, budget and manual-visibility filters remain mandatory', () => {
  assert.ok(matches(pottery, 'ceramica Pance'));
  assert.equal(matches(pottery, 'ceramica Granada'), false);
  assert.equal(matches(pottery, 'ceramica', { ...DEFAULT_FILTERS, interests: ['Comida'] }), false);
  assert.equal(matches(pottery, 'ceramica', { ...DEFAULT_FILTERS, people: 7 }), false);
  assert.equal(matches(pottery, 'ceramica', { ...DEFAULT_FILTERS, minBudget: 50000 }), false);
  assert.equal(matches(place({ ...pottery, manuallyAdjusted: true }), 'ceramica', { ...DEFAULT_FILTERS, hideManuallyAdjusted: true }), false);
  assert.equal(matches(pottery, 'ceramica', { ...DEFAULT_FILTERS, distance: 2 }), false);
});

test('time and query budget conditions are parsed without adding fictional search facts', () => {
  assert.equal(matches(place({ ...pottery, businessStatus: 'temporarily_closed' }), 'ceramica abierto ahora'), false);
  assert.equal(matches(pottery, 'ceramica hasta 10 mil'), false);
  assert.ok(matches(pottery, 'ceramica hasta 30 mil'));
  assert.ok(matches(place({ tags: ['yoga'] }), 'yoga'));
});

test('exact business names are protected from inferred intent, not explicit filters', () => {
  const named = place({ name: 'Casa Norte', brandName: 'Casa Norte', neighborhood: 'Pance', hubName: '' });
  assert.ok(matches(named, 'Casa Norte'));
  assert.equal(matches(named, 'Casa Norte', { ...DEFAULT_FILTERS, people: 10 }), false);
  assert.ok(matches(place({ name: 'Café Domingo', brandName: 'Café Domingo', businessStatus: 'temporarily_closed' }), 'Café Domingo'));
  assert.equal(matches(place({ name: 'Café Domingo', brandName: 'Café Domingo', businessStatus: 'temporarily_closed' }), 'Café Domingo', { ...DEFAULT_FILTERS, openNowOnly: true }), false);
});

test('name relevance precedes attribute matches and explicit sorts still win', () => {
  const exact = place({ id: 'exact', name: 'Café', brandName: 'Café', minBudget: 20000, maxBudget: 20000, typicalBudget: 20000 });
  const prefix = place({ id: 'prefix', name: 'Café Nuevo', brandName: 'Café Nuevo', minBudget: 10000, maxBudget: 10000, typicalBudget: 10000 });
  const tagged = place({ id: 'tagged', tags: ['cafe'], minBudget: 5000, maxBudget: 5000, typicalBudget: 5000 });
  assert.deepEqual(rankSearchResults([tagged, prefix, exact], 'cafe', now, 'relevance').map(s => s.id), ['exact', 'prefix', 'tagged']);
  assert.deepEqual(rankSearchResults([exact, prefix, tagged], 'cafe', now, 'priceAsc').map(s => s.id), ['tagged', 'prefix', 'exact']);
  assert.ok(createExploreSearch('cafe abierto ahora')(exact).score > createExploreSearch('cafe abierto ahora')(tagged).score);
});

test('same factory serves map-style predicates, counts and rankings without mutation', () => {
  const input = [pottery, museum];
  const before = JSON.stringify(input);
  const filtered = input.filter(createSpotFilter(DEFAULT_FILTERS, 'ceramica'));
  const mapCandidates = input.filter(spot => createSpotFilter(DEFAULT_FILTERS, 'ceramica')(spot));
  assert.deepEqual(filtered, mapCandidates);
  assert.equal(filtered.length, 1);
  assert.deepEqual(rankSearchResults(filtered, 'ceramica', now), filtered);
  assert.equal(JSON.stringify(input), before);
  assert.ok(createSpotSearch('ceramica')(pottery).fields.includes('tag'));
});

test('real catalog regression covers multiple activities, dishes, names and registered locations', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/spots-catalog.json'), 'utf8'));
  const brands = new Map(catalog.spots.map(s => [s.id, s]));
  const spots = catalog.branches.flatMap(branch => {
    const row = brands.get(branch.spot_id);
    return row ? [place({ ...row, id: branch.slug, name: row.name, brandName: row.name, branchName: branch.name,
      shortDescription: row.short_description, description: row.short_description, neighborhood: branch.neighborhood || '',
      hubName: branch.mall || '', city: branch.city || '', address: branch.address || '', hours: branch.hours || '',
      minBudget: branch.min_budget || 0, maxBudget: branch.max_budget || 0, interests: [], tags: row.tags || [], moods: row.moods || [], subcategories: row.subcategories || [],
      branchId: branch.id, menuUrl: branch.menu_url || '', menuItems: branch.menu_items || [], menuItemsVerifiedAt: branch.menu_items_verified_at,
    })] : [];
  });
  const result = query => spots.filter(createSpotFilter(DEFAULT_FILTERS, query));
  for (const query of ['cerámica', 'pintar', 'pizza', 'hamburguesa', 'pola', 'museo', 'animales', 'café', 'Factory', 'Ibiza 122']) {
    assert.ok(result(query).length > 0, query);
  }
  assert.ok(result('ceramica').some(s => s.name === 'Café Pintado'));
  assert.ok(result('ceramica').some(s => s.name === 'Color Me'));
  assert.equal(result('zzzzzzzzzz').length, 0);
  for (const spot of result('ceramica')) assert.ok(createSpotSearch('ceramica')(spot).matches);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const lib = path.resolve(__dirname, '../lib');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const compiled = ts.transpileModule(fs.readFileSync(path.join(lib, `${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function('exports', 'require', 'module', compiled)(module.exports, id => id.endsWith('.json') ? require(path.resolve(lib, id)) :
    id.startsWith('@/lib/') ? load(id.slice(6)) : id.startsWith('./') ? load(id.slice(2)) : require(id), module);
  return module.exports;
}
const { selectMapSearchResults, isInsideMapArea } = load('explore-map-search');
const { createSpotFilter, DEFAULT_FILTERS, serializeFilters, parseFiltersFromParams } = load('explore-filters');
const { aggregatePlaceSpotsFromList } = load('mock-spots');
const { getMapResultFrame } = load('map-result-frame');
const { captureExploreResults, getExploreResultsParams, getExploreHomeParams } = load('explore-map-navigation');
const { canPinMapZone } = load('map-zone-policy');
function place(id, overrides = {}) {
  return { id, type: 'place', spotId: 1, branchId: 1, brandName: 'Una marca', name: 'Una marca',
    category: 'Comida', interests: [], subcategories: [], tags: ['cerveza'], moods: [], days: [],
    image: '', galleryImages: [], description: '', shortDescription: '', likes: '0',
    neighborhood: 'Granada', hubName: '', city: 'Cali', address: '', hours: '',
    minBudget: 10000, maxBudget: 20000, maxPeople: 6, distanceKm: 1,
    latitude: 3.45, longitude: -76.53, ...overrides };
}

test('map and list use the same keyword and full filter state', () => {
  const input = [place('yes'), place('not-beer', { brandName: 'Otro', tags: ['vino'] }),
    place('wrong-zone', { brandName: 'Sur', neighborhood: 'Pance' }),
    place('too-expensive', { brandName: 'Caro', minBudget: 100000, maxBudget: 150000 })];
  const filters = { ...DEFAULT_FILTERS, hubName: ['zone|||Granada'], maxBudget: 30000, people: 2 };
  const listed = input.filter(createSpotFilter(filters, 'cerveza'));
  const mapped = selectMapSearchResults(aggregatePlaceSpotsFromList(input), filters, 'cerveza');
  assert.deepEqual(mapped.flatMap(place => place.branches.map(branch => branch.id)), listed.map(place => place.id));
  assert.equal(mapped.length, 1);
});

test('matching one branch does not reveal siblings with a different offering or location', () => {
  const input = [place('beer-north'), place('wine-south', { tags: ['vino'], neighborhood: 'Pance' })];
  const grouped = aggregatePlaceSpotsFromList(input);
  const result = selectMapSearchResults(grouped, DEFAULT_FILTERS, 'cerveza Granada');
  assert.deepEqual(result[0].branches.map(branch => branch.id), ['beer-north']);
  assert.equal(selectMapSearchResults(grouped, DEFAULT_FILTERS, 'cerveza Pance').length, 0);
});

test('only located results become pins; empty queries still honor explicit filters', () => {
  const input = [place('located'), place('unlocated', { latitude: undefined }), place('wrong', { neighborhood: 'Pance' })];
  const result = selectMapSearchResults(input, { ...DEFAULT_FILTERS, hubName: ['zone|||Granada'] }, '');
  assert.deepEqual(result[0].branches.map(branch => branch.id), ['located']);
  assert.equal(selectMapSearchResults(input, DEFAULT_FILTERS, 'zzzzzzzz').length, 0);
});

test('handoff serialization keeps every explicit filter and the uncommitted keyword', () => {
  const filters = { ...DEFAULT_FILTERS, interests: ['Comida'], hubName: ['zone|||Granada'], people: 3,
    minBudget: 10000, maxBudget: 50000, time: '7:30', period: 'PM', days: ['Viernes'], distance: 100,
    sortBy: 'priceAsc', openNowOnly: true, hideManuallyAdjusted: true };
  const params = { ...serializeFilters(filters), query: 'cheesecake', view: 'map', tab: 'places' };
  assert.deepEqual(parseFiltersFromParams(params), filters);
  assert.equal(params.query, 'cheesecake');
});

test('results action reuses the navbar map, shares query, and keeps standalone map search', () => {
  const discovery = fs.readFileSync(path.join(__dirname, '../components/explore-discovery.tsx'), 'utf8');
  const map = fs.readFileSync(path.join(__dirname, '../components/explore-map-discovery.tsx'), 'utf8');
  const screen = fs.readFileSync(path.join(__dirname, '../app/(tabs)/explore.tsx'), 'utf8');
  assert.match(discovery, /showMapResults = hasResults && searchCatalog.length > 0/);
  assert.match(discovery, /accessibilityLabel="Ver resultados en el mapa" onPress=\{onPress\}/);
  assert.match(discovery, /onPress=\{\(\) => openMap\(true\)\}/);
  assert.match(discovery, /onMap=\{openMap\}/);
  assert.match(discovery, /Keyboard.dismiss\(\)/);
  assert.match(map, /const query = p.query \?\? localQuery/);
  assert.match(map, /const setQuery = p.onQuery \?\? setLocalQuery/);
  assert.match(screen, /onMap=\{\(\) => router.setParams\(\{ \.\.\.serializeFilters\(filters\), tab: 'places', query: draftQuery, view: 'map'/);
});

test('results-back restores an immutable snapshot including filter-only results', () => {
  const original = { ...DEFAULT_FILTERS, interests: ['Comida'], hubName: ['zone|||Granada'], days: ['Viernes'],
    people: 3, minBudget: 15000, maxBudget: 60000, openNowOnly: true, sortBy: 'priceAsc' };
  const snapshot = captureExploreResults(original, 'vino', true);
  original.interests.push('Familiar');
  original.hubName.length = 0;
  original.days.push('Sábado');
  const params = getExploreResultsParams(snapshot);
  assert.deepEqual(parseFiltersFromParams(params), snapshot.filters);
  assert.deepEqual(snapshot.filters.interests, ['Comida']);
  assert.deepEqual(snapshot.filters.hubName, ['zone|||Granada']);
  assert.deepEqual(snapshot.filters.days, ['Viernes']);
  assert.equal(params.query, 'vino');
  assert.equal(params.results, '1');
  assert.equal(params.view, '');
  assert.equal(getExploreResultsParams(captureExploreResults(snapshot.filters, '', true)).results, '1');
});

test('map Home clears every search filter and map/results URL state', () => {
  const params = getExploreHomeParams();
  assert.deepEqual(parseFiltersFromParams(params), DEFAULT_FILTERS);
  assert.equal(params.query, '');
  assert.equal(params.results, '');
  assert.equal(params.view, '');
  assert.equal(params.tab, 'places');
});

test('the shared map exposes results-back separately from navbar Home and place-back', () => {
  const map = fs.readFileSync(path.join(__dirname, '../components/explore-map-discovery.tsx'), 'utf8');
  const discovery = fs.readFileSync(path.join(__dirname, '../components/explore-discovery.tsx'), 'utf8');
  const screen = fs.readFileSync(path.join(__dirname, '../app/(tabs)/explore.tsx'), 'utf8');
  assert.match(map, /!p.onReturnToPlace && p.onBackToResults && <AppIconButton/);
  assert.match(map, /accessibilityLabel="Volver a los resultados" tone="light" size=\{48\} onPress=\{p.onBackToResults\}/);
  assert.match(map, /onExplore=\{p.onHome \?\? p.onBack\}/);
  assert.match(map, /onPress=\{p.onReturnToPlace\}/);
  assert.match(discovery, /onBackToResults=\{mapResultsOrigin \? returnToResults : undefined\}/);
  const home = discovery.slice(discovery.indexOf('function returnHome()'), discovery.indexOf('if (mapOpen) return'));
  assert.match(home, /setSearching\(false\)/);
  assert.match(home, /setZone\(''\)/);
  assert.match(home, /resetHomeScroll\(\)/);
  assert.match(home, /resetSearchScroll\(\)/);
  assert.match(screen, /onHome=\{returnToDiscoveryHome\}/);
  assert.match(screen, /onRestoreResults=\{restoreDiscoveryResults\}/);
});

test('results camera includes all matching branches and geographic outliers', () => {
  const grouped = aggregatePlaceSpotsFromList([place('north', { latitude: 3.51, longitude: -76.49 }),
    place('south', { latitude: 3.33, longitude: -76.56 }), place('west', { latitude: 3.42, longitude: -76.65 })]);
  const frame = getMapResultFrame(grouped, 375, 812, { top: 168, bottom: 156 });
  assert.deepEqual(frame.bounds, [[3.33, -76.65], [3.51, -76.49]]);
  assert.deepEqual(frame.paddingTopLeft, [32, 168]);
  assert.deepEqual(frame.paddingBottomRight, [32, 156]);
});

test('single/coincident coordinates have a bounded zoom; absent coordinates do not move the camera', () => {
  const frame = getMapResultFrame([place('single')], 375, 812, { top: 168, bottom: 156 });
  assert.deepEqual(frame.bounds, [[3.45, -76.53], [3.45, -76.53]]);
  assert.equal(frame.maxZoom, 16);
  assert.equal(getMapResultFrame([place('invalid', { latitude: NaN })], 375, 812, { top: 168, bottom: 156 }), null);
  assert.equal(getMapResultFrame([place('invalid', { longitude: 200 })], 375, 812, { top: 168, bottom: 156 }), null);
  assert.equal(getMapResultFrame([place('valid')], 0, 812, { top: 168, bottom: 156 }), null);
});

test('camera padding leaves a usable viewport on short screens', () => {
  const frame = getMapResultFrame([place('one')], 320, 260, { top: 180, bottom: 200 });
  assert.ok(260 - frame.paddingTopLeft[1] - frame.paddingBottomRight[1] >= 95.99);
});

test('pill uses bottom-to-top ease-in-out, reduced motion, and native-driver-only properties', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-discovery.tsx'), 'utf8');
  const button = source.slice(source.indexOf('function ResultsMapButton'), source.indexOf('const s = StyleSheet.create'));
  assert.match(button, /useReducedMotion\(\)/);
  assert.match(button, /duration: 320, easing: Easing.inOut\(Easing.cubic\), useNativeDriver: true/);
  assert.match(button, /outputRange: \[80, 0\]/);
  assert.match(button, /return \(\) => motion.stop\(\)/);
  const map = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  assert.match(map, /disabled=\{Boolean\(initialFocusSpot\) \|\| fitResults \|\| preserveViewport\}/);
  assert.match(map, /if \(previous.current === key\) return/);
  assert.match(map, /\$\{top\}:\$\{bottom\}:\$\{size.x\}:\$\{size.y\}/);
});

test('zone scope filters geographic branches, not a frozen list of old result IDs', () => {
  const area = { south: 3.4, west: -76.55, north: 3.5, east: -76.5 };
  const grouped = aggregatePlaceSpotsFromList([
    place('beer-inside'),
    place('wine-inside', { tags: ['vino'], latitude: 3.46 }),
    place('beer-outside', { latitude: 3.3 }),
    place('wine-outside', { tags: ['vino'], latitude: 3.6 }),
  ]);
  const beer = selectMapSearchResults(grouped, DEFAULT_FILTERS, 'cerveza', null, area);
  const wine = selectMapSearchResults(grouped, DEFAULT_FILTERS, 'vino', null, area);
  assert.deepEqual(beer.flatMap(place => place.branches.map(branch => branch.id)), ['beer-inside']);
  assert.deepEqual(wine.flatMap(place => place.branches.map(branch => branch.id)), ['wine-inside']);
  assert.equal(selectMapSearchResults(grouped, DEFAULT_FILTERS, 'noexistent', null, area).length, 0);
  assert.equal(selectMapSearchResults(grouped, DEFAULT_FILTERS, 'vino', null, null)[0].branches.length, 2);
});

test('zone bounds include edges, support wrapped longitude and still honor explicit filters', () => {
  const area = { south: 3.4, west: -76.55, north: 3.5, east: -76.5 };
  assert.equal(isInsideMapArea(place('edge', { latitude: 3.4, longitude: -76.55 }), area), true);
  assert.equal(isInsideMapArea(place('invalid', { latitude: NaN }), area), false);
  assert.equal(isInsideMapArea(place('wrapped', { latitude: 0, longitude: 179 }), { south: -1, north: 1, west: 170, east: -170 }), true);
  const data = [place('yes'), place('wrong-zone', { brandName: 'Other', neighborhood: 'Pance' })];
  const results = selectMapSearchResults(data, { ...DEFAULT_FILTERS, hubName: ['zone|||Granada'] }, 'cerveza', null, area);
  assert.equal(results.length, 1);
  assert.equal(results[0].branches[0].id, 'yes');
});

test('normal map fits changes, scoped searches preserve camera, and other entry flows stay isolated', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map-discovery.tsx'), 'utf8');
  const map = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  assert.match(source, /allowAreaSearch = showNavigation && !p.fitResults && !p.onBackToResults/);
  assert.match(source, /allowAreaSearch && \(hasCriteria \|\| frameAllResults\) && !areaBounds/);
  assert.match(source, /allowAreaSearch \? areaBounds : null/);
  assert.match(source, /preserveViewport=\{allowAreaSearch && Boolean\(areaBounds\)\}/);
  assert.match(source, /setAreaBounds\(bounds\)/);
  assert.doesNotMatch(source, /setAreaIds|setVisibleIds|showSearchThisArea/);
  assert.match(map, /disabled=\{fitResults \|\| preserveViewport\}/);
  assert.match(map, /\$\{criteriaKey\}:\$\{coordinatesKey\}/);
  assert.match(map, /moveend: sync, zoomend: sync, resize: sync/);
  const filters = fs.readFileSync(path.join(__dirname, '../components/filters-sheet.tsx'), 'utf8');
  assert.match(filters, /!mapArea \|\| isInsideMapArea\(spot, mapArea\)/);
  assert.match(source, /p.onFilters\(true, allowAreaSearch \? areaBounds : null\)/);
});

test('search-this-area is compact and sits after cards above the existing navbar', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map-discovery.tsx'), 'utf8');
  const action = source.indexOf('style={s.areaSearchDock}');
  assert.ok(action > source.indexOf('<MapSelectionCard'));
  assert.ok(action < source.indexOf('<DiscoveryNavigation'));
  assert.match(source, /hitSlop=\{6\} style=\{s.areaSearch\}/);
  assert.match(source, /areaSearch: \{ minHeight: 32/);
  assert.match(source, /areaSearchLabel: \{ fontSize: 11, lineHeight: 16/);
  assert.match(source, /accessibilityLabel=\{areaBounds \? 'Desfijar zona' : 'Fijar zona'\}/);
  assert.match(source, /onPress=\{areaBounds \? clearArea : searchThisArea\}/);
  assert.match(source, /accessibilityState=\{\{ selected: Boolean\(areaBounds\) \}\}/);
  assert.match(source, /name="board-pin" size=\{14\}/);
  assert.match(source, /allowAreaSearch && !cardSpot && \(areaBounds \|\| canPinZone\)/);
  assert.match(source, /areaLabelMeasure: \{ opacity: 0 \}/);
  assert.doesNotMatch(source, /areaControls|Solo en esta zona|Zona fija/);
});

test('pinning requires neighborhood zoom and geographic extent, not zoom alone', () => {
  const neighborhood = { south: 3.44, north: 3.46, west: -76.54, east: -76.52, zoom: 15 };
  assert.equal(canPinMapZone(neighborhood), true);
  assert.equal(canPinMapZone({ ...neighborhood, zoom: 14.5 }), false);
  assert.equal(canPinMapZone({ ...neighborhood, south: 3.3, north: 3.55, zoom: 12 }), false);
  assert.equal(canPinMapZone({ ...neighborhood, west: -76.57, east: -76.51 }), false);
  assert.equal(canPinMapZone({ ...neighborhood, south: 3.4, north: 3.5, zoom: 17 }), false);
  assert.equal(canPinMapZone(null), false);
  assert.equal(canPinMapZone({ ...neighborhood, north: NaN }), false);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const lib = path.resolve(__dirname, '../lib/map-marker-layout.ts');
const compiled = ts.transpileModule(fs.readFileSync(lib, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleExports = {};
new Function('exports', compiled)(moduleExports);
const { getNextMapClusterZoom, groupMapMarkers, reconcileMapMarkers, MAP_MARKER_SPACING, MAP_CLUSTER_BREAK_ZOOM } = moduleExports;

test('nearby logos cluster below the breakup zoom without moving isolated anchors', () => {
  const points = [{ x: 0, y: 0 }, { x: 22, y: 10 }, { x: 28, y: 48 }, { x: 300, y: 0 }];
  const groups = groupMapMarkers(points);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.flatMap(group => group.indices).sort((a, b) => a - b), [0, 1, 2, 3]);
  assert.deepEqual(groups.find(group => group.indices.includes(3)), { x: 300, y: 0, indices: [3] });
});

test('zoom 18 automatically breaks every cluster, including coincident coordinates', () => {
  assert.equal(MAP_CLUSTER_BREAK_ZOOM, 18);
  const points = Array.from({ length: 30 }, () => ({ x: 100, y: 100 }));
  const original = JSON.stringify(points);
  assert.equal(groupMapMarkers(points, { zoom: 17.5 }).length, 1);
  for (const zoom of [18, 18.5, 19, 22]) {
    const groups = groupMapMarkers(points, { zoom });
    assert.equal(groups.length, points.length);
    assert.ok(groups.every(group => group.indices.length === 1));
    assert.deepEqual(groups.flatMap(group => group.indices), points.map((_, index) => index));
    assert.ok(groups.every(group => group.x === 100 && group.y === 100));
  }
  assert.equal(groupMapMarkers(points.slice(0, 4), { zoom: 18 }).length, 4);
  assert.equal(groupMapMarkers(points, { zoom: 17.5 }).length, 1);
  assert.deepEqual(groupMapMarkers([], { zoom: 22 }), []);
  assert.equal(JSON.stringify(points), original);
});

test('cluster drill-down advances through at most three levels without getting stuck', () => {
  assert.deepEqual([getNextMapClusterZoom(12), getNextMapClusterZoom(14), getNextMapClusterZoom(16)], [14, 16, 18]);
  for (const start of [0, 10, 12, 13.5, 14, 14.5, 16, 17, 17.5, 17.99]) {
    let zoom = start;
    let taps = 0;
    while (zoom < MAP_CLUSTER_BREAK_ZOOM) {
      const next = getNextMapClusterZoom(zoom);
      assert.ok(next > zoom);
      zoom = next;
      taps++;
      assert.ok(taps <= 3, `too many taps from zoom ${start}`);
    }
    const coincident = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    assert.equal(groupMapMarkers(coincident, { zoom }).length, 2);
  }
  assert.equal(getNextMapClusterZoom(18), 18);
  assert.equal(getNextMapClusterZoom(22), 22);
});

test('cluster taps use a guaranteed next zoom, not a bounds fit that can stall', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  assert.match(source, /const nextZoom = getNextMapClusterZoom\(map.getZoom\(\)\)/);
  assert.match(source, /map\.flyTo\(cameraCenter, nextZoom,/);
  assert.match(source, /center\.y \+ \(bottom - top\) \/ 2/);
});

test('individual markers use stored coordinates and no spread or fan framing remains', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  assert.match(source, /position: group.items.length === 1\s*\? \[branch.latitude!, branch.longitude!\]/);
  assert.doesNotMatch(source, /separateMapMarkers|getMapFanPan|lastFanFrame|setOpened|map\.panBy/);
  assert.equal(moduleExports.separateMapMarkers, undefined);
  assert.equal(moduleExports.getMapFanPan, undefined);
});

test('layout handles a ring around a separate central marker without oversized clusters', () => {
  const points = Array.from({ length: 16 }, (_, i) => ({ x: 80 * Math.cos(i * Math.PI / 8), y: 80 * Math.sin(i * Math.PI / 8) }));
  points.push({ x: 0, y: 0 });
  const groups = groupMapMarkers(points);
  assert.equal(groups.reduce((sum, group) => sum + group.indices.length, 0), points.length);
  for (const group of groups) for (const i of group.indices) for (const j of group.indices) {
    assert.ok(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < MAP_MARKER_SPACING);
  }
});

test('a chain of nearby places does not collapse into one city-wide group', () => {
  const points = Array.from({ length: 20 }, (_, i) => ({ x: i * 30, y: 0 }));
  const groups = groupMapMarkers(points);
  assert.ok(groups.length >= 10);
});

test('filter exits last 200ms without postponement, and rapid returns cancel the exit', () => {
  const a = { key: 'a' }, b = { key: 'b' }, c = { key: 'c' };
  const first = reconcileMapMarkers([{ item: a }, { item: b }], [b], 1000, 200);
  assert.equal(first.find(entry => entry.item.key === 'a').expiresAt, 1200);
  const changed = reconcileMapMarkers(first, [b, c], 1100, 200);
  assert.equal(changed.find(entry => entry.item.key === 'a').expiresAt, 1200);
  assert.equal(reconcileMapMarkers(changed, [a, b], 1150, 200).find(entry => entry.item.key === 'a').expiresAt, undefined);
  assert.equal(reconcileMapMarkers(changed, [b, c], 1201, 200).some(entry => entry.item.key === 'a'), false);
  assert.deepEqual(reconcileMapMarkers(first, [b], 1100, 0), [{ item: b }]);
});

test('map uses solid category colors and exit motion without geographic leader lines', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  const categories = fs.readFileSync(path.join(__dirname, '../lib/explore-categories.ts'), 'utf8');
  assert.doesNotMatch(categories, /rgba\(/);
  assert.match(categories, /Tomar algo.*activeBg: '#FDE7EB'/);
  assert.doesNotMatch(source, /currentZoom < 16/);
  assert.match(source, /groupMapMarkers\(regular, \{ zoom: currentZoom \}\)/);
  assert.match(source, /spots-marker-exit 200ms ease-in both/);
  assert.match(source, /marker\.tabIndex = exiting \? -1 : 0/);
  assert.match(source, /marker\.style\.pointerEvents = exiting \? 'none' : ''/);
  assert.match(source, /window.clearTimeout\(timer\)/);
  assert.match(source, /reduced \? 0 : 200/);
  assert.doesNotMatch(source, /Polyline|displaced/);
});

test('selected places keep their card and marker emphasis without a duplicate tooltip', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/explore-map.web.tsx'), 'utf8');
  const discovery = fs.readFileSync(path.join(__dirname, '../components/explore-map-discovery.tsx'), 'utf8');
  assert.doesNotMatch(source, /Tooltip|spots-place-tooltip/);
  assert.match(source, /zIndexOffset=\{selected \? 1000 : 0\}/);
  assert.match(source, /title=\{`Seleccionar/);
  assert.match(discovery, /<MapSelectionCard spot=\{cardSpot\}/);
});

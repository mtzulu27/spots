const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/home-announcement-layout.ts'), 'utf8');
const moduleSource = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const api = { exports: {} };
new Function('exports', moduleSource)(api.exports);
const { getIbizaAnnouncementLayout: layout, IBIZA_DISCOVERY_QUERY } = api.exports;

test('matches the approved regular, narrow and wide banner geometry', () => {
  assert.equal(layout(350).imageWidth, 172);
  assert.equal(layout(350).messageLeft, 182);
  assert.equal(layout(350).logoSize, 30);
  assert.equal(layout(280).imageWidth, 140);
  assert.equal(layout(280).logoSize, 28);
  assert.equal(layout(280).messageLeft, 140);
  assert.equal(layout(760).brandWidth, 280);
  assert.equal(layout(760).imageWidth, 230);
});

test('maintains at least 16px between product image and message across breakpoints', () => {
  for (const width of [280, 310, 319, 320, 350, 390, 610, 728, 1040, 1240]) {
    const value = layout(width);
    assert.ok(value.messageLeft - value.imageLeft - value.imageWidth >= 16 - 1e-9, `Image/copy gap at ${width}px`);
  }
});

test('uses a stable initial layout and keeps the logo rail away from the arrow', () => {
  for (const width of [0, NaN, -1]) assert.deepEqual(layout(width), layout(350));
  for (const width of [280, 310, 320, 350, 390, 760]) {
    const value = layout(width);
    const logosRight = value.logoLeft + value.logoSize * 6 - 7 * 5;
    assert.ok(logosRight + 16 < width - value.arrowRight - 32, `CTA clearance at ${width}px`);
  }
});

test('is only placed in Home after sticky search, reusing the existing search flow', () => {
  const home = fs.readFileSync(path.join(root, 'components/explore-discovery.tsx'), 'utf8');
  const insertion = home.indexOf('<HomeAnnouncementBanner');
  assert.ok(insertion > home.indexOf('testID="discovery-sticky-search"'));
  assert.ok(insertion < home.indexOf('¿Qué te provoca?'));
  assert.match(home.slice(insertion - 40, insertion), /!p\.listing/);
  assert.match(home.slice(insertion, insertion + 150), /p\.onQuery\(IBIZA_DISCOVERY_QUERY\); setSearching\(true\)/);
  assert.equal(IBIZA_DISCOVERY_QUERY, 'Ibiza 122');
});

test('ships all imagery locally and preserves original flat mark defaults', () => {
  const component = fs.readFileSync(path.join(root, 'components/home-announcement-banner.tsx'), 'utf8');
  for (const match of component.matchAll(/require\('([^']+)'\)/g)) {
    assert.ok(fs.existsSync(path.resolve(root, 'components', match[1])), match[1]);
  }
  assert.doesNotMatch(component, /https?:\/\//);
  assert.match(component, /accessibilityRole="button"/);
  assert.match(component, /marginLeft: index \? -7 : 0/);
  const mark = fs.readFileSync(path.join(root, 'components/spots-logo.tsx'), 'utf8');
  assert.match(mark, /width = 200, height = 262/);
});

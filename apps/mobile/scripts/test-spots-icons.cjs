const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(relative) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  return exports;
}
const { spotsIconPaths } = load('lib/spots-icon-paths.ts');
const { spotsIconMap, resolveSpotsGlyph } = load('lib/spots-icon-map.ts');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename) : /\.tsx?$/.test(filename) ? [filename] : [];
  });
}
const sources = ['app', 'components', 'lib'].flatMap(dir => files(path.join(root, dir)));

test('all 65 approved MagicPath glyphs retain their exact geometry', () => {
  const { 'board-pin': boardPin, ...originalPaths } = spotsIconPaths;
  assert.equal(Object.keys(originalPaths).length, 65);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(originalPaths)).digest('hex'),
    '91b3292cd8eb25df80ff00fe1e4374fe17de5c2f1db4d8f85007e60888444dc2');
  for (const [name, paths] of Object.entries(spotsIconPaths)) {
    assert.ok(paths.length, name);
    for (const d of paths) assert.match(d, /^M/);
  }
});

test('every mapped legacy name resolves to a real approved glyph', () => {
  for (const [name, glyph] of Object.entries(spotsIconMap)) {
    assert.ok(spotsIconPaths[glyph], `${name}: ${glyph}`);
    assert.equal(resolveSpotsGlyph(name), glyph);
  }
  assert.equal(new Set(Object.values(spotsIconMap)).size, 66);
});

test('zone toggle uses the exact approved board-pin without replacing location pins', () => {
  assert.equal(resolveSpotsGlyph('board-pin'), 'board-pin');
  assert.equal(resolveSpotsGlyph('location-outline'), 'location');
  assert.equal(JSON.stringify(spotsIconPaths['board-pin']), JSON.stringify([
    'M 12.4645 19.5355L 6.1005 25.8995',
    'M 20.9497 3.9792C 18.1213 1.1508 15.2929 3.9792 18.1213 6.8076Q 18.8284 7.5147 18.1213 8.2218L 16.0000 10.3431Q 15.2929 11.0503 13.1716 10.3431C 8.9289 8.9289 5.3934 12.4645 8.2218 15.2929L 16.7071 23.7782C 19.5355 26.6066 23.0711 23.0711 21.6569 18.8284Q 20.9497 16.7071 21.6569 16.0000L 23.7782 13.8787Q 24.4853 13.1716 25.1924 13.8787C 28.0208 16.7071 30.8492 13.8787 28.0208 11.0503Z',
  ]));
});

test('all share aliases use the approved iPhone-style Soft Rounded glyph', () => {
  for (const name of ['share', 'share-outline', 'share-social', 'share-social-outline']) {
    assert.equal(resolveSpotsGlyph(name), 'share');
  }
  assert.equal(JSON.stringify(spotsIconPaths.share), JSON.stringify([
    'M5 16V23Q5 28 10 28H22Q27 28 27 23V16',
    'M16 20V4M10 10L16 4L22 10',
  ]));
});

test('all outline icons and literal icon attributes used by the app are covered', () => {
  let checked = 0;
  const glyphMap = require('../../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
  for (const filename of sources) {
    if (filename.endsWith('spots-icon-map.ts')) continue;
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isStringLiteral(node) && node.text in glyphMap) {
        const parent = node.parent;
        const element = parent.parent?.parent;
        const iconElement = element && (ts.isJsxSelfClosingElement(element) || ts.isJsxOpeningElement(element))
          && /^(Ionicons|SpotsIcon|AppIconButton)$/.test(element.tagName.getText(source));
        const attribute = ts.isJsxAttribute(parent) && (['icon', 'leadingIcon'].includes(parent.name.getText(source))
          || (parent.name.getText(source) === 'name' && iconElement));
        if ((node.text.endsWith('-outline') || attribute) && !node.text.startsWith('logo-')) {
          assert.ok(resolveSpotsGlyph(node.text), `${path.relative(root, filename)}: ${node.text}`);
          checked++;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(checked > 100, `Only checked ${checked} usages`);
});

test('external brands are not redrawn and runtime imports use the shared renderer', () => {
  for (const name of ['logo-apple', 'logo-instagram', 'logo-whatsapp']) assert.equal(resolveSpotsGlyph(name), undefined);
  for (const filename of sources) {
    if (filename.endsWith('spots-icon.tsx')) continue;
    assert.doesNotMatch(fs.readFileSync(filename, 'utf8'), /from ['"]@expo\/vector-icons['"]/, filename);
  }
});

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const read = file => readFileSync(path.join(__dirname, file), 'utf8');
const source = read('../app/contribute.tsx');
const jsx = (type, props) => ({ type, props });
const api = { exports: {} };
new Function('exports', 'require', ts.transpileModule(read('../components/settings-list.tsx'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText)(api.exports, name => {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
  if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value, hairlineWidth: 1 } };
  if (name === '@/lib/account-ui') return { accountUi: { text: 'text', textSecondary: 'secondary', surfaceMuted: 'pressed' } };
  throw new Error(`Unexpected dependency: ${name}`);
});
const { SettingsListItem, settingsListStyles: styles } = api.exports;

test('contribution removes only the intro subtitle and reuses two settings cards', () => {
  assert.doesNotMatch(source, /Cuéntanos qué podemos mejorar/);
  assert.match(source, /Aporta a Spots/);
  assert.equal((source.match(/<SettingsListItem label=/g) || []).length, 2);
  assert.equal((source.match(/style=\{settingsListStyles.group\}/g) || []).length, 2);
  assert.doesNotMatch(source, /iconWrap/);
});

test('existing feedback and suggestion destinations are preserved', () => {
  assert.match(source, /params: \{ action \}/);
  assert.match(source, /onPress=\{\(\) => openModule\('feedback'\)\}/);
  assert.match(source, /onPress=\{\(\) => openModule\('suggest'\)\}/);
});

test('descriptions use settings typography and preserve the whole-row action', () => {
  let called = false;
  const row = SettingsListItem({ label: 'Dar feedback', description: 'Comparte una idea.', onPress: () => { called = true; } });
  assert.equal(row.type, 'Pressable');
  assert.equal(row.props.accessibilityLabel, 'Dar feedback');
  assert.equal(row.props.accessibilityHint, 'Comparte una idea.');
  row.props.onPress();
  assert.equal(called, true);
  const copy = row.props.children.props.children[1];
  assert.equal(copy.type, 'View');
  assert.deepEqual(copy.props.children.map(child => child.props.children), ['Dar feedback', 'Comparte una idea.']);
  assert.equal(styles.label.fontSize, 16);
  assert.equal(styles.label.fontWeight, '400');
  assert.equal(styles.body.fontSize, 14);
  assert.equal(styles.group.borderRadius, 26);
});

test('label-only settings rows retain their previous structure and touch feedback', () => {
  const row = SettingsListItem({ label: 'Apariencia', onPress() {} });
  const label = row.props.children.props.children[1];
  assert.equal(label.type, 'Text');
  assert.equal(label.props.style, styles.label);
  assert.equal(row.props.accessibilityHint, undefined);
  assert.equal(row.props.style({ pressed: false })[0], styles.row);
  assert.deepEqual(row.props.style({ pressed: true })[1], { backgroundColor: 'pressed' });
  assert.equal(SettingsListItem({ label: 'Sin acción' }).type, 'View');
});

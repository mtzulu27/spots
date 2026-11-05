const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const read = file => readFileSync(path.join(__dirname, file), 'utf8');
const source = read('../app/(tabs)/explore.tsx');
const shell = read('../components/contribution-sheet.tsx');
const jsx = (type, props) => ({ type, props });
function mount({ submitting = false, bottom = 0 } = {}) {
  let handlers;
  let closes = 0;
  const values = [];
  const springs = [];
  class Value {
    constructor(value) { this.value = value; values.push(this); }
    setValue(value) { this.value = value; }
    stopAnimation() {}
    interpolate(config) { return { config }; }
  }
  const Animated = { Value, View: 'AnimatedView', add: (a, b) => ({ a, b }), spring: (value, config) => { springs.push(config); return { start() {} }; } };
  const ui = Object.fromEntries(['bg', 'surface', 'border', 'text', 'textSecondary', 'textTertiary', 'scrim'].map(key => [key, key]));
  const api = { exports: {} };
  const requireMock = name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useEffect() {}, useMemo: fn => fn(), useRef: value => ({ current: value }) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom }) };
    if (name === '@/lib/account-ui') return { accountUi: ui };
    if (name === '@/components/app-ui') return { AppPrimaryButton: 'PrimaryButton' };
    if (name === 'react-native') return {
      Animated, Platform: { OS: 'web' }, StyleSheet: { create: value => value, absoluteFillObject: {} },
      Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', KeyboardAvoidingView: 'KeyboardAvoidingView',
      useWindowDimensions: () => ({ height: 844 }), PanResponder: { create: value => { handlers = value; return { panHandlers: value }; } },
    };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const compiled = ts.transpileModule(shell, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', compiled)(api.exports, requireMock);
  const tree = api.exports.ContributionSheet({ visible: true, progress: new Value(1), title: 'Sugerir lugares', description: 'Texto', closeLabel: 'Cerrar sugerencias', submitLabel: 'Enviar sugerencia', submitting, onClose: () => { closes++; }, onSubmit() {}, children: 'Fields' });
  function find(predicate, node = tree) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      if (!child || typeof child !== 'object') continue;
      const match = find(predicate, child);
      if (match) return match;
    }
  }
  return { tree, find, handlers, values, springs, forms: api.exports.contributionFormStyles, get closes() { return closes; } };
}

test('both forms use one shell without losing submission callbacks', () => {
  const markup = source.slice(source.indexOf('function renderSuggestPlacesSheet'), source.indexOf('function renderExploreTabs'));
  assert.equal((markup.match(/<ContributionSheet/g) || []).length, 2);
  for (const callback of ['handleSubmitFeedback', 'handleSubmitSuggestion', 'addSuggestedPlaceField', 'removeSuggestedPlaceField']) assert.ok(markup.includes(callback));
  assert.doesNotMatch(markup, /tone="account"|suggestModalCard|<Modal/);
  assert.equal((markup.match(/contributionFormStyles.field/g) || []).length, 2);
  assert.equal((markup.match(/contributionFormStyles.input/g) || []).length, 2);
});

test('sheet geometry and CTA reuse the established calculator and Filters patterns', () => {
  const ui = mount();
  const sheet = ui.find(node => node.props?.testID === 'contribution-sheet');
  assert.equal(sheet.props.style[0].backgroundColor, 'bg');
  assert.equal(sheet.props.style[0].borderTopLeftRadius, 28);
  assert.equal(sheet.props.style[1].paddingBottom, 16);
  assert.equal(mount({ bottom: 34 }).find(node => node.props?.testID === 'contribution-sheet').props.style[1].paddingBottom, 34);
  const primary = ui.find(node => node.type === 'PrimaryButton');
  assert.equal(primary.props.fullWidth, true);
  assert.equal(primary.props.tone, undefined);
  assert.equal(primary.props.label, 'Enviar sugerencia');
  assert.doesNotMatch(shell, /scale:|<AppIconButton/);
});

test('fields share the auth-form radius, padding and typography', () => {
  const { forms } = mount();
  assert.equal(forms.field.borderRadius, 18);
  assert.equal(forms.field.paddingHorizontal, 14);
  assert.equal(forms.field.backgroundColor, 'surface');
  assert.equal(forms.input.fontSize, 16);
  assert.equal(forms.input.fontWeight, '400');
});

test('header drag moves continuously and dismisses at the calculator threshold', () => {
  const ui = mount();
  assert.equal(ui.handlers.onStartShouldSetPanResponder(), true);
  assert.equal(ui.handlers.onMoveShouldSetPanResponder(null, { dx: 1, dy: 8 }), true);
  ui.handlers.onPanResponderMove(null, { dy: 70 });
  assert.equal(ui.values[1].value, 70);
  ui.handlers.onPanResponderRelease(null, { dy: 70, vy: 0.2 });
  assert.equal(ui.closes, 0);
  assert.equal(ui.springs.at(-1).toValue, 0);
  ui.handlers.onPanResponderRelease(null, { dy: 111, vy: 0.2 });
  assert.equal(ui.closes, 1);
  ui.handlers.onPanResponderRelease(null, { dy: 30, vy: 0.9 });
  assert.equal(ui.closes, 2);
});

test('submission blocks drag dismissal; backdrop, native back and accessibility escape remain', () => {
  const ui = mount({ submitting: true });
  assert.equal(ui.handlers.onStartShouldSetPanResponder(), false);
  assert.equal(ui.handlers.onMoveShouldSetPanResponder(null, { dx: 0, dy: 150 }), false);
  ui.handlers.onPanResponderRelease(null, { dy: 150, vy: 1 });
  assert.equal(ui.closes, 0);
  assert.equal(ui.find(node => node.type === 'PrimaryButton').props.loading, true);
  assert.equal(typeof ui.tree.props.onRequestClose, 'function');
  assert.equal(typeof ui.find(node => node.props?.testID === 'contribution-sheet').props.onAccessibilityEscape, 'function');
  assert.ok(ui.find(node => node.type === 'Pressable' && node.props.accessibilityLabel === 'Cerrar sugerencias'));
});

test('web pointer capture tracks dragging beyond the header without selecting text', () => {
  const ui = mount();
  const area = ui.find(node => node.props?.testID === 'contribution-sheet-drag-area');
  const captured = [];
  const target = { setPointerCapture: id => captured.push(id), releasePointerCapture: id => captured.push(-id) };
  const event = y => ({ button: 0, pointerId: 1, clientY: y, currentTarget: target, preventDefault() {} });
  area.props.onPointerDown(event(100));
  area.props.onPointerMove(event(240));
  assert.equal(ui.values[1].value, 140);
  area.props.onPointerUp(event(240));
  assert.equal(ui.closes, 1);
  assert.deepEqual(captured, [1, -1]);
  assert.equal(area.props.style.touchAction, 'none');
  assert.equal(area.props.style.userSelect, 'none');
});

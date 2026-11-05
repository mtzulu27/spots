import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../components/plan-budget-calculator.tsx', import.meta.url), 'utf8');
const scenarioUi = source.slice(source.indexOf('{pilot ? <>'), source.indexOf('</> : <>', source.indexOf('{pilot ? <>')));

test('V2 keeps title, account tabs and calculator in approved order', () => {
  assert.ok(scenarioUi.indexOf('Un estimado del parche') < scenarioUi.indexOf('<AppSegmentedTabs'));
  assert.ok(scenarioUi.indexOf('<AppSegmentedTabs') < scenarioUi.indexOf('s.calculatorCard'));
  assert.ok(scenarioUi.indexOf('s.calculatorCard') < scenarioUi.indexOf('s.pilotDisclaimer'));
});

test('headline is per person; group total stays in disclosure', () => {
  const headline = scenarioUi.slice(scenarioUi.indexOf('s.individualRow'), scenarioUi.indexOf('s.breakdownToggle'));
  assert.match(headline, /money\(plan.perPerson\)/);
  assert.doesNotMatch(headline, /money\(plan.total\)/);
  assert.match(scenarioUi, /Total del grupo/);
  assert.match(scenarioUi, /Por confirmar/);
});

test('disclosure supports accessible state and reduced motion', () => {
  assert.match(source, /aria-expanded=\{breakdownOpen\}/);
  assert.match(source, /aria-hidden=\{!breakdownOpen\}/);
  assert.match(source, /duration: reduceMotion \? 0 : 280/);
  assert.match(source, /animation\.stop\(\)/);
});

test('real pricing and non-pilot counters remain in place', () => {
  assert.match(source, /scenarioBudget\(spot.menuItems \?\? \[\], people, definition\)/);
  assert.match(source, /estimateMenuTotal\(/);
  assert.match(source, /rows.map\(\(\[key, label\]\) => <Counter/);
});

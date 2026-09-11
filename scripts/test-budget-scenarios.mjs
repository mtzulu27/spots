import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scenarioBudget, scenarioNames } from '../apps/mobile/lib/budget-scenarios.ts';

test('default is tranqui; missing, excluded and ambiguous prices never produce a total', () => {
  assert.equal(scenarioNames[0], 'Parche tranqui');
  const scenario = { lines: [{ name: 'Plato', category: 'mains', quantity: 1, groupSize: 1 }] };
  const item = { name: 'Plato', category: 'mains', price: 20000 };
  assert.equal(scenarioBudget([], 2, scenario).total, null);
  assert.equal(scenarioBudget([item], 2).total, null);
  assert.equal(scenarioBudget([item, item], 2, scenario).total, null);
  assert.equal(scenarioBudget([{ ...item, calculationIncluded: false }], 2, scenario).total, null);
  assert.equal(scenarioBudget([item], 2, scenario).total, 40000);
  assert.equal(scenarioBudget([{ ...item, price: 25000 }], 2, scenario).total, 50000);
});

test('shared purchases round up, not imaginary fractional menu items', () => {
  const scenario = { lines: [{ name: 'Tabla', category: 'mains', quantity: 1, groupSize: 2 }] };
  const items = [{ name: 'Tabla', category: 'mains', price: 60000 }];
  for (const people of [1, 2, 3, 30]) assert.equal(scenarioBudget(items, people, scenario).total, Math.ceil(people / 2) * 60000);
});

test('all active branches use exact baskets or an explicit pending budget', () => {
  const catalog = JSON.parse(fs.readFileSync('apps/mobile/public/spots-catalog.json'));
  const active = new Set(catalog.spots.filter(s => s.is_active).map(s => s.id));
  for (const branch of catalog.branches.filter(b => b.is_active && active.has(b.spot_id))) {
    assert.ok([0, 3].includes(branch.budget_scenarios?.length), String(branch.id));
    const totals = branch.budget_scenarios.map(s => scenarioBudget(branch.menu_items ?? [], 2, s).perPerson);
    assert.equal(branch.typical_budget, totals[0] ?? 0, String(branch.id));
    assert.equal(branch.min_budget, totals[0] ?? 0, String(branch.id));
    if (totals.length) assert.ok(totals.every(v => v !== null) && totals[0] <= totals[1] && totals[1] <= totals[2]);
  }
});

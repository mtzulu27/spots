import fs from 'node:fs/promises';
const catalog = JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8'));
const recipes = JSON.parse(await fs.readFile('docs/catalog-review/budget-scenario-recipes.json', 'utf8'));
const overrides = {
  529: { 'BREAKFAST BURGER': 'CROQUE MADAME' },
  5244: { 'Strawberry Latte': 'Strawberry Pancake latte' },
  5106: { 'RUBISIMA (5%) - VASO 300 ML': 'RUBISIMA - VASO 300 ML', 'RUBISIMA (5%) - MEDIANA 473 ML': 'RUBISIMA - MEDIANA 473 ML', 'DEDITOS DE QUESO': 'TOTOPOS ANTAÑO' },
};
const report = [];
await fs.mkdir('docs/catalog-review/scenario-rollout', { recursive: true });
for (const spot of catalog.spots.filter(spot => spot.is_active)) {
  const branches = catalog.branches.filter(branch => branch.spot_id === spot.id && branch.is_active).map(branch => {
    const scenarios = structuredClone(recipes[spot.id] ?? []);
    const problems = [];
    for (const scenario of scenarios) for (const line of scenario.lines) {
      line.name = overrides[branch.id]?.[line.name] ?? line.name;
      const matches = (branch.menu_items ?? []).filter(item => item.name === line.name && item.category === line.category && item.calculationIncluded !== false);
      if (matches.length !== 1) problems.push(line.name);
      else line.presentation = matches[0].presentation;
    }
    const valid = scenarios.length === 3 && !problems.length;
    const totals = valid ? scenarios.map(scenario => scenario.lines.reduce((sum, line) => sum + Math.ceil(2 / line.groupSize) * line.quantity * branch.menu_items.find(item => item.name === line.name && item.category === line.category).price, 0) / 2) : [];
    if (valid && !(totals[0] <= totals[1] && totals[1] <= totals[2])) throw Error(`Non-increasing scenarios: ${branch.id}`);
    const data = { id: branch.id, slug: branch.slug, budget_scenarios: valid ? scenarios : [], min_budget: totals[0] ?? 0, typical_budget: totals[0] ?? 0, max_budget: totals[2] ?? 0,
      budget_basis: valid ? `Parche tranqui: ${scenarios[0].concept}. Referencia para una mesa de dos, sin propina; ver productos y cantidades en calculadora.` : 'Presupuesto por confirmar: falta carta vigente o selección verificable para esta sede.' };
    report.push({ name: spot.name, branch: branch.id, status: valid ? 'ready' : 'pending', perPersonForTwo: totals, missing: [...new Set(problems)] });
    return { data, write: { mode: 'update', fields: Object.keys(data).filter(key => !['id','slug'].includes(key)) } };
  });
  if (!branches.length) continue;
  await fs.writeFile(`docs/catalog-review/scenario-rollout/${spot.id}.json`, JSON.stringify({ schemaVersion: 1, data: { id: spot.id, slug: spot.slug }, write: { mode: 'update', fields: [] }, branches }, null, 2));
}
await fs.writeFile('docs/catalog-review/scenario-rollout/coverage.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));

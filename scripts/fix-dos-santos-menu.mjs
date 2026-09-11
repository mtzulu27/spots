import fs from 'node:fs/promises';
import { integrateCatalog } from './spots-research/integrate-catalog.mjs';
const file = 'docs/catalog-review/benchmarks/dos-santos-cantina/consolidated.json';
const input = JSON.parse(await fs.readFile(file, 'utf8'));
const medellin = input.branches.find((b) => b.data.slug === 'dos-santos-cantina-el-poblado');
medellin.data.id = 5290;
medellin.write.mode = 'update';
input.branches.forEach((branch) => {
  branch.data.menu_items = branch.data.menu_items.filter((item) => item.name !== 'Soda de Maracuyá');
  const guac = branch.data.menu_items.find((item) => item.name === 'Guacamole de La Casa');
  if (guac) guac.price = 46000;
  branch.data.budget_scenarios = branch.data.budget_scenarios.map((scenario) => ({ ...scenario, lines: scenario.lines.filter((line) => line.name !== 'Soda de Maracuyá') }));
});
input.branches[0].data.min_budget = 76000;
input.branches[0].data.typical_budget = 76000;
input.branches[1].data.min_budget = 76000;
input.branches[1].data.typical_budget = 76000;
await fs.writeFile(file, JSON.stringify(input, null, 2));
console.log(JSON.stringify(await integrateCatalog(file, 'apps/mobile/public/spots-catalog.json'), null, 2));

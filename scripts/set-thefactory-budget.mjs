import fs from 'node:fs';
const path = 'apps/mobile/public/spots-catalog.json';
const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
const branch = catalog.branches.find((row) => row.slug === 'the-factory-audiobar-granada');
if (!branch) throw new Error('Sede no encontrada');
branch.budget_scenarios = [
  { concept: 'Parche tranqui', note: 'Un plato y una bebida por persona.', lines: [{ name: 'Tacos (x3)', category: 'WORLD STREET FOOD', presentation: 'Pollo', quantity: 1, groupSize: 1 }, { name: 'POKER', category: 'CERVEZAS', quantity: 1, groupSize: 1 }] },
  { concept: 'Parche completo', note: 'Algo para compartir, un plato y un coctel por persona.', lines: [{ name: 'Porción de Papas', category: 'WORLD STREET FOOD', quantity: 1, groupSize: 2 }, { name: 'Falafel Wrap', category: 'WORLD STREET FOOD', presentation: 'Pollo', quantity: 1, groupSize: 1 }, { name: 'Firma del Rey', category: 'CÓCTELES DE AUTOR', quantity: 1, groupSize: 1 }] },
  { concept: 'Con toda', note: 'Algo para compartir, un plato y un coctel de autor por persona.', lines: [{ name: 'JARRA SANGRIA ROSE', category: 'PARA COMPARTIR', presentation: 'Jarra', quantity: 1, groupSize: 2 }, { name: 'Tacos (x3)', category: 'WORLD STREET FOOD', presentation: 'Pollo', quantity: 1, groupSize: 1 }, { name: 'Dulce Pecado', category: 'CÓCTELES DE AUTOR', quantity: 1, groupSize: 1 }] },
];
branch.min_budget = 30000;
branch.typical_budget = 88000;
branch.max_budget = 144000;
branch.budget_basis = 'Precios de Menupp por persona; las entradas para compartir se prorratean entre dos personas.';
branch.menu_calculation_note = 'Referencia de carta vigente de Menupp; no incluye propina ni consumos adicionales.';
branch.missing_fields = branch.missing_fields.filter((field) => field !== 'budget_scenarios');
branch.updated_at = new Date().toISOString();
fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ min: branch.min_budget, typical: branch.typical_budget, max: branch.max_budget }, null, 2));

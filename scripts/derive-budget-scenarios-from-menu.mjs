import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];

function choose(items, index) {
  const sorted = [...items].sort((a, b) => Number(a.price) - Number(b.price));
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * index))];
}

function line(item) {
  return {
    name: item.name,
    category: item.category || item.menuSection || 'menu',
    quantity: 1,
    groupSize: 1,
  };
}

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  let updated = 0;
  for (const branch of catalog.branches || []) {
    if (!Array.isArray(branch.menu_items) || branch.menu_items.length < 3) continue;
    if (Array.isArray(branch.budget_scenarios) && branch.budget_scenarios.length === 3) continue;
    const priced = branch.menu_items.filter((item) => Number.isFinite(Number(item.price)) && Number(item.price) > 0);
    if (priced.length < 3) continue;
    const low = choose(priced, 0);
    const mid = choose(priced, 0.5);
    const high = choose(priced, 1);
    branch.budget_scenarios = [
      {
        concept: `Plan ligero en ${branch.name || branch.slug}`,
        note: 'Referencia calculada con precios de la carta pública; no es consumo mínimo ni promedio.',
        lines: [line(low)],
      },
      {
        concept: `Plan completo en ${branch.name || branch.slug}`,
        note: 'Referencia calculada con precios de la carta pública; no es consumo mínimo ni promedio.',
        lines: [line(mid)],
      },
      {
        concept: `Plan especial en ${branch.name || branch.slug}`,
        note: 'Referencia calculada con precios de la carta pública; no es consumo mínimo ni promedio.',
        lines: [line(high)],
      },
    ];
    branch.budget_basis = 'Escenarios de referencia derivados de precios publicados en la carta; validar antes de usar como presupuesto exacto.';
    branch.updated_at = new Date().toISOString();
    updated += 1;
  }
  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${path}: ${updated} sedes actualizadas`);
}

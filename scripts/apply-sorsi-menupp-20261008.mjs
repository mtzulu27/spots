import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];
const reportPath = 'docs/catalog-review/benchmarks/sorsi-menupp-links-2026-10-08T00-02-32-614Z.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const menu = report.menus[0];
const sourceUrl = menu.source;
const verifiedAt = report.finishedAt || new Date().toISOString();
const categories = Object.fromEntries(menu.categories.map((category) => [category.id, category.name.trim()]));

function normalizedCategory(category) {
  if (/bebidas|cervezas|vinos|cocteleria/i.test(category)) return 'drinks';
  if (/dolce/i.test(category)) return 'desserts';
  if (/compartir/i.test(category)) return 'shared';
  return 'mains';
}

const menuItems = [];
for (const product of menu.products) {
  const baseName = product.product_name.replace(/\s+/g, ' ').trim();
  const section = categories[product.product_category] || 'Carta';
  const category = normalizedCategory(section);
  for (const price of (product.price || []).filter((entry) => !entry.disable && !entry.noStock)) {
    const amount = Number(price.price);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const presentation = String(price.label || '').replace(/\s+/g, ' ').trim() || 'unidad';
    const name = presentation === 'unidad' ? baseName : `${baseName} - ${presentation}`;
    menuItems.push({
      name,
      price: amount,
      category,
      menuSection: section,
      presentation,
      sourceUrl,
      verifiedAt,
      unit: presentation,
      calculationIncluded: true,
    });
  }
}

const uniqueItems = menuItems.filter((item, index, items) => items.findIndex((candidate) => candidate.name === item.name) === index);
const byName = new Map(uniqueItems.map((item) => [item.name, item]));
const requireItem = (name) => {
  if (!byName.has(name)) throw new Error(`Falta producto requerido en Menupp: ${name}`);
  return name;
};

const scenarios = [
  {
    concept: 'Parche tranqui',
    note: 'Flatbread y bebida individual; referencia editorial, no promedio de toda la carta.',
    lines: [
      { name: requireItem('Margherita al Pesto'), category: 'mains', quantity: 1, groupSize: 1 },
      { name: requireItem('Soda Frutos Amarillos'), category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Parche completo',
    note: 'Panini y tabla para compartir entre dos, más una bebida por persona.',
    lines: [
      { name: requireItem('Gran Panini'), category: 'shared', quantity: 1, groupSize: 2 },
      { name: requireItem('Tabla de quesos - x2'), category: 'shared', quantity: 1, groupSize: 2 },
      { name: requireItem('Sangría Tradicional'), category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Con toda',
    note: 'Panini, tabla grande, jarra de sangría y postre para alargar el parche entre dos.',
    lines: [
      { name: requireItem('Gran Panini'), category: 'shared', quantity: 1, groupSize: 2 },
      { name: requireItem('Tabla de quesos - x4'), category: 'shared', quantity: 1, groupSize: 2 },
      { name: requireItem('Jarra Sangría Tradicional'), category: 'drinks', quantity: 1, groupSize: 2 },
      { name: requireItem('Suspiro de Vino'), category: 'desserts', quantity: 2, groupSize: 2 },
    ],
  },
];

const now = new Date().toISOString();
for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'sorsi');
  const branch = catalog.branches.find((entry) => entry.slug === 'sorsi-cali');
  if (!spot || !branch) throw new Error(`No se encontró Sorsi en ${path}`);

  spot.is_active = true;
  spot.catalog_status = 'reviewed';
  spot.updated_at = now;
  branch.is_active = true;
  branch.catalog_status = 'reviewed';
  branch.phone = '3332899163';
  branch.whatsapp = 'https://wa.me/573332899163';
  branch.latitude = 3.3427218;
  branch.longitude = -76.5352484;
  branch.menu_url = sourceUrl;
  branch.menu_items = uniqueItems;
  branch.budget_scenarios = scenarios;
  branch.min_budget = 37500;
  branch.typical_budget = 100000;
  branch.max_budget = 152000;
  branch.budget_basis = 'Referencia por persona para una mesa de dos: Parche tranqui usa Margherita al Pesto y Soda Frutos Amarillos. Precios verificados en Menupp.';
  branch.updated_at = now;

  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({
  slug: 'sorsi',
  menuItems: uniqueItems.length,
  scenarios: scenarios.length,
  sourceUrl,
  active: true,
}, null, 2));

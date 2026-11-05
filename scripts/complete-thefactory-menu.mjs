import fs from 'node:fs';
const catalogPath = 'apps/mobile/public/spots-catalog.json';
const evidence = JSON.parse(fs.readFileSync('docs/catalog-review/benchmarks/thefactory-menupp-links-2026-09-08T13-02-48-198Z.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const branch = catalog.branches.find((row) => row.slug === 'the-factory-audiobar-granada');
if (!branch) throw new Error('Sede no encontrada');
const categories = new Map(evidence.menus[0].categories.map((row) => [row.id, row.name]));
branch.menu_items = evidence.menus[0].products.filter((row) => !row.disabled && row.price?.some((price) => !price.disable)).slice(0, 40).map((row) => ({
  name: row.product_name.trim(), category: categories.get(row.product_category) || 'Menu', price: Number(row.price.find((price) => !price.disable)?.discountedPrice || row.price.find((price) => !price.disable)?.price || 0), presentation: row.price.find((price) => !price.disable)?.label || 'Individual',
}));
branch.menu_items_verified_at = new Date().toISOString();
branch.updated_at = new Date().toISOString();
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ menuItems: branch.menu_items.length }, null, 2));

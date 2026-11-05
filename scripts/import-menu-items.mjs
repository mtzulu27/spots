import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeExtractedItems, summarizeMenuItems } from './lib/menu-catalog.mjs';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const inputPath = readArg('--input');
const branchSlug = readArg('--branch');
const requestedCatalog = readArg('--catalog');
const dryRun = process.argv.includes('--dry-run');

if (!inputPath || !branchSlug) {
  console.error('Uso: node scripts/import-menu-items.mjs --input /ruta/menu-prices.json --branch slug-de-sede [--catalog /ruta/spots-catalog.json] [--dry-run]');
  process.exit(1);
}

const catalogPath = resolve(requestedCatalog || 'apps/mobile/public/spots-catalog.json');
const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const branch = catalog.branches?.find((candidate) => candidate.slug === branchSlug);
if (!branch) throw new Error(`No existe la sede ${branchSlug} en ${catalogPath}.`);

const sourceUrl = input.menuUrl || input.inputUrl || input.finalUrl || branch.menu_url || '';
const verifiedAt = input.scrapedAt || new Date().toISOString();
const menuItems = normalizeExtractedItems(input.extractedItems, { sourceUrl, verifiedAt });
if (!menuItems.length) throw new Error('La extracción no produjo productos clasificables. Revisa las secciones y nombres antes de guardar.');

branch.menu_items = menuItems;
branch.menu_items_verified_at = verifiedAt;
branch.updated_at = verifiedAt;
catalog.generatedAt = new Date().toISOString();

const report = {
  branch: branchSlug,
  productsImported: menuItems.length,
  ignoredProducts: Math.max(0, (input.extractedItems?.length || 0) - menuItems.length),
  sourceUrl,
  verifiedAt,
  summaries: summarizeMenuItems(menuItems),
  dryRun,
};

if (!dryRun) {
  writeFileSync(catalogPath, JSON.stringify(catalog), 'utf8');
  const defaultCatalog = resolve('apps/mobile/public/spots-catalog.json');
  const distPath = resolve('apps/mobile/dist/spots-catalog.json');
  if (catalogPath === defaultCatalog && existsSync(distPath)) writeFileSync(distPath, JSON.stringify(catalog), 'utf8');
}

console.log(JSON.stringify(report, null, 2));

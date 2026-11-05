import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { indexMenuReport } from './menupp-search-products.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/public/spots-catalog.json'), 'utf8'));
const helper = '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-bio-links.mjs';
const runDate = process.env.SPOTS_SEARCH_RUN || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
if (!/^\d{8}$/.test(runDate)) throw new Error('SPOTS_SEARCH_RUN must be YYYYMMDD');
const directory = path.join(root, `docs/catalog-review/search-menus-${runDate}`);
fs.mkdirSync(directory, { recursive: true });
const slugs = [...new Set(catalog.branches.flatMap(branch => {
  try { const url = new URL(branch.menu_url); return url.hostname === 'menupp.co' ? [url.pathname.split('/')[1]] : []; }
  catch { return []; }
}))].sort();
const manifestPath = path.join(directory, 'manifest.json');
let manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { startedAt: new Date().toISOString(), reports: [] };
if (process.argv.includes('--refresh')) {
  if (!process.argv.includes('--resume')) manifest = { startedAt: new Date().toISOString(), reports: [] };
  for (const slug of slugs) {
    if (manifest.reports.some(report => report.slug === slug)) continue;
    const result = spawnSync(process.execPath, [helper, slug], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 2e6 });
    let summary;
    try { summary = JSON.parse(result.stdout); }
    catch { summary = { status: 'failed', error: result.error?.message || result.stderr?.slice(0,300) || 'unreadable extractor output' }; }
    manifest.reports.push({ slug, ...summary });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`${manifest.reports.length}/${slugs.length} ${slug}: ${summary.status}`);
  }
}

const sources = {}, unmapped = [], sourceReviews = [];
for (const entry of manifest.reports) {
  if (!entry.path || !fs.existsSync(path.join(root, entry.path))) continue;
  const report = JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8'));
  const indexed = indexMenuReport(report, entry.path);
  for (const source of indexed) {
    sources[new URL(source.sourceUrl).href] = source;
    sourceReviews.push({ sourceUrl: source.sourceUrl, verifiedAt: source.verifiedAt, evidenceFile: source.evidenceFile,
      acceptedProducts: source.products.length, excluded: source.excluded });
  }
  // A root URL is only resolved for a genuinely single-location, single-menu
  // brand with one catalog branch. Multi-sede sources require exact URLs.
  const branches = catalog.branches.filter(branch => {
    try { const u = new URL(branch.menu_url); return u.hostname === 'menupp.co' && u.pathname.split('/')[1] === entry.slug; } catch { return false; }
  });
  if (indexed.length === 1 && report.locations?.length === 1 && branches.length === 1) {
    const url = new URL(branches[0].menu_url);
    if (url.pathname.replace(/\/$/, '') === `/${entry.slug}`) sources[url.href] = { ...indexed[0], scopeBranchId: branches[0].id };
  }
  for (const branch of branches) if (!sources[new URL(branch.menu_url).href]) unmapped.push({ branchId: branch.id, slug: branch.slug, source: branch.menu_url, reason: 'exact_menu_scope_not_resolved' });
}
// Keep other cities/menus in the source evidence, not in the app bundle.
const referenced = new Set(catalog.branches.flatMap(branch => {
  try { return [new URL(branch.menu_url).href]; } catch { return []; }
}));
const runtimeSources = Object.fromEntries(Object.entries(sources).filter(([url]) => referenced.has(url)).map(([url, { excluded, ...source }]) => [url, source]));
const output = { version: 1, generatedAt: new Date().toISOString(), sources: runtimeSources };
fs.writeFileSync(path.join(root, 'apps/mobile/public/menu-search-sources.json'), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(directory, 'unmapped.json'), `${JSON.stringify(unmapped, null, 2)}\n`);
fs.writeFileSync(path.join(directory, 'source-review.json'), `${JSON.stringify(sourceReviews, null, 2)}\n`);
console.log(JSON.stringify({ reports: manifest.reports.length, reviewedMenus: sourceReviews.length, runtimeSourceKeys: Object.keys(runtimeSources).length, unresolved: unmapped.length }));

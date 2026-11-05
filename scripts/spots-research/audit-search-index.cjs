const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const lib = path.join(root, 'apps/mobile/lib');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(lib, `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function('exports', 'require', 'module', compiled)(module.exports, id => id.endsWith('.json') ? require(path.resolve(lib, id)) :
    id.startsWith('@/lib/') ? load(id.slice(6)) : id.startsWith('./') ? load(id.slice(2)) : require(id), module);
  return module.exports;
}
const { buildMenuSearchIndex } = load('menu-search-index');
const { createSpotSearch } = load('spot-search');
const catalogBytes = fs.readFileSync(path.join(root, 'apps/mobile/public/spots-catalog.json'));
const catalog = JSON.parse(catalogBytes);
const brands = new Map(catalog.spots.map(spot => [spot.id, spot]));
const asOf = process.argv[2] || new Date().toISOString();
const runDate = process.env.SPOTS_SEARCH_RUN || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
if (!/^\d{8}$/.test(runDate)) throw new Error('SPOTS_SEARCH_RUN must be YYYYMMDD');
const dir = path.join(root, `docs/catalog-review/search-menus-${runDate}`);
const manifestFile = path.join(dir, 'manifest.json');
const acquisition = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { reports: [] };
const snapshots = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/public/menu-search-sources.json'), 'utf8'));
const branches = catalog.branches.map(branch => {
  const brand = brands.get(branch.spot_id) || {};
  const spot = { id: branch.slug, spotId: branch.spot_id, branchId: branch.id, name: brand.name || '', brandName: brand.name || '',
    category: brand.category || '', subcategories: brand.subcategories || [], tags: brand.tags || [], moods: brand.moods || [],
    branchName: branch.name || '', neighborhood: branch.neighborhood || '', hubName: branch.mall || '', city: branch.city || brand.city || '', address: branch.address || '',
    menuUrl: branch.menu_url || '', menuItems: branch.menu_items || [], menuItemsVerifiedAt: branch.menu_items_verified_at };
  const index = buildMenuSearchIndex(spot);
  const snapshot = snapshots.sources[spot.menuUrl];
  const usesSnapshot = snapshot && index.evidence.length && index.evidence.every(item => item.verifiedAt === snapshot.verifiedAt && item.sourceUrl === snapshot.sourceUrl);
  const status = index.evidence.length ? index.pending.length ? 'indexed_with_pending' : 'indexed' :
    branch.menu_items?.length ? 'provenance_or_scope_pending' : branch.menu_url ? 'menu_not_transcribed' : 'no_menu_source';
  return { branchId: branch.id, slug: branch.slug, brand: spot.name, active: branch.is_active !== false,
    menuEvidenceMode: usesSnapshot ? 'fresh_exact_source' : 'recorded_catalog',
    menuUrl: spot.menuUrl, catalogProducts: spot.menuItems.length, status,
    evidence: index.evidence, pending: index.pending,
    oldestVerification: index.evidence.map(item => item.verifiedAt).sort()[0] || null,
    spot };
});
const queries = ['cerveza', 'pola', 'vino', 'cafe', 'cocteles', 'pizza', 'hamburguesa', 'pasta', 'tacos',
  'ramen', 'ensalada', 'limonada', 'malteada', 'helados', 'postres', 'desayuno', 'ceramica', 'yoga', 'realidad virtual'];
const coverage = queries.map(query => {
  const match = createSpotSearch(query);
  const active = branches.filter(branch => branch.active);
  const before = active.filter(branch => match({ ...branch.spot, menuUrl: '', menuItems: [], menuItemsVerifiedAt: null }).matches);
  const after = active.filter(branch => match(branch.spot).matches);
  const names = rows => [...new Set(rows.map(row => row.brand))];
  return { query, metadataBrands: names(before).length, indexedBrands: names(after).length,
    indexedBranches: after.length, addedBrands: names(after).filter(name => !names(before).includes(name)) };
});
const statuses = {}, exclusions = {};
for (const branch of branches) {
  statuses[branch.status] = (statuses[branch.status] || 0) + 1;
  for (const item of branch.pending) exclusions[item.reason] = (exclusions[item.reason] || 0) + 1;
}
const summary = { brands: brands.size, branches: branches.length,
  sourcesRequested: acquisition.reports.length,
  completeSourceReports: acquisition.reports.filter(report => report.status === 'public_menu_records_received').length,
  incompleteSourceReports: acquisition.reports.filter(report => report.status !== 'public_menu_records_received').map(report => ({ slug: report.slug, error: report.error })),
  freshlyIndexedBranches: branches.filter(branch => branch.menuEvidenceMode === 'fresh_exact_source' && branch.evidence.length).length,
  catalogBranchesWithProducts: branches.filter(branch => branch.catalogProducts).length,
  catalogProducts: branches.reduce((n, branch) => n + branch.catalogProducts, 0),
  indexedBranches: branches.filter(branch => branch.evidence.length).length,
  indexedBrandCount: new Set(branches.filter(branch => branch.evidence.length).map(branch => branch.spot.spotId)).size,
  indexedProductRecords: branches.reduce((n, branch) => n + branch.evidence.length, 0),
  pendingProductRecords: branches.reduce((n, branch) => n + branch.pending.length, 0), statuses, exclusions };
const report = { asOf, catalogSha256: crypto.createHash('sha256').update(catalogBytes).digest('hex'), summary, coverage,
  branches: branches.map(({ spot, ...branch }) => branch) };
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
const csv = rows => rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'coverage.csv'), csv([['branchId', 'brand', 'slug', 'status', 'catalogProducts', 'indexedProducts', 'pendingProducts', 'oldestVerification', 'menuUrl'],
  ...branches.map(branch => [branch.branchId, branch.brand, branch.slug, branch.status, branch.catalogProducts, branch.evidence.length, branch.pending.length, branch.oldestVerification, branch.menuUrl])]));
const displayCutoff = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' }).format(new Date(asOf));
const lines = ['# Auditoria del indice de oferta de Spots', '', `Corte: ${displayCutoff} (Bogota).`, '',
  'Esta auditoria cubre todo el catalogo local. No equivale a confirmar en vivo todas las cartas ni disponibilidad actual.', '',
  `- ${summary.brands} marcas; ${summary.branches} sedes.`,
  `- ${summary.completeSourceReports}/${summary.sourcesRequested} fuentes Menupp con extraccion completa. ${summary.freshlyIndexedBranches} sedes indexadas desde una fuente exacta recien consultada.`,
  `- ${summary.catalogProducts} productos de carta previamente almacenados en ${summary.catalogBranchesWithProducts} sedes.`,
  `- ${summary.indexedProductRecords} registros de producto indexados en ${summary.indexedBranches} sedes de ${summary.indexedBrandCount} marcas. Variantes y sedes pueden repetir productos.`,
  `- ${summary.pendingProductRecords} registros excluidos del indice de oferta por los motivos detallados en audit.json.`, '',
  '## Comparacion de cobertura', '', '| Consulta | Marcas solo con metadatos | Marcas con cartas | Sedes con cartas/metadatos |', '|---|---:|---:|---:|',
  ...coverage.map(row => `| ${row.query} | ${row.metadataBrands} | ${row.indexedBrands} | ${row.indexedBranches} |`), '',
  'Las cifras comparan matching sin filtros de horario/presupuesto/distancia. La app puede mostrar menos resultados con filtros.', '',
  '## Pendientes y limites', '', ...Object.entries(statuses).map(([status, count]) => `- ${status}: ${count} sedes.`), '',
  ...summary.incompleteSourceReports.map(report => `- Fuente pendiente ${report.slug}: ${report.error}.`), '',
  'source-review.json registra las exclusiones del origen (productos/categorias desactivados, agotados, modificadores y categorias no resueltas), separadas de los pendientes de transcripciones heredadas.',
  'coverage.csv lista cada sede. audit.json conserva por producto la fuente, fecha, pagina cuando existe, texto indexado y motivo de exclusion.',
  'Las fechas antiguas se conservan como fechas de verificacion registradas, no se sustituyen por la fecha de este informe.',
  'Las categorias/etiquetas editoriales siguen siendo evidencia independiente. Una carta ausente no prueba ausencia del producto.',
  'Un producto documentado no significa que este disponible en tiempo real ni que su precio complete el costo de una experiencia.',
  'No se cambiaron presupuestos, escenarios, imagenes, layout ni produccion.'];
fs.writeFileSync(path.join(dir, 'README.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ summary, coverage }, null, 2));

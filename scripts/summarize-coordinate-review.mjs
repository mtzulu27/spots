import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { validCoordinates } from './coordinate-review-lib.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const catalog = read('apps/mobile/public/spots-catalog.json');
const provenance = read('apps/mobile/public/coordinate-sources.json');
const report = read('docs/catalog-review/coordinate-resolution.json');
const menus = read('docs/catalog-review/coordinate-menupp-review.json');
const websites = read('docs/catalog-review/coordinate-owner-site-checks.json');
const initial = read('docs/catalog-review/coordinate-source-review.json');
const priorSlugs = new Set(initial.rows.filter(r => r.proposed).map(r => r.slug));
const sources = new Map(provenance.records.map(r => [r.slug, r]));
assert.equal(sources.size, provenance.records.length, 'Duplicate source records');
assert.equal(catalog.branches.length, report.rows.length, 'Stale report');
for (const [slug, source] of sources) {
  const branch = catalog.branches.find(b => b.slug === slug);
  assert.ok(branch && validCoordinates(source), `Invalid source ${slug}`);
  assert.equal(branch.latitude, source.latitude, `Latitude mismatch ${slug}`);
  assert.equal(branch.longitude, source.longitude, `Longitude mismatch ${slug}`);
  assert.ok(source.source.startsWith('https://'), `Missing source URL ${slug}`);
  if (source.sourceType === 'openstreetmap') assert.equal(source.license, 'ODbL-1.0');
  else assert.notEqual(source.license, 'ODbL-1.0', 'Do not relicense owner data as OSM');
}
if (existsSync('apps/mobile/dist/spots-catalog.json')) {
  const exported = read('apps/mobile/dist/spots-catalog.json');
  for (const slug of sources.keys()) {
    const a = catalog.branches.find(b => b.slug === slug);
    const b = exported.branches.find(b => b.slug === slug);
    assert.ok(b, `Missing exported branch ${slug}`);
    assert.equal(a.latitude, b.latitude); assert.equal(a.longitude, b.longitude);
  }
}
const pending = report.rows.filter(r => !r.accepted).map(r => {
  const menu = menus.results.find(m => m.branches.includes(r.slug));
  const generic = /^(cali|dapa|pance|jamundi)$/i.test((r.address ?? '').trim());
  return { slug: r.slug, place: r.place, address: r.address, status: r.status,
    reason: r.status === 'conflicting_evidence' ? r.reason
      : generic ? 'Direccion generica; falta identificar el local o sede concreta.'
      : menu ? 'Menu revisado: sin punto aceptable para esta sede; faltan coordenadas o hay ambiguedad de identidad/posicion.'
      : r.candidates.length ? 'Candidatos OSM no aceptados: otra sede, geometria de zona o identidad/posicion no corroborada.'
      : 'Sin punto especifico aceptado en las fuentes consultadas; requiere fuente adicional o GPS del establecimiento.',
    existingCoordinates: r.previous, webSearch: r.webSearch, menuSource: menu?.source ?? null,
    needed: 'Coordenadas de entrada/local publicadas o confirmadas por el negocio, con direccion y sede.' };
});
const modified = new Set(readdirSync('docs/catalog-review/coordinate-history').filter(f => f.endsWith('.json'))
  .flatMap(f => read(`docs/catalog-review/coordinate-history/${f}`).changes.map(c => c.slug)));
const summary = { catalogBranches: catalog.branches.length, previouslyMatched: priorSlugs.size,
  newlyMatched: [...sources.keys()].filter(s => !priorSlugs.has(s)).length,
  sourceMatched: sources.size, pending: pending.length, modifiedInThisReview: modified.size,
  publicMenuBrandsChecked: menus.results.length, websitePagesChecked: websites.results.length,
  conflicts: pending.filter(p => p.status === 'conflicting_evidence').length };
writeFileSync('docs/catalog-review/coordinate-pending.json', `${JSON.stringify({ summary, pending }, null, 2)}\n`);
const cell = value => String(value ?? '').replaceAll('|', '/').replaceAll('\n', ' ');
writeFileSync('docs/catalog-review/coordinate-progress.md', `# Revision de coordenadas\n\n` +
  `Estado: **incompleto**. ${summary.newlyMatched} de las ${catalog.branches.length - priorSlugs.size} sedes pendientes iniciales tienen ahora una fuente aceptada; quedan **${summary.pending}**.\n\n` +
  `Total con fuente: ${sources.size}/${catalog.branches.length}. No son mediciones topograficas. Se cambiaron coordenadas de ${modified.size} sedes durante esta revision, con historial anterior por sede.\n\n` +
  `Se consultaron ${summary.publicMenuBrandsChecked} menus publicos y ${summary.websitePagesChecked} paginas, ademas del extracto OSM y las busquedas documentadas. Cobertura de busqueda no equivale a verificacion.\n\n` +
  `No se importaron masivamente coordenadas de Google. Las sedes no verificadas conservan su dato previo (incluidos valores nulos). No se modificaron horarios, fotos ni precios. Se corrigio una direccion: Lengua de Mariposa San Antonio, de Calle 6 a Carrera 6, segun su pagina oficial de contacto.\n\n` +
  `## Pendientes\n\n| Lugar / sede | Direccion | Motivo |\n| --- | --- | --- |\n` +
  pending.map(p => `| ${cell(p.place)} / ${cell(p.slug)} | ${cell(p.address)} | ${cell(p.reason)} |`).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
console.log('Validation passed: provenance, coordinate ranges, catalog and exported coordinates.');

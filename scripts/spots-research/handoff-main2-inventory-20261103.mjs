import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateCompletion} from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-place-completion.mjs';

const base = process.cwd();
const old = 'docs/catalog-review/discovery/video-intake-20261103';
const out = 'docs/catalog-review/discovery/main-2-skill-review-20261103';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const exists = async p => fs.access(p).then(() => true, () => false);
const absolute = p => path.resolve(base, p);
const review = await read(`${old}/review-status.json`);
const reconciliation = await read(`${old}/reconciliation.json`);
const integrations = await read(`${old}/integration-summary.json`);
const catalogBytes = await fs.readFile('apps/mobile/public/spots-catalog.json');
const catalog = JSON.parse(catalogBytes);
const closure = async p => {
  if (!await exists(p)) return {path: null, status: 'not_created', canAdvance: false};
  const c = await read(p);
  const v = validateCompletion(c, path.dirname(absolute(p)));
  return {path: absolute(p), status: c.status, canAdvance: v.canAdvance,
    errors: v.errors, pending: v.pending, remainingActions: c.remainingActions};
};
const pendingDirs = {1: 'pet-camp', 5: 'royipets', 24: 'quicklyshotsoficial',
  35: 'dopamina_pending', 57: 'pueblitoextremo', 65: 'espirareterra.taller'};
const records = [];
for (const row of review.rows) {
  const original = reconciliation.records.find(r => r.number === row.number);
  const integrated = integrations.created.find(r => r.numbers.includes(row.number));
  const spot = catalog.spots.find(s => s.id === row.spotId);
  const branches = spot ? catalog.branches.filter(b => b.spot_id === spot.id) : [];
  const dirs = [`${old}/candidate-${row.number}`];
  if (integrated) dirs.push(`${old}/${integrated.username}`);
  if (pendingDirs[row.number]) dirs.push(row.number === 1
    ? 'docs/catalog-review/discovery/video-revalidation-20261103/pet-camp'
    : `${old}/${pendingDirs[row.number]}`);
  if (spot?.id === 4027) dirs.push('docs/catalog-review/spotsoficial-20261103/full-ingestion/absentacali', `${out}/absentacali`);
  const evidence = [];
  for (const dir of dirs) if (await exists(dir)) evidence.push({directory: absolute(dir), files: await fs.readdir(dir)});
  const completionPath = spot?.id === 4027
    ? 'docs/catalog-review/spotsoficial-20261103/full-ingestion/absentacali/completion.json'
    : row.number === 1 ? 'docs/catalog-review/discovery/video-revalidation-20261103/pet-camp/completion.json'
      : integrated ? `${old}/${integrated.username}/completion.json` : `${old}/candidate-${row.number}/completion.json`;
  const currentMissing = [...new Set([...(spot?.missing_fields || []), ...branches.flatMap(b => b.missing_fields || [])])];
  if (integrated) {
    if (!spot?.cover_image_url) currentMissing.push('cover');
    if ((spot?.gallery_urls?.length || 0) < 3) currentMissing.push('gallery_minimum_three_distinct');
    if (!spot?.logo_url) currentMissing.push('logo');
    if (branches.some(b => !Number.isFinite(b.latitude) || !Number.isFinite(b.longitude))) currentMissing.push('coordinates');
  }
  records.push({number: row.number, sourceName: row.name, catalogName: spot?.name || null,
    requestedOrMentionedBranch: row.branch, sourceVideo: row.video,
    instagram: spot?.instagram || (integrated ? `https://www.instagram.com/${integrated.username}/` : null),
    instagramInOriginalVideo: original?.instagram || null,
    candidateProfile: row.number === 1 ? 'https://www.instagram.com/petcamp_park1/'
      : pendingDirs[row.number] && row.number !== 35 ? `https://www.instagram.com/${pendingDirs[row.number]}/` : null,
    spotId: spot?.id || row.spotId || null,
    disposition: row.status,
    state: integrated ? 'integrated_local_incomplete_revalidation' : row.status === 'excluded_existing'
      ? 'excluded_from_new_creation_existing_not_revalidated_here' : row.number === 1 ? 'extraction_in_progress_handed_off' : 'pending',
    reason: row.reason, currentMissingFields: [...new Set(currentMissing)],
    branches: branches.map(b => ({id: b.id, slug: b.slug, address: b.address,
      neighborhood: b.neighborhood, mall: b.mall, instagram: b.instagram,
      active: b.is_active, businessStatus: b.business_status,
      coordinatesPresent: Number.isFinite(b.latitude) && Number.isFinite(b.longitude),
      latitude: b.latitude, longitude: b.longitude, hours: b.hours,
      menuItems: b.menu_items?.length || 0, budgetScenarios: b.budget_scenarios?.length || 0,
      missingFields: b.missing_fields || []})),
    consolidated: integrated ? absolute(`${old}/${integrated.username}/consolidated.json`) : null,
    currentOwnerConsolidated: spot?.id === 4027 ? absolute('docs/catalog-review/spotsoficial-20261103/full-ingestion/absentacali/consolidated.json') : null,
    completion: await closure(completionPath),
    sourceRevalidation: integrated ? 'Not certified under the latest skill; preserve valid raw evidence and repair gaps.' : 'See reason and source evidence.',
    appVisualQA: spot?.id === 4027 ? 'Main 3 partial QA; this chat did not accept visual closure. Numeric and brand-slug routes were invalid test targets; use branch slug.' : 'Not accepted by this chat.',
    publicationByThisIntake: false, evidence});
}
const baitzPath = 'output/baitz-catalog-pilot-20261102/catalogo-prueba.json';
const baitz = await read(baitzPath);
const report = {savedAt: new Date().toISOString(), thread: '019db73c-f6f1-7db3-83d3-cdcf2f3c335a',
  destinationThread: '019db73f-0ff4-7d81-b2e8-5c7185932f14', status: 'handoff_no_new_acquisition_or_catalog_writes',
  counts: review.counts, catalogSha256: crypto.createHash('sha256').update(catalogBytes).digest('hex'),
  scope: 'All 65 intake rows, including repeated mentions, 1 separately excluded itinerant event, 2 earlier Baitz pilot records and 4 audio sources without identifiable venues.',
  sourceList: absolute('output/spots-video-lugares-20261102/lista-lugares-actualizada.md'),
  userResubmittedList: '/Users/mateo/.codex/attachments/d8ab0e88-545d-48c6-aa45-e0b407c6cfdd/Texto pegado.txt',
  records, separateEvent: {...review.separateEvent, sourceVideo: '7703734371601190151', reason: 'Itinerant event, not a permanent place or branch. Not integrated.'},
  earlierBaitzPilot: {evidence: absolute(baitzPath), status: 'visual_extraction_only_not_integrated',
    records: baitz.lugares, limits: baitz.limitaciones},
  audioWithoutVenue: ['7679249409011387668', '7599826132174654728', '7646207285785578772', '7593748271382809864'].map(id => ({id,
    evidence: absolute(`output/spots-video-lugares-20261102/pendiente-audio-${id}.md`),
    status: 'No reliable place extracted; request original MP4 to inspect visual text.'})),
  currentCursor: {normal: 'Pet Camp row 1; Chipi Pets not started in the new sequential pass.',
    repair: 'Absenta owned by Main 3; matrix still blocked at snapshot. No next place started.',
    preservedEvidence: absolute('docs/catalog-review/discovery/video-revalidation-20261103/CHECKPOINT-main-2.md')},
  cleanup: {ownQaTab3Closed: true, ownAbsentaTab2Closed: true, ownPersistentProcessesStartedThisPass: false,
    devtools: 'No own pageId or lease; profile conflict was not forced.',
    petCampLogo: 'Temporary helper cleaned; not assigned.', petCampPhotos: 'Two images preserved with hashes in pet-camp/reviewed-media.',
    preview8083: 'Main 3 server, not started or stopped by this chat.'},
  warnings: ['Current data presence is not exact storefront verification, source completeness, UI QA, validated closure or publication.',
    'Existing-place exclusions only avoid duplicate creation; the latest user resubmitted all 65 rows for update, so Main must retain them in the unified queue.',
    'Absenta appears in rows 30 and 37; Migo in 44 and 45. Keep source rows but merge work by brand and verified branch.',
    'No branch deletion was justified by missing or silent sources.',
    'The report is a read-only catalog snapshot, not an integration payload. Re-read live catalog before any write.']};
await fs.writeFile(`${out}/HANDOFF-main-2.json`, JSON.stringify(report, null, 2) + '\n');
const esc = s => String(s ?? '').replaceAll('|', '/').replaceAll('\n', ' ');
const lines = ['# Inventario completo de main 2 para centralizacion', '',
  `Guardado: ${report.savedAt}. Catalogo: ${report.catalogSha256}.`, '',
  '65 filas: 17 integradas en 15 marcas/18 sedes, 20 excluidas de altas por existir y 28 pendientes. Ninguna de esas categorias equivale a cierre vigente. Se incluye Baitz y el evento aparte.', '',
  'El ultimo reenvio del usuario pide crear/actualizar cada caso: conservar tambien las 20 coincidencias existentes en la cola de actualizacion, no descartarlas del encargo.', '',
  '## Filas completas', '', '| # | Lugar / IG | Sede mencionada | Estado / ID | Faltantes o motivo |', '| --- | --- | --- | --- | --- |'];
for (const r of records) lines.push(`| ${r.number} | ${esc(r.sourceName)} / ${esc(r.instagram || r.candidateProfile || r.instagramInOriginalVideo)} | ${esc(r.requestedOrMentionedBranch)} | ${esc(r.state)} / ${r.spotId || '-'} | ${esc(r.currentMissingFields.join(', ') || r.reason)} |`);
lines.push('', '## Expedientes y sedes de las altas', '');
for (const r of records.filter(r => r.consolidated && r.number !== 37 && r.number !== 45)) {
  lines.push(`### ${r.catalogName} (${r.spotId})`, `- Instagram: ${r.instagram}`,
    `- Sedes: ${r.branches.map(b => `${b.id} ${b.slug}: ${b.address}`).join('; ')}`,
    `- Consolidado historico: ${r.consolidated}`,
    `- Cierre: ${r.completion.path || 'No creado en el expediente historico'}; estado ${r.completion.status}; canAdvance=${r.completion.canAdvance}.`,
    `- Pendiente: ${r.currentMissingFields.join(', ') || 'Revisar cierre/QA y fuentes actuales.'}`, '');
}
lines.push('## Cursor y salvamento', '',
  '- Pet Camp: perfil vigente observado petcamp_park1; web furrypetcamp.com; Arroyohondo y hotel Dapa en revision. No alta ni cierre. Hay dos fotos preservadas; servicios guarderia/pasadias adquiridos pero no leidos. No reutilizar eventos/promociones como tarifas habituales.',
  `- Checkpoint completo: ${report.currentCursor.preservedEvidence}`,
  '- Absenta: Main 3 ya integro portada/cuatro fotos y domingo corregido en ambas sedes. Queda QA movil y validacion del cierre. No dupliques su adquisicion ni uses nuestro completion inicial como cierre final.',
  '- Sabor: carta reparada a 136 variantes; Macanudo: 388 variantes incluyendo licores. Conservar esas reparaciones verificables, sin dar por completa la ficha.',
  '- Este chat deja de adquirir y escribir al catalogo. Sus pestanas de Absenta y QA estan cerradas; no tiene DevTools ni servidor propio activo. No se detuvo el preview de Main 3.', '',
  '## Otras fuentes del mismo chat', '',
  '- Baitz: Anttonina\'s Country Mall; referencias adicionales Jardin Plaza y Chipichape no abiertas. Churro Gurme San Fernando. Extraccion visual parcial solamente, sin importacion ni cierre. Evidencia: ' + absolute(baitzPath),
  '- Gran Mercado Medieval: evento itinerante excluido de lugares permanentes, video 7703734371601190151.',
  '- Audios sin lugares confiables: 7679249409011387668, 7599826132174654728, 7646207285785578772, 7593748271382809864. Requieren MP4 original para leer datos visuales.', '',
  'El JSON asociado contiene cada fuente de video, IDs/sedes actuales, rutas de evidencia, validacion de completion y faltantes; no es un payload para sobrescribir el catalogo. No publicado en Hostinger.');
await fs.writeFile(`${out}/HANDOFF-main-2.md`, lines.join('\n') + '\n');
const progress = await read(`${out}/progress.json`);
Object.assign(progress, {status: 'handed_off_to_main', handedOffAt: report.savedAt,
  destinationThread: report.destinationThread, inventory: absolute(`${out}/HANDOFF-main-2.json`),
  catalogWritesThisPass: false, published: false});
await fs.writeFile(`${out}/progress.json`, JSON.stringify(progress, null, 2) + '\n');
console.log(JSON.stringify({records: records.length, counts: report.counts, baitz: baitz.lugares.length,
  json: absolute(`${out}/HANDOFF-main-2.json`), markdown: absolute(`${out}/HANDOFF-main-2.md`)}));

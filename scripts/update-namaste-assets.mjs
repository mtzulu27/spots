import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'namaste';
const BRANCH_SLUG = 'namaste-cali';
const MENU_URL =
  'https://www.canva.com/design/DAGud9MEdZE/rFXiqqaI_KEioqsl2qjICA/view';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_49_539266648_18519644800003739_4862912815681712724_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_27_567329826_18297379285251522_341973573842818754_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_29_565415804_18296805331251522_5785003261013508140_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_35_547542455_1132383995625708_2651096792547473629_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_48_539383308_1147380770618080_8753987334383290620_n.jpg',
];
const TRACKER_UPDATED_AT = new Date().toISOString();

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function readEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line ? line.slice(key.length + 1).trim() : '';
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function upsertHours(rows, branchId, nextId, specs) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const created = specs.map((spec, index) => ({
    id: nextId + index,
    branch_id: branchId,
    day_of_week: spec.day,
    is_closed: spec.closed ?? false,
    open_time: spec.closed ? null : spec.open,
    close_time: spec.closed ? null : spec.close,
    split_open_time: spec.closed ? null : spec.splitOpen ?? null,
    split_close_time: spec.closed ? null : spec.splitClose ?? null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

async function uploadImage(supabase, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/namaste-${kind}-${index}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('spots-media')
    .upload(assetPath, imageBuffer, {
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`No se pudo subir ${filePath}: ${error.message}`);
  }

  const { data } = supabase.storage.from('spots-media').getPublicUrl(assetPath);
  return data.publicUrl;
}

async function main() {
  const envContent = readFileSync(
    '/Users/mateo/Documents/Playground/apps/mobile/.env.local',
    'utf8',
  );

  const supabaseUrl = readEnvValue(envContent, 'EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue(envContent, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan credenciales de Supabase en apps/mobile/.env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const uploadedUrls = [];
  for (const [index, filePath] of IMAGE_PATHS.entries()) {
    const kind = index === 0 ? 'cover' : 'gallery';
    uploadedUrls.push(await uploadImage(supabase, kind, filePath, index + 1));
  }

  for (const catalogPath of CATALOG_PATHS) {
    const catalog = readJson(catalogPath);
    const spot = catalog.spots.find((entry) => entry.slug === SPOT_SLUG);
    const branch = catalog.branches.find((entry) => entry.slug === BRANCH_SLUG);

    if (!spot || !branch) {
      throw new Error(`No se encontró ${SPOT_SLUG} en ${catalogPath}`);
    }

    const nextHoursId =
      Math.max(
        0,
        ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
        ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
      ) + 1;

    // Preserve feed order by keeping spot/branch updated_at unchanged.
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;

    branch.menu_url = MENU_URL;
    branch.hours =
      'Lun-Mié 12:00 PM-3:00 PM y 5:00 PM-11:00 PM · Jue-Vie 12:00 PM-3:00 PM y 5:00 PM-12:00 AM · Sáb 4:00 PM-12:00 AM · Dom 4:00 PM-11:00 PM';

    const specs = [
      { day: 1, open: '12:00:00', close: '15:00:00', splitOpen: '17:00:00', splitClose: '23:00:00', sortOrder: 10 },
      { day: 2, open: '12:00:00', close: '15:00:00', splitOpen: '17:00:00', splitClose: '23:00:00', sortOrder: 20 },
      { day: 3, open: '12:00:00', close: '15:00:00', splitOpen: '17:00:00', splitClose: '23:00:00', sortOrder: 30 },
      { day: 4, open: '12:00:00', close: '15:00:00', splitOpen: '17:00:00', splitClose: '00:00:00', sortOrder: 40 },
      { day: 5, open: '12:00:00', close: '15:00:00', splitOpen: '17:00:00', splitClose: '00:00:00', sortOrder: 50 },
      { day: 6, open: '16:00:00', close: '00:00:00', sortOrder: 60 },
      { day: 0, open: '16:00:00', close: '23:00:00', sortOrder: 70 },
    ];

    catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId, specs);
    catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId, specs);

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

  if (entry) {
    entry.lastReviewedAt = TRACKER_UPDATED_AT;
    entry.internalTag = 'followup-menu-prices-canva-blocked';
    entry.missingFields = ['min_budget', 'max_budget', 'phone', 'whatsapp', 'coordinates'];
    entry.notes = [
      'Se cargó una tanda manual de fotos de Namaste enfocada en fachada, ambiente, cóctel y plato.',
      'Se cargó el horario fino desde la story del lugar: Lun-Mié 12-3 y 5-11, Jue-Vie 12-3 y 5-12, Sáb 4-12, Dom 4-11.',
      'El menú de Canva quedó como fuente enlazada, pero desde este entorno respondió como cliente no soportado y no permitió leer precios confiables.',
      'Se preservó el orden del feed manteniendo intactos created_at y updated_at del spot y su sede.',
    ];
  }

  tracker.updatedAt = TRACKER_UPDATED_AT;
  writeJson(TRACKER_PATH, tracker);

  console.log(
    JSON.stringify(
      {
        slug: SPOT_SLUG,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_urls: uploadedUrls,
        hours:
          'Lun-Mié 12:00 PM-3:00 PM y 5:00 PM-11:00 PM · Jue-Vie 12:00 PM-3:00 PM y 5:00 PM-12:00 AM · Sáb 4:00 PM-12:00 AM · Dom 4:00 PM-11:00 PM',
        menu_url: MENU_URL,
        preservedFeedOrder: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

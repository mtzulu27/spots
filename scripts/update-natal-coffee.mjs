import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const NOW = new Date().toISOString();
const SPOT_SLUG = 'natal-coffee';
const MENU_URL = 'https://app.menupp.co/menu/natal';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_17_641779036_18575581561005744_1456310488464252616_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_20_640395017_18574409206005744_250762442180340883_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_29_627642366_18567061702005744_8849317294775200308_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_37_624068718_18562599553005744_3971522703257333950_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_8_622432064_18562079401005744_1808716012113595065_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_13_616019367_18559847401005744_5412219760802861710_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_17_610876268_18557742646005744_5832375541638681957_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_22_605078485_18555347272005744_3007407891099577327_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_27_590408814_18553767256005744_305142138789040601_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_32_591165392_18552469414005744_9151607377550921003_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_35_581491806_18544810390005744_9010550330920194175_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_46_568274884_18541088074005744_1932311906128280546_n.jpg',
];

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
    is_closed: false,
    open_time: spec.open,
    close_time: spec.close,
    split_open_time: null,
    split_close_time: null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

async function uploadImage(supabase, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/natal-coffee-${kind}-${index}-${Date.now()}.${extension}`;

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
    const branch = catalog.branches.find((entry) => entry.slug === 'natal-coffee-cali');

    if (!spot || !branch) {
      throw new Error(`No se encontró ${SPOT_SLUG} en ${catalogPath}`);
    }

    const nextHoursId =
      Math.max(
        0,
        ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
        ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
      ) + 1;

    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.updated_at = NOW;

    branch.address = 'Calle 5A #38A-42, Telepacífico, Cali';
    branch.neighborhood = 'Telepacífico';
    branch.menu_url = MENU_URL;
    branch.instagram = 'https://www.instagram.com/natalcoffee.col/';
    branch.hours =
      'Lun-Mié 9:00 AM-7:00 PM · Jue-Vie 9:00 AM-8:00 PM · Sáb-Dom 9:00 AM-3:00 PM';
    branch.updated_at = NOW;

    const specs = [
      { day: 1, open: '09:00:00', close: '19:00:00', sortOrder: 10 },
      { day: 2, open: '09:00:00', close: '19:00:00', sortOrder: 20 },
      { day: 3, open: '09:00:00', close: '19:00:00', sortOrder: 30 },
      { day: 4, open: '09:00:00', close: '20:00:00', sortOrder: 40 },
      { day: 5, open: '09:00:00', close: '20:00:00', sortOrder: 50 },
      { day: 6, open: '09:00:00', close: '15:00:00', sortOrder: 60 },
      { day: 0, open: '09:00:00', close: '15:00:00', sortOrder: 70 },
    ];
    catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId, specs);
    catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId, specs);

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

  if (entry) {
    entry.lastReviewedAt = NOW;
    entry.internalTag = 'followup-budget-contact-menu-prices';
    entry.missingFields = ['min_budget', 'max_budget', 'phone', 'whatsapp'];
    entry.notes = [
      'Se reconstruyó la ficha con una nueva tanda manual de fotos de ambiente, brunch, coctelería y platos de Natal Coffee.',
      'Se actualizó el horario fino desde la story del lugar: Lun-Mié 9 AM-7 PM, Jue-Vie 9 AM-8 PM, Sáb-Dom 9 AM-3 PM.',
      'Se dejó el menú directo en app.menupp.co/menu/natal, pero Menüpp sigue sin exponer precios legibles desde esta corrida shell.',
    ];
  }

  tracker.updatedAt = NOW;
  writeJson(TRACKER_PATH, tracker);

  console.log(
    JSON.stringify(
      {
        slug: SPOT_SLUG,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_urls: uploadedUrls,
        hours:
          'Lun-Mié 9:00 AM-7:00 PM · Jue-Vie 9:00 AM-8:00 PM · Sáb-Dom 9:00 AM-3:00 PM',
        menu_url: MENU_URL,
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

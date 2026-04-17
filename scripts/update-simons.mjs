import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'simons';
const BRANCH_SLUG = 'simons-cali';
const INSTAGRAM_URL = 'https://www.instagram.com/simonsfastfood/';
const MENU_URL = 'https://menupp.co/simons';
const PHONE = '3117011831';
const WHATSAPP =
  'https://api.whatsapp.com/send/?phone=573117011831&text&type=phone_number&app_absent=0';
const ADDRESS = 'Marbella Plaza, Local 19, Cali';
const MALL = 'Marbella Plaza';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(2) Instagram/imgi_45_541091249_17907204192212954_3388931138853948482_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_11_581538151_17915209143212954_3315615655802043032_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_23_564274854_17912348466212954_365488693463284956_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_30_558263370_17911230555212954_8030916393461176920_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_31_553232830_17910407832212954_4418783087966744533_n.jpg',
  '/Users/mateo/Downloads/(2) Instagram/imgi_39_632298093_17925334020212954_6887986081671199514_n.jpg',
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

function upsertHours(rows, branchId, nextId) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const specs = [
    { day: 1, open: '16:30:00', close: '22:30:00', sortOrder: 10 },
    { day: 2, open: '16:30:00', close: '22:30:00', sortOrder: 20 },
    { day: 3, open: '16:30:00', close: '22:30:00', sortOrder: 30 },
    { day: 4, open: '16:30:00', close: '22:30:00', sortOrder: 40 },
    { day: 5, open: '16:30:00', close: '00:00:00', sortOrder: 50 },
    { day: 6, open: '16:30:00', close: '00:00:00', sortOrder: 60 },
    { day: 0, open: '16:30:00', close: '00:00:00', sortOrder: 70 },
  ];
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
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/simons-${kind}-${index}-${Date.now()}.${extension}`;

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

    const spotCreatedAt = spot.created_at;
    const spotUpdatedAt = spot.updated_at;
    const branchCreatedAt = branch.created_at;
    const branchUpdatedAt = branch.updated_at;

    const nextHoursId =
      Math.max(
        0,
        ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
        ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
      ) + 1;

    spot.name = "Simon's";
    spot.short_description =
      'Fast food para antojo serio con sandwiches, burgers y picadas en Marbella Plaza.';
    spot.tags = ['fast food', 'hamburguesas', 'sandwiches', 'picadas', 'marbella plaza'];
    spot.moods = ['antojo', 'casual', 'comer rico'];
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.created_at = spotCreatedAt;
    spot.updated_at = spotUpdatedAt;

    branch.address = ADDRESS;
    branch.neighborhood = '';
    branch.mall = MALL;
    branch.phone = PHONE;
    branch.whatsapp = WHATSAPP;
    branch.menu_url = MENU_URL;
    branch.instagram = INSTAGRAM_URL;
    branch.hours = 'Lun-Jue 4:30 PM-10:30 PM · Vie-Dom/Fest 4:30 PM-12:00 AM';
    branch.min_budget = 31000;
    branch.created_at = branchCreatedAt;
    branch.updated_at = branchUpdatedAt;

    catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId);
    catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId);

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  tracker.entries = Array.isArray(tracker.entries) ? tracker.entries : [];
  let entry = tracker.entries.find((item) => item.slug === SPOT_SLUG);

  if (!entry) {
    entry = {
      slug: SPOT_SLUG,
      name: "Simon's",
      instagram: INSTAGRAM_URL,
      status: 'incomplete',
      internalTag: '',
      missingFields: [],
      notes: [],
      lastReviewedAt: new Date().toISOString(),
    };
    tracker.entries.push(entry);
  }

  entry.name = "Simon's";
  entry.instagram = INSTAGRAM_URL;
  entry.status = 'incomplete';
  entry.internalTag = 'followup-budget-menupp-shell-order-preserved';
  entry.missingFields = ['max_budget', 'coordinates'];
  entry.notes = [
    'Se actualizó el placeholder desde el Instagram oficial de Simon\'s Fast Food.',
    'Se dejó la sede en Marbella Plaza, Local 19, con horario Lun-Jue 4:30-10:30 PM y Vie-Dom/Fest 4:30 PM-12:00 AM.',
    'Se cargó WhatsApp, menú de Menüpp y una tanda manual de fotos preservando created_at y updated_at para no mover el feed.',
    'El link directo del menú sí soltó precios útiles y se ajustó el min_budget a ~31.000 COP / pers. con base en combo/comida accesible + bebida.',
  ];
  entry.lastReviewedAt = new Date().toISOString();

  tracker.updatedAt = new Date().toISOString();
  writeJson(TRACKER_PATH, tracker);

  console.log(
    JSON.stringify(
      {
        slug: SPOT_SLUG,
        preservedFeedOrder: true,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_count: uploadedUrls.length,
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

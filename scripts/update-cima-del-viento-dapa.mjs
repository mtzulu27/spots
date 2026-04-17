import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'cima-del-viento';
const BRANCH_SLUG = 'cima-del-viento-cali';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_22_619732257_17850453552659455_4394723375092068833_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_17_634851101_18561310165050134_8386103928881638943_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_21_620464408_18098721950495177_1265139103883590709_n.jpg',
];

const HOURS_LABEL =
  'Mié-Vie 3:30 PM-10:00 PM · Sáb-Dom/Fest 12:00 PM-10:30 PM · Lun-Mar Cerrado';
const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=573127886205&text&type=phone_number&app_absent=0';
const REVIEWED_AT = new Date().toISOString();

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

function upsertHours(rows, branchId, startId, specs) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const created = specs.map((spec, index) => ({
    id: startId + index,
    branch_id: branchId,
    day_of_week: spec.day,
    is_closed: spec.closed ?? false,
    open_time: spec.closed ? null : spec.open,
    close_time: spec.closed ? null : spec.close,
    split_open_time: null,
    split_close_time: null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

async function uploadImage(supabase, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/cima-del-viento-${kind}-${index}-${Date.now()}.${extension}`;

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

    // Preserve feed order by keeping timestamps intact.
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.tags = Array.from(new Set([...(spot.tags || []), 'pet friendly', 'dapa', 'mirador']));
    spot.moods = Array.from(new Set([...(spot.moods || []), 'naturaleza', 'escape']));

    branch.address = 'Dapa, Yumbo, Valle del Cauca';
    branch.neighborhood = 'Dapa';
    branch.whatsapp = WHATSAPP_URL;
    branch.menu_url = '';
    branch.hours = HOURS_LABEL;
    branch.latitude = 3.568525;
    branch.longitude = -76.569872;

    const specs = [
      { day: 1, closed: true, sortOrder: 10 },
      { day: 2, closed: true, sortOrder: 20 },
      { day: 3, open: '15:30:00', close: '22:00:00', sortOrder: 30 },
      { day: 4, open: '15:30:00', close: '22:00:00', sortOrder: 40 },
      { day: 5, open: '15:30:00', close: '22:00:00', sortOrder: 50 },
      { day: 6, open: '12:00:00', close: '22:30:00', sortOrder: 60 },
      { day: 0, open: '12:00:00', close: '22:30:00', sortOrder: 70 },
    ];

    catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId, specs);
    catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId, specs);

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

  if (entry) {
    entry.status = 'incomplete';
    entry.internalTag = 'followup-hours-whatsapp-location-order-preserved';
    entry.missingFields = ['min_budget', 'max_budget', 'phone'];
    entry.notes = [
      'Se cargaron fotos manuales de ambiente y sede de Cima del Viento Dapa.',
      'Se cargó el horario compartido por el usuario: Mié-Vie 3:30 PM-10:00 PM y Sáb-Dom/Fest 12:00 PM-10:30 PM, con Lun-Mar cerrados.',
      'El wa.link resolvió al número 573127886205 y se normalizó a enlace de WhatsApp.',
      'El link de ubicación no soltó una dirección textual limpia; se guardaron coordenadas exactas y una dirección conservadora como Dapa, Yumbo, Valle del Cauca.',
      'Se quitó el website y se preservó el orden del feed manteniendo intactos created_at y updated_at del spot y su sede.',
    ];
    entry.lastReviewedAt = REVIEWED_AT;
  }

  tracker.updatedAt = REVIEWED_AT;
  writeJson(TRACKER_PATH, tracker);

  console.log(
    JSON.stringify(
      {
        slug: SPOT_SLUG,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_count: uploadedUrls.length,
        hours: HOURS_LABEL,
        whatsapp: WHATSAPP_URL,
        latitude: 3.568525,
        longitude: -76.569872,
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

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'prote-and-co';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_9_554817412_17898672336292706_9077152150017273219_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_18_542810097_17896505109292706_3363890290186937545_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_21_541940467_17895689547292706_4051672923788011729_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_22_540531682_17895172809292706_242829751414621756_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_29_527213145_17892318729292706_1691666484845221675_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_30_527920540_17891952798292706_310411184416851568_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_34_524912442_17891487864292706_1380434492699604830_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_36_522639639_17890553109292706_1135869254951413316_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_37_520899521_17890152960292706_8466674099371236185_n.jpg',
];

const TRACKER_UPDATED_AT = new Date().toISOString();

const BRANCH_DEFS = [
  {
    slug: 'prote-and-co-granada-cali',
    name: 'Granada',
    address: 'Av. 9 Nte. #13N-01, Granada, Cali, Valle del Cauca',
    neighborhood: 'Granada',
    mall: '',
    latitude: null,
    longitude: null,
  },
  {
    slug: 'prote-and-co-las-velas-cali',
    name: 'Las Velas',
    address: 'Centro Comercial Las Velas, Ciudad Jardín, Cali',
    neighborhood: 'Ciudad Jardín',
    mall: 'Las Velas',
    latitude: null,
    longitude: null,
  },
  {
    slug: 'prote-and-co-chipichape-cali',
    name: 'Chipichape',
    address: 'Centro Comercial Chipichape, Cali',
    neighborhood: 'Chipichape',
    mall: 'Chipichape',
    latitude: null,
    longitude: null,
  },
];

const HOURS_LABEL =
  'Lun-Jue 12:00 PM-8:00 PM · Vie-Dom 12:00 PM-9:00 PM · Fest 12:00 PM-8:00 PM';

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
    { day: 1, open: '12:00:00', close: '20:00:00', sortOrder: 10 },
    { day: 2, open: '12:00:00', close: '20:00:00', sortOrder: 20 },
    { day: 3, open: '12:00:00', close: '20:00:00', sortOrder: 30 },
    { day: 4, open: '12:00:00', close: '20:00:00', sortOrder: 40 },
    { day: 5, open: '12:00:00', close: '21:00:00', sortOrder: 50 },
    { day: 6, open: '12:00:00', close: '21:00:00', sortOrder: 60 },
    { day: 0, open: '12:00:00', close: '21:00:00', sortOrder: 70 },
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
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/prote-and-co-${kind}-${index}-${Date.now()}.${extension}`;

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

    if (!spot) {
      throw new Error(`No se encontró ${SPOT_SLUG} en ${catalogPath}`);
    }

    // Preserve feed order by keeping the spot timestamps intact.
    const spotCreatedAt = spot.created_at;
    const spotUpdatedAt = spot.updated_at;
    const oldBranch =
      catalog.branches.find((entry) => entry.slug === 'prote-and-co-cali') ||
      catalog.branches.find((entry) => entry.spot_id === spot.id);

    if (!oldBranch) {
      throw new Error(`No se encontró sede base de ${SPOT_SLUG} en ${catalogPath}`);
    }

    const branchCreatedAt = oldBranch.created_at;
    const branchUpdatedAt = oldBranch.updated_at;
    const branches = Array.isArray(catalog.branches) ? catalog.branches : [];
    const existingBranchIds = branches.map((entry) => Number(entry.id) || 0);
    let nextBranchId = Math.max(0, ...existingBranchIds) + 1;

    const rebuiltBranches = BRANCH_DEFS.map((branchDef, index) => {
      const existing =
        branches.find((entry) => entry.slug === branchDef.slug) ||
        (index === 0 ? oldBranch : null);

      const branchId = existing?.id ?? nextBranchId++;
      return {
        ...(existing ?? oldBranch),
        id: branchId,
        spot_id: spot.id,
        slug: branchDef.slug,
        address: branchDef.address,
        neighborhood: branchDef.neighborhood,
        mall: branchDef.mall,
        phone: existing?.phone ?? oldBranch.phone ?? '',
        whatsapp: existing?.whatsapp ?? oldBranch.whatsapp ?? '',
        menu_url: existing?.menu_url ?? oldBranch.menu_url ?? '',
        latitude: branchDef.latitude,
        longitude: branchDef.longitude,
        created_at: existing?.created_at ?? branchCreatedAt,
        updated_at: existing?.updated_at ?? branchUpdatedAt,
        hours: HOURS_LABEL,
        holiday_mode: existing?.holiday_mode ?? 'inherit',
        holiday_open_time: '12:00:00',
        holiday_close_time: '20:00:00',
        holiday_split_open_time: null,
        holiday_split_close_time: null,
        min_budget: existing?.min_budget ?? 0,
        max_budget: existing?.max_budget ?? 0,
        instagram: 'https://www.instagram.com/proteandco.froyo/',
        is_active: true,
        sort_order: index + 1,
      };
    });

    const keepOtherBranches = branches.filter((entry) => entry.spot_id !== spot.id);

    spot.name = 'Prote&Co';
    spot.short_description =
      'Helado de yogurt griego alto en proteína, sin azúcar añadida y con toppings para el antojo frío en Granada, Las Velas y Chipichape.';
    spot.tags = [
      'yogurt griego',
      'alto en proteina',
      'sin azucar anadida',
      'postres',
      'frozen yogurt',
      'bajo en grasa',
    ];
    spot.moods = ['antojo', 'postre', 'plan tranqui', 'snack'];
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.created_at = spotCreatedAt;
    spot.updated_at = spotUpdatedAt;

    catalog.branches = [...keepOtherBranches, ...rebuiltBranches].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );

    let nextHoursId =
      Math.max(
        0,
        ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
        ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
      ) + 1;

    for (const branch of rebuiltBranches) {
      catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId);
      catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId);
      nextHoursId += 7;
    }

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

  if (entry) {
    entry.name = 'Prote&Co';
    entry.lastReviewedAt = TRACKER_UPDATED_AT;
    entry.internalTag = 'followup-hours-branches-order-preserved';
    entry.missingFields = ['menu_url', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'coordinates'];
    entry.notes = [
      'Se convirtió el placeholder en tres sedes: Granada, Las Velas y Chipichape.',
      'Se aplicó el mismo horario de la story para las tres sedes: Lun-Jue 12-8, Vie-Dom 12-9, Fest 12-8.',
      'Granada quedó con dirección exacta; Las Velas y Chipichape se dejaron amarradas al centro comercial sin inventar local no confirmado.',
      'Se cargó una tanda manual de fotos centrada en producto y se preservó el orden del feed manteniendo created_at y updated_at del spot.',
    ];
  }

  tracker.updatedAt = TRACKER_UPDATED_AT;
  writeJson(TRACKER_PATH, tracker);

  console.log(
    JSON.stringify(
      {
        slug: SPOT_SLUG,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_count: uploadedUrls.length,
        branches: BRANCH_DEFS.map((branch) => branch.slug),
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

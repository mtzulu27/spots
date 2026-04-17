import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'hamburgo';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_21_545182690_18193299217320231_6910173302865808745_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_28_534334117_18191152795320231_8516706167420484819_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_37_525756406_18189241261320231_4574390976479434446_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_38_523790703_18188937355320231_8046786869250419059_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_41_520985938_18188376721320231_6924642103705361964_n.jpg',
];

const TRACKER_UPDATED_AT = new Date().toISOString();
const MENU_URL = 'https://menupp.co/hamburgo';
const PHONE = '3215879406';
const WHATSAPP =
  'https://api.whatsapp.com/send/?phone=573215879406&text&type=phone_number&app_absent=0';
const HOURS_LABEL =
  'Dom-Jue 12:00 PM-10:00 PM · Vie-Sáb 12:00 PM-11:00 PM';

const BRANCH_DEFS = [
  {
    slug: 'hamburgo-palmas-mall-cali',
    address: 'Palmas Mall, Ciudad Jardín, Cali',
    neighborhood: 'Ciudad Jardín',
    mall: 'Palmas Mall',
    latitude: null,
    longitude: null,
    sort_order: 1,
  },
  {
    slug: 'hamburgo-jamundi',
    address: 'Cra 22 #5 Sur-04, Jamundí, Valle del Cauca',
    neighborhood: 'Jamundí',
    mall: '',
    latitude: 3.2560614,
    longitude: -76.5563741,
    sort_order: 2,
  },
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
    { day: 1, open: '12:00:00', close: '22:00:00', sortOrder: 10 },
    { day: 2, open: '12:00:00', close: '22:00:00', sortOrder: 20 },
    { day: 3, open: '12:00:00', close: '22:00:00', sortOrder: 30 },
    { day: 4, open: '12:00:00', close: '22:00:00', sortOrder: 40 },
    { day: 5, open: '12:00:00', close: '23:00:00', sortOrder: 50 },
    { day: 6, open: '12:00:00', close: '23:00:00', sortOrder: 60 },
    { day: 0, open: '12:00:00', close: '22:00:00', sortOrder: 70 },
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
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/hamburgo-${kind}-${index}-${Date.now()}.${extension}`;

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

    const spotCreatedAt = spot.created_at;
    const spotUpdatedAt = spot.updated_at;
    const existingBranches = (catalog.branches || []).filter((entry) => entry.spot_id === spot.id);
    const baseBranch =
      existingBranches.find((entry) => entry.slug === 'hamburgo-ciudad-jardin') ||
      existingBranches[0];

    if (!baseBranch) {
      throw new Error(`No se encontró sede base de ${SPOT_SLUG} en ${catalogPath}`);
    }

    const branchCreatedAt = baseBranch.created_at;
    const branchUpdatedAt = baseBranch.updated_at;
    let nextBranchId =
      Math.max(0, ...(catalog.branches || []).map((entry) => Number(entry.id) || 0)) + 1;

    const rebuiltBranches = BRANCH_DEFS.map((branchDef, index) => {
      const existing =
        existingBranches.find((entry) => entry.slug === branchDef.slug) ||
        (index === 0 ? baseBranch : null);
      const branchId = existing?.id ?? nextBranchId++;
      return {
        ...(existing ?? baseBranch),
        id: branchId,
        spot_id: spot.id,
        slug: branchDef.slug,
        address: branchDef.address,
        neighborhood: branchDef.neighborhood,
        mall: branchDef.mall,
        phone: PHONE,
        whatsapp: WHATSAPP,
        menu_url: MENU_URL,
        latitude: branchDef.latitude,
        longitude: branchDef.longitude,
        created_at: existing?.created_at ?? branchCreatedAt,
        updated_at: existing?.updated_at ?? branchUpdatedAt,
        hours: HOURS_LABEL,
        holiday_mode: 'inherit',
        holiday_open_time: null,
        holiday_close_time: null,
        holiday_split_open_time: null,
        holiday_split_close_time: null,
        min_budget: existing?.min_budget ?? baseBranch.min_budget ?? 19000,
        max_budget: existing?.max_budget ?? baseBranch.max_budget ?? 55000,
        instagram: 'https://www.instagram.com/hamburgo_pcb/',
        is_active: true,
        sort_order: branchDef.sort_order,
      };
    });

    const otherBranches = (catalog.branches || []).filter((entry) => entry.spot_id !== spot.id);
    catalog.branches = [...otherBranches, ...rebuiltBranches].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );

    spot.short_description =
      'Parrilla, hamburguesas y platos fuertes para plan casual entre Palmas Mall y Jamundí.';
    spot.tags = ['hamburguesas', 'parrilla', 'jamundi', 'palmas mall', 'cena', 'con amigos'];
    spot.moods = ['casual', 'con amigos', 'antojo', 'cena'];
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.created_at = spotCreatedAt;
    spot.updated_at = spotUpdatedAt;

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
  tracker.entries = Array.isArray(tracker.entries) ? tracker.entries : [];
  let entry = tracker.entries.find((item) => item.slug === SPOT_SLUG);

  if (!entry) {
    entry = {
      slug: SPOT_SLUG,
      name: 'Hamburgo',
      instagram: 'https://www.instagram.com/hamburgo_pcb/',
      status: 'incomplete',
      internalTag: '',
      missingFields: [],
      notes: [],
      lastReviewedAt: TRACKER_UPDATED_AT,
    };
    tracker.entries.push(entry);
  }

  entry.name = 'Hamburgo';
  entry.instagram = 'https://www.instagram.com/hamburgo_pcb/';
  entry.status = 'incomplete';
  entry.internalTag = 'followup-menupp-shell-maps-coords-order-preserved';
  entry.missingFields = [];
  entry.notes = [
    'Se dejó con dos sedes: Palmas Mall en Cali y Jamundí.',
    'Los horarios se cargaron desde la story: Dom-Jue 12 PM-10 PM y Vie-Sáb 12 PM-11 PM.',
    'El menú quedó enlazado a Menüpp, pero desde esta corrida solo respondió el shell y no soltó precios legibles.',
    'La sede de Jamundí usa la dirección del bio y el pin de Maps solo como refuerzo de coordenadas.',
    'Se preservó el orden del feed manteniendo intactos created_at y updated_at del spot.',
  ];
  entry.lastReviewedAt = TRACKER_UPDATED_AT;

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

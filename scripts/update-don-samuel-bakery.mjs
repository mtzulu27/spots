import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'don-samuel';
const BRANCH_SLUG = 'don-samuel-cali';
const MENU_URL =
  'https://menupp.co/donsamuelhealthy/venue/4f3dd37c-dbf8-4f37-82ac-10d663165af8/menu/ya4BlHfDDweylA3e8CTO?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnQak1rea_wJ_AkgEAkuxppsrrZlk6eBjy7gKL5HKhUyKjvdyL6WZpUecjyBE_aem_yPQMriYt9sykkC3nGYZqZQ';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_10_656311390_18101203102929066_5206353992665226935_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_26_657322981_18396215779146749_1935410296054530906_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_34_621628728_18015442913645120_2509409351185840294_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_38_621171359_18051026501474027_208184620405041983_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_43_621796761_18069840881564697_4518950278946655204_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_44_620923527_18078115607363418_7176357153714009892_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_45_620504570_18055911284679267_8093157570981301598_n.jpg',
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

function upsertHours(rows, branchId, nextId) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const specs = [
    { day: 1, open: '14:00:00', close: '20:00:00', sortOrder: 10 },
    { day: 2, open: '14:00:00', close: '20:00:00', sortOrder: 20 },
    { day: 3, open: '14:00:00', close: '20:00:00', sortOrder: 30 },
    { day: 4, open: '14:00:00', close: '20:00:00', sortOrder: 40 },
    { day: 5, open: '14:00:00', close: '21:00:00', sortOrder: 50 },
    { day: 6, open: '14:00:00', close: '21:00:00', sortOrder: 60 },
    { day: 0, open: '14:00:00', close: '21:00:00', sortOrder: 70 },
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
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/don-samuel-${kind}-${index}-${Date.now()}.${extension}`;

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

    spot.name = 'Don Samuel Bakery';
    spot.short_description =
      'Healthy bakery sin gluten y sin azúcar añadida para postres, brownies y antojo dulce en Lago Verde.';
    spot.tags = [
      'healthy bakery',
      'sin gluten',
      'sin azucar',
      'postres',
      'brownies',
      'lago verde',
    ];
    spot.moods = ['dulce', 'antojo', 'plan tranqui', 'healthy'];
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.created_at = spotCreatedAt;
    spot.updated_at = spotUpdatedAt;

    branch.address = 'Parque Comercial Lago Verde, Cali';
    branch.neighborhood = 'Lago Verde';
    branch.mall = 'Parque Comercial Lago Verde';
    branch.phone = '';
    branch.whatsapp = '';
    branch.menu_url = MENU_URL;
    branch.instagram = 'https://www.instagram.com/donsamuelbakery/';
    branch.hours = 'Lun-Jue 2:00 PM-8:00 PM · Vie-Dom 2:00 PM-9:00 PM';
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
      name: 'Don Samuel Bakery',
      instagram: 'https://www.instagram.com/donsamuelbakery/',
      status: 'incomplete',
      internalTag: '',
      missingFields: [],
      notes: [],
      lastReviewedAt: TRACKER_UPDATED_AT,
    };
    tracker.entries.push(entry);
  }

  entry.name = 'Don Samuel Bakery';
  entry.instagram = 'https://www.instagram.com/donsamuelbakery/';
  entry.status = 'incomplete';
  entry.internalTag = 'followup-menupp-shell-order-preserved';
  entry.missingFields = ['min_budget', 'max_budget', 'phone', 'whatsapp', 'coordinates'];
  entry.notes = [
    'Se actualizó el placeholder desde el Instagram oficial de Don Samuel Bakery.',
    'Se dejó la sede en Parque Comercial Lago Verde con horario Lun-Jue 2-8 PM y Vie-Dom 2-9 PM.',
    'El menú quedó enlazado a Menüpp, pero desde esta corrida solo respondió el shell y no permitió leer precios confiables.',
    'Se cargó una tanda manual de fotos de producto y se preservó el orden del feed manteniendo created_at y updated_at del spot.',
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

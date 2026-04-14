import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'sabor-gourmet';
const IMAGE_PATHS = [
  '/Users/mateo/Downloads/(3) Instagram/imgi_13_491519053_18067342162942375_4040597063466622181_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_15_491463652_18067342546942375_3348626839453563589_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_19_490448125_18066842992942375_8310667612106460229_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_23_491409608_18066296038942375_2658703174544501570_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_25_488500147_18065561023942375_1617203529526308782_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_26_487920883_18065312902942375_4530480364531734793_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_29_486690516_18064766491942375_1966218969439654671_n.jpg',
  '/Users/mateo/Downloads/(3) Instagram/imgi_30_485057618_18064376293942375_1933264782569657995_n.jpg',
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

async function uploadImage(supabase, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(SPOT_SLUG)}/${kind}/sabor-gourmet-${kind}-${index}-${Date.now()}.${extension}`;

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

    // Preserve feed order by keeping timestamps intact.
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;

    writeJson(catalogPath, catalog);
  }

  const tracker = readJson(TRACKER_PATH);
  const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);
  const reviewedAt = new Date().toISOString();

  if (entry) {
    entry.lastReviewedAt = reviewedAt;
    entry.missingFields = Array.isArray(entry.missingFields)
      ? entry.missingFields.filter((field) => field !== 'photos')
      : [];
    entry.notes = [
      'Se cargó una tanda manual de fotos de Sabor Gourmet con foco en interior, café, brunch, salados y postres.',
      'Se preservó el orden del feed manteniendo intactos created_at y updated_at del spot y su sede.',
      'Pendiente todavía aterrizar min_budget y max_budget cuando el menú permita leer precios confiables.',
    ];
  }

  tracker.updatedAt = reviewedAt;
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

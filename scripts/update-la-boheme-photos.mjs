import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

async function uploadImage(supabase, spotSlug, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(spotSlug)}/${kind}/la-boheme-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'la-boheme';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_23_500706223_1187206403420001_5506278336598061047_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_25_496933715_1177191854421456_3285421433726542398_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_29_499918060_1183985690408739_8174458059614330032_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_33_494682666_1173565868117388_6720877500156930373_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_35_494553175_1165129448961030_6077657902862200321_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_45_494207970_1164550392352269_1037929939958531114_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_47_494195634_1164449352362373_6869901774190052183_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_48_503755178_1200598141812298_5105047416147215855_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    const kind = index === 0 ? 'cover' : 'gallery';
    uploadedUrls.push(await uploadImage(supabase, spotSlug, kind, filePath, index + 1));
  }

  const catalogPaths = [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ];

  const now = new Date().toISOString();

  for (const catalogPath of catalogPaths) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const spot = catalog.spots.find((entry) => entry.slug === spotSlug);

    if (!spot) {
      throw new Error(`No se encontró ${spotSlug} en ${catalogPath}`);
    }

    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.updated_at = now;

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries?.find((item) => item.slug === spotSlug);

  if (entry) {
    entry.lastReviewedAt = now;
    entry.missingFields = Array.isArray(entry.missingFields)
      ? entry.missingFields.filter((field) => field !== 'photos')
      : [];
    entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
    entry.notes.push(
      'Se reemplazó la portada genérica por una tanda manual de fotos reales de comida, postres y coctelería de La Bohème.',
    );
  }

  tracker.updatedAt = now;
  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_urls: uploadedUrls,
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

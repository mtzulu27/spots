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
  const assetPath = `${slugify(spotSlug)}/${kind}/entre-costas-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'entre-costas';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_16_657972499_17956017558099917_5935345308178054050_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_12_669869742_17957847381099917_1141995711709524251_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_13_660883311_17957414406099917_8538164418407971700_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_17_657245454_17955016611099917_1469869131215903839_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_41_582083332_17935375482099917_757539398941428327_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram 8.56.59 p.m./imgi_32_622533868_1278015394347910_1521488961368463848_n.jpg',
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
      'Se cargó una primera tanda manual de fotos de producto y tragos para Entre Costas, priorizando imágenes limpias de comida y contexto de sede.',
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

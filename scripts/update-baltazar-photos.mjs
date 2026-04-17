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
  const assetPath = `${slugify(spotSlug)}/${kind}/baltazar-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'baltazar-y-siete-lunas';
  const imagePaths = [
    '/Users/mateo/Downloads/(3) Instagram/imgi_16_658456873_17858690637625275_1183798506142996843_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_18_657697246_17858015412625275_1955025731561432374_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_20_655043778_17857125861625275_5858234836872757876_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_22_652794600_17856475419625275_9181800693601654554_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_24_650044471_17855985699625275_4347760207694166899_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_26_649086178_17855468355625275_9091529946855421490_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_27_645820786_17855195607625275_1089843273351853773_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 3));
  }

  for (const catalogPath of [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ]) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const spot = catalog.spots.find((entry) => entry.slug === spotSlug);

    if (!spot) {
      throw new Error(`No se encontró ${spotSlug} en ${catalogPath}`);
    }

    const currentGallery = Array.isArray(spot.gallery_urls) ? spot.gallery_urls : [];
    const nextGallery = [...currentGallery];
    for (const url of uploadedUrls) {
      if (!nextGallery.includes(url)) {
        nextGallery.push(url);
      }
    }

    spot.gallery_urls = nextGallery;
    spot.updated_at = new Date().toISOString();

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries.find((item) => item.slug === spotSlug);

    if (entry) {
    entry.missingFields = entry.missingFields.filter((field) => field !== 'photos');
    entry.notes = [
      'Se sumó una nueva tanda manual de fotos de producto al catálogo sin reemplazar las anteriores.',
      ...entry.notes.filter((note) => !note.toLowerCase().includes('fotos')),
    ];
    entry.lastReviewedAt = new Date().toISOString();
    tracker.updatedAt = new Date().toISOString();
    writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
  }

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        cover_image_url: uploadedUrls[0],
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

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
  const assetPath = `${slugify(spotSlug)}/${kind}/montolivo-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'montolivo';
  const imagePaths = [
    '/Users/mateo/Downloads/(3) Instagram/imgi_11_543706901_18384197764135339_8950097222565688428_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_14_623416042_18403819042135339_5506575096630159222_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_17_588723214_18396939412135339_1616097003724054156_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_21_572168527_18392152201135339_4865682342933018636_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_22_517945166_18376608787135339_4313741127836487947_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 4));
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
    entry.notes = [
      'Se sumó una nueva tanda manual de fotos de pasta y platos fuertes sin reemplazar la portada anterior.',
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
        added_gallery_urls: uploadedUrls,
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

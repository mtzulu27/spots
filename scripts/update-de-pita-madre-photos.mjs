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
  const assetPath = `${slugify(spotSlug)}/${kind}/de-pita-madre-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'de-pita-madre';
  const coverPath =
    '/Users/mateo/Downloads/Instagram/imgi_13_625340652_905788298621803_4538448342242315671_n.jpg';
  const galleryPaths = [
    '/Users/mateo/Downloads/Instagram/imgi_13_625340652_905788298621803_4538448342242315671_n.jpg',
    '/Users/mateo/Downloads/Instagram/imgi_18_588864274_1981969062645997_5323083768705852966_n.jpg',
    '/Users/mateo/Downloads/Instagram/imgi_19_588805443_1697883681199575_6229741886075321977_n.jpg',
    '/Users/mateo/Downloads/Instagram/imgi_22_573241182_4342359329372148_394347978512896027_n.jpg',
  ];

  const coverUrl = await uploadImage(supabase, spotSlug, 'cover', coverPath, 1);
  const galleryUrls = [];
  for (const [index, filePath] of galleryPaths.entries()) {
    galleryUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 1));
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

    spot.cover_image_url = coverUrl;
    spot.gallery_urls = galleryUrls;
    spot.updated_at = new Date().toISOString();

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries.find((item) => item.slug === spotSlug);

  if (entry) {
    entry.internalTag = 'followup-contact';
    entry.missingFields = entry.missingFields.filter((field) => field !== 'photos');
    entry.notes = [
      ...entry.notes.filter((note) => !note.toLowerCase().includes('fotos')),
      'Se cargó una tanda manual de fotos de producto para dejar portada y galería base del lugar.',
    ];
    entry.lastReviewedAt = new Date().toISOString();
    tracker.updatedAt = new Date().toISOString();
    writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
  }

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        cover_image_url: coverUrl,
        gallery_urls: galleryUrls,
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

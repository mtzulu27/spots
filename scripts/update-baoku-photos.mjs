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
  const assetPath = `${slugify(spotSlug)}/${kind}/baoku-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'baoku';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_11_657724349_18351376198236607_4085875242708010599_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_13_657173275_18349520413236607_7484602747437127174_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_14_652182514_18347773696236607_6238865126354108365_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_15_650414304_18346718914236607_8195065773696964538_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_17_642762625_18345609769236607_7306037621571721473_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_18_639903555_18344570647236607_1965823613146333157_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_19_637689123_18343813543236607_6981134978334346338_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(
      await uploadImage(supabase, spotSlug, index === 0 ? 'cover' : 'gallery', filePath, index + 1),
    );
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
  const entry = tracker.entries.find((item) => item.slug === spotSlug);

  if (entry) {
    entry.missingFields = (entry.missingFields ?? []).filter((field) => field !== 'photos');
    entry.notes = [
      'Se cargó una tanda manual de fotos de baos, entradas y platos fuertes para Baoku.',
      ...(entry.notes ?? []).filter((note) => !note.toLowerCase().includes('foto')),
    ];
    entry.lastReviewedAt = now;
    tracker.updatedAt = now;
    writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
  }

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

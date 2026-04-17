import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line ? line.slice(key.length + 1).trim() : '';
}

async function uploadImage(supabase, assetPath, filePath) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const normalizedPath = assetPath.endsWith(`.${extension}`) ? assetPath : `${assetPath}.${extension}`;

  const { error } = await supabase.storage
    .from('spots-media')
    .upload(normalizedPath, imageBuffer, {
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`No se pudo subir ${filePath}: ${error.message}`);
  }

  const { data } = supabase.storage.from('spots-media').getPublicUrl(normalizedPath);
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

  const memorialGalleryUrl = await uploadImage(
    supabase,
    `memorial/gallery/memorial-gallery-2-${Date.now()}`,
    '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776032482189/photos/photo-07.jpg',
  );

  const catalogPaths = [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ];

  const now = new Date().toISOString();

  for (const catalogPath of catalogPaths) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

    const memorial = catalog.spots.find((entry) => entry.slug === 'memorial');
    if (!memorial) throw new Error(`No se encontró memorial en ${catalogPath}`);
    memorial.gallery_urls = [
      memorial.cover_image_url,
      memorialGalleryUrl,
    ].filter(Boolean);
    memorial.updated_at = now;

    const brunch = catalog.spots.find((entry) => entry.slug === 'brunch-house');
    if (!brunch) throw new Error(`No se encontró brunch-house en ${catalogPath}`);
    brunch.cover_image_url = '';
    brunch.gallery_urls = [];
    brunch.updated_at = now;

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));

  const memorialEntry = tracker.entries.find((entry) => entry.slug === 'memorial');
  if (memorialEntry) {
    memorialEntry.missingFields = memorialEntry.missingFields.filter((field) => field !== 'photos');
    memorialEntry.notes = [
      'Se dejaron dos fotos limpias del bar/interior en el catálogo.',
      ...memorialEntry.notes.filter((note) => !note.toLowerCase().includes('foto')),
    ];
    memorialEntry.lastReviewedAt = now;
  }

  const brunchEntry = tracker.entries.find((entry) => entry.slug === 'brunch-house');
  if (brunchEntry) {
    const fields = new Set(brunchEntry.missingFields || []);
    fields.add('photos');
    brunchEntry.missingFields = [...fields];
    brunchEntry.notes = [
      'Las fotos recolectadas en esta tanda se descartaron porque seguían siendo promocionales o con mucho texto.',
      ...brunchEntry.notes.filter((note) => !note.toLowerCase().includes('foto')),
    ];
    brunchEntry.lastReviewedAt = now;
  }

  tracker.updatedAt = now;
  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');

  console.log(
    JSON.stringify(
      {
        memorial_gallery_url: memorialGalleryUrl,
        brunch_house_photos_cleared: true,
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

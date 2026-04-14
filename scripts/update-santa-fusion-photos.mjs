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
  const assetPath = `${slugify(spotSlug)}/${kind}/santa-fusion-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'santa-fusion';
  const imagePaths = [
    '/Users/mateo/Downloads/(3) Instagram/imgi_7_642586587_1577915043272507_7648541730696471369_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_16_655178991_1319343603356098_5865884866388241938_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_18_651985371_18029706431627973_7273446257047229709_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_20_649519423_18028255589627973_454091146916988479_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_23_628695666_18026696453627973_8395708598450714815_n.jpg',
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
    entry.missingFields = entry.missingFields.filter((field) => field !== 'photos');
    entry.notes = [
      'Se sumó una nueva tanda manual de fotos de producto y café al catálogo sin reemplazar la portada anterior.',
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

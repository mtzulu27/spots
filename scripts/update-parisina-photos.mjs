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
  const assetPath = `${slugify(spotSlug)}/${kind}/parisina-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'parisina';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_12_572138948_17918412018195698_8871905631916961261_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_15_572115740_17918101059195698_4396623504511132725_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_23_567446710_17917267800195698_4337189625964060373_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_33_559442318_17915668713195698_2212122596715353563_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_35_559466216_17915668551195698_8904743353789866617_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_45_589368919_17921211729195698_5789275919988246453_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 5));
  }

  const catalogPaths = [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ];

  for (const catalogPath of catalogPaths) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const spot = catalog.spots.find((entry) => entry.slug === spotSlug);

    if (!spot) {
      throw new Error(`No se encontró ${spotSlug} en ${catalogPath}`);
    }

    const currentGallery = Array.isArray(spot.gallery_urls) ? spot.gallery_urls : [];
    const mergedGallery = [...currentGallery, ...uploadedUrls];
    spot.gallery_urls = mergedGallery;
    spot.updated_at = new Date().toISOString();

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries?.find((item) => item.slug === spotSlug);

  if (entry) {
    entry.lastReviewedAt = new Date().toISOString();
    entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
    entry.notes.push(
      'Se sumó una nueva tanda manual de fotos de bebidas y producto para reforzar la ficha sin reemplazar la portada actual.',
    );
  }

  tracker.updatedAt = new Date().toISOString();

  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        added: uploadedUrls.length,
        uploadedUrls,
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

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
  const assetPath = `${slugify(spotSlug)}/${kind}/makibar-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'makibar';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_23_611266173_18080200181518967_105036303455543072_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_18_658338686_18318714445268405_5060747284383463986_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_36_645793547_18086014814518967_1384925935721146488_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_18_612408675_18080197061518967_355192114796389583_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_39_639743089_18085250096518967_3976247952254505063_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_27_604359075_18078747680518967_3043743400208668796_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_37_588397857_18077152484518967_6687993172429278189_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_21_612504153_18080485907518967_1717588597083427934_n.jpg',
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
      'Se cargó una tanda manual de fotos de sushi, coctelería y platos de Maki Bar para reemplazar la ficha vacía inicial.',
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

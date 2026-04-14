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
  const assetPath = `${slugify(spotSlug)}/${kind}/fusion-wok-${kind}-${index}-${Date.now()}.${extension}`;

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
  const envContent = readFileSync('/Users/mateo/Documents/Playground/apps/mobile/.env.local', 'utf8');
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

  const spotSlug = 'fusion-wok';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_12_573591240_18532965301010329_5223641635140749187_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_13_566225764_18531869980010329_4689340974260504477_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_14_563448724_18530780422010329_7734015697784527290_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_16_555607248_18527867998010329_2000812885409426659_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_17_551866419_18526436947010329_751801059245456588_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_20_541228440_18522342973010329_8697893528422346671_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_21_539957426_18521098933010329_1951689867161123927_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_29_517375520_18512822434010329_2318383091595002885_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_32_508690317_18508722991010329_4919953696263980227_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_33_505399393_18507345418010329_3779849126536461028_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_45_491464103_18496856908010329_2267458106634960950_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_46_489870202_18495982561010329_8759060570003253650_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    const kind = index === 0 ? 'cover' : 'gallery';
    uploadedUrls.push(await uploadImage(supabase, spotSlug, kind, filePath, index + 1));
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

    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
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
      'Se reemplazó la tanda anterior de fotos por una nueva selección manual más fuerte de producto para Fusion Wok.',
    );
    tracker.updatedAt = entry.lastReviewedAt;
    writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
  }

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        cover_image_url: uploadedUrls[0] ?? '',
        gallery_count: uploadedUrls.length,
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

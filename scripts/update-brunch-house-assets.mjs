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
  const assetPath = `${slugify(spotSlug)}/${kind}/brunch-house-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'brunch-house';
  const coverPath =
    '/Users/mateo/Downloads/(2) Instagram/imgi_16_561503795_17886850758370309_2488313303332362599_n.jpg';
  const galleryPaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_16_561503795_17886850758370309_2488313303332362599_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_20_558981577_17886062433370309_8757298548055448020_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_24_601332611_17894944977370309_8943583650367317577_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_36_583465266_17891599662370309_7568541810740097907_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_46_582314169_2015307162559644_4702592814851215133_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_48_530328088_17879661951370309_5786914574000917438_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_49_527986292_17879402694370309_783353496939307743_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_50_528718670_17879292534370309_1482640261986191176_n.jpg',
  ];

  const coverUrl = await uploadImage(supabase, spotSlug, 'cover', coverPath, 1);
  const galleryUrls = [];
  for (const [index, filePath] of galleryPaths.entries()) {
    galleryUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 1));
  }

  const now = new Date().toISOString();

  for (const catalogPath of [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ]) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const spot = catalog.spots.find((entry) => entry.slug === spotSlug);

    if (!spot) {
      throw new Error(`No se encontró ${spotSlug} en ${catalogPath}`);
    }

    const branchSantaElena = catalog.branches.find(
      (branch) => branch.slug === 'brunch-house-santa-elena-cali',
    );
    const branchCiudadJardin = catalog.branches.find(
      (branch) => branch.slug === 'brunch-house-bio-mall-cali',
    );

    if (!branchSantaElena || !branchCiudadJardin) {
      throw new Error('No se encontraron las dos sedes esperadas de Brunch’s House.');
    }

    branchSantaElena.menu_url =
      'https://storage2.me-qr.com/pdf/80990d4e-cd0f-48e0-ad85-132a2ce19c2f.pdf?time=1775915047';
    branchSantaElena.hours = 'Lun-Sab 08:00-18:00 · Dom 08:00-17:00';
    branchCiudadJardin.mall = 'Bio Mall';
    branchCiudadJardin.menu_url =
      'https://storage2.me-qr.com/pdf/3bf132d1-6176-410d-9e60-1586a193eb85.pdf?time=1775915066';
    branchCiudadJardin.hours =
      'Lun-Jue 08:00-21:00 · Vie 08:00-23:30 · Sab 08:00-21:00 · Dom 08:00-18:00';

    spot.cover_image_url = coverUrl;
    spot.gallery_urls = galleryUrls;
    spot.updated_at = now;

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries.find((item) => item.slug === spotSlug);

  if (entry) {
    entry.internalTag = 'followup-pricing-whatsapp';
    entry.missingFields = entry.missingFields.filter((field) => field !== 'photos');
    entry.notes = [
      'Se cargó una tanda manual fuerte de fotos de brunch, platos y bebidas para las dos sedes.',
      'Los horarios de Ciudad Jardín y Santa Elena quedaron reconfirmados con capturas separadas por sede.',
      'Los menús por sede quedaron apuntando directo a los PDFs de Santa Elena y Bio Mall, sin pasar por QR intermedio.',
      ...entry.notes.filter(
        (note) =>
          !note.toLowerCase().includes('fotos') &&
          !note.toLowerCase().includes('horarios') &&
          !note.toLowerCase().includes('menú')
      ),
    ];
    entry.lastReviewedAt = now;
    tracker.updatedAt = now;
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

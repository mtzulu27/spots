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
  const assetPath = `${slugify(spotSlug)}/${kind}/sorsi-${kind}-${index}-${Date.now()}.${extension}`;

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

function upsertBranchHours(rows, branchId, weeklyHours) {
  const remaining = Array.isArray(rows) ? rows.filter((row) => row.branch_id !== branchId) : [];
  return [...remaining, ...weeklyHours];
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

  const spotSlug = 'sorsi';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_13_669887872_18401607652148533_5562447836261719276_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_15_659516574_18574598548017396_6532611103202345642_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, 'gallery', filePath, index + 3));
  }

  const weeklyHours = [
    { id: 1, day_of_week: 1, is_closed: false, open_time: '16:00:00', close_time: '23:00:00', split_open_time: null, split_close_time: null, sort_order: 10 },
    { id: 2, day_of_week: 2, is_closed: false, open_time: '16:00:00', close_time: '23:00:00', split_open_time: null, split_close_time: null, sort_order: 20 },
    { id: 3, day_of_week: 3, is_closed: false, open_time: '16:00:00', close_time: '23:00:00', split_open_time: null, split_close_time: null, sort_order: 30 },
    { id: 4, day_of_week: 4, is_closed: false, open_time: '16:00:00', close_time: '23:00:00', split_open_time: null, split_close_time: null, sort_order: 40 },
    { id: 5, day_of_week: 5, is_closed: false, open_time: '16:00:00', close_time: '01:00:00', split_open_time: null, split_close_time: null, sort_order: 50 },
    { id: 6, day_of_week: 6, is_closed: false, open_time: '16:00:00', close_time: '01:00:00', split_open_time: null, split_close_time: null, sort_order: 60 },
    { id: 7, day_of_week: 0, is_closed: false, open_time: '16:00:00', close_time: '23:00:00', split_open_time: null, split_close_time: null, sort_order: 70 },
  ];

  for (const catalogPath of [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ]) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const spot = catalog.spots.find((entry) => entry.slug === spotSlug);

    if (!spot) {
      throw new Error(`No se encontró ${spotSlug} en ${catalogPath}`);
    }

    const branch = catalog.branches.find((entry) => entry.slug === 'sorsi-cali');

    if (!branch) {
      throw new Error(`No se encontró la sede sorsi-cali en ${catalogPath}`);
    }

    const now = new Date().toISOString();
    spot.name = 'Sorsi | Buchetta del Vino';
    spot.short_description =
      'Un wine bar pequeño y romántico en Lago Verde para aperitivo, vino y una salida especial. Se siente ideal para pareja, plan tranqui o una mesa corta entre amigos con algo rico para compartir.';
    const currentGallery = Array.isArray(spot.gallery_urls) ? spot.gallery_urls : [];
    const nextGallery = [...currentGallery];
    for (const url of uploadedUrls) {
      if (!nextGallery.includes(url)) {
        nextGallery.push(url);
      }
    }

    spot.gallery_urls = nextGallery;
    spot.tags = ['vino', 'wine bar', 'aperitivo', 'buchetta', 'romántico', 'lago verde'];
    spot.moods = ['pareja', 'algo especial', 'plan tranqui', 'tomar algo'];
    spot.updated_at = now;

    branch.address = 'Parque Comercial Lago Verde, Calle 16A #122-70, Cali';
    branch.neighborhood = 'Pance';
    branch.mall = 'Parque Comercial Lago Verde';
    branch.max_people = 4;
    branch.menu_url = 'https://menupp.co/sorsi';
    branch.instagram = 'https://www.instagram.com/sorsi_cali/';
    branch.hours = 'Lun-Jue 16:00-23:00 · Vie-Sáb 16:00-01:00 · Dom 16:00-23:00';
    branch.updated_at = now;

    const rows = weeklyHours.map((row) => ({ ...row, branch_id: branch.id }));
    catalog.branchHours = upsertBranchHours(catalog.branchHours, branch.id, rows);
    catalog.hours = upsertBranchHours(catalog.hours, branch.id, rows);

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  console.log(
    JSON.stringify(
      {
        slug: spotSlug,
        uploaded_gallery_urls: uploadedUrls,
        gallery_urls: uploadedUrls,
        menu_url: 'https://menupp.co/sorsi',
        hours: 'Lun-Jue 16:00-23:00 · Vie-Sáb 16:00-01:00 · Dom 16:00-23:00',
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

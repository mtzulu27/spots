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
  const assetPath = `${slugify(spotSlug)}/${kind}/cappriato-${kind}-${index}-${Date.now()}.${extension}`;

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

const WEEKLY_CAPPRIATO_HOURS = [
  { day_of_week: 1, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 10 },
  { day_of_week: 2, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 20 },
  { day_of_week: 3, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 30 },
  { day_of_week: 4, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 40 },
  { day_of_week: 5, is_closed: false, open_time: '12:30:00', close_time: '22:00:00', split_open_time: null, split_close_time: null, sort_order: 50 },
  { day_of_week: 6, is_closed: false, open_time: '12:30:00', close_time: '22:00:00', split_open_time: null, split_close_time: null, sort_order: 60 },
  { day_of_week: 0, is_closed: false, open_time: '12:30:00', close_time: '21:30:00', split_open_time: null, split_close_time: null, sort_order: 70 },
];

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

  const spotSlug = 'capriatto';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_24_485269262_17892047184195932_1804533737575589324_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_20_491439625_17896066188195932_4230460223488170183_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_25_483755984_17891048148195932_5419361843164369144_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_26_485126375_17892046911195932_4620845309076196399_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_28_480086717_17888352597195932_350686215970972566_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_29_479532038_17887820031195932_8349755498584078251_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_38_470359313_17880766977195932_7058924028700717363_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_40_625167554_17938367391116204_2946911844804340755_n.jpg',
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

    const granadaBranch = catalog.branches.find((entry) => entry.slug === 'capriatto-granada-cali');
    const leyendaBranch = catalog.branches.find((entry) => entry.slug === 'capriatto-mall-la-leyenda-cali');

    if (!granadaBranch || !leyendaBranch) {
      throw new Error(`No se encontraron las sedes de ${spotSlug} en ${catalogPath}`);
    }

    const now = new Date().toISOString();

    spot.name = 'Cappriato';
    spot.short_description =
      'Cappriato se siente más de sándwich bien armado y tarde relajada que de comida rápida al paso. Entre focaccias como la Molto Caprese o la Tre Pistacchio, burrata, berenjena parmigiana y un Aperol para acompañar, funciona muy bien para almorzar rico, caer a media tarde o sentarse un rato a comer algo más especial en Granada o Ciudad Jardín.';
    spot.cover_image_url = uploadedUrls[0] ?? '';
    spot.gallery_urls = uploadedUrls;
    spot.tags = ['sandwiches', 'focaccia', 'burrata', 'aperol', 'granada', 'ciudad jardin'];
    spot.moods = ['comer rico', 'algo especial', 'pareja', 'con amigos'];
    spot.updated_at = now;

    const branches = [granadaBranch, leyendaBranch];
    for (const branch of branches) {
      branch.menu_url = 'https://menupp.co/cappriato';
      branch.instagram = 'https://www.instagram.com/cappriato/';
      branch.min_budget = 35000;
      branch.max_budget = 120000;
      branch.hours = 'Lun-Jue 12:30 PM-9:00 PM; Vie-Sab 12:30 PM-10:00 PM; Dom-Fest 12:30 PM-9:30 PM';
      branch.updated_at = now;
    }

    const granadaRows = WEEKLY_CAPPRIATO_HOURS.map((row, index) => ({ ...row, id: 792 + index, branch_id: granadaBranch.id }));
    const leyendaRows = WEEKLY_CAPPRIATO_HOURS.map((row, index) => ({ ...row, id: 799 + index, branch_id: leyendaBranch.id }));

    catalog.branchHours = upsertBranchHours(
      upsertBranchHours(catalog.branchHours, granadaBranch.id, granadaRows),
      leyendaBranch.id,
      leyendaRows,
    );
    catalog.hours = upsertBranchHours(
      upsertBranchHours(catalog.hours, granadaBranch.id, granadaRows),
      leyendaBranch.id,
      leyendaRows,
    );

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
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

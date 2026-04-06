import { readFileSync } from 'node:fs';
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
  const assetPath = `${slugify(spotSlug)}/${kind}/la-querencia-${kind}-${index}-${Date.now()}.${extension}`;

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

async function replaceBranchSchedules(supabase, branchId, weeklyHours) {
  const { error: deleteHoursError } = await supabase
    .from('spot_branch_hours')
    .delete()
    .eq('branch_id', branchId);

  if (deleteHoursError) {
    throw new Error(`No se pudieron borrar horarios previos de branch ${branchId}: ${deleteHoursError.message}`);
  }

  const { error: deleteExceptionsError } = await supabase
    .from('spot_branch_schedule_exceptions')
    .delete()
    .eq('branch_id', branchId);

  if (deleteExceptionsError) {
    throw new Error(`No se pudieron borrar excepciones previas de branch ${branchId}: ${deleteExceptionsError.message}`);
  }

  const rows = weeklyHours.map((row) => ({
    branch_id: branchId,
    day_of_week: row.day_of_week,
    is_closed: row.is_closed,
    open_time: row.open_time,
    close_time: row.close_time,
    split_open_time: row.split_open_time ?? null,
    split_close_time: row.split_close_time ?? null,
    sort_order: row.sort_order,
  }));

  const { error: insertError } = await supabase.from('spot_branch_hours').insert(rows);

  if (insertError) {
    throw new Error(`No se pudieron crear horarios nuevos de branch ${branchId}: ${insertError.message}`);
  }
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

  const targetSpotSlug = 'la-querencia';
  const targetBranchSlug = 'la-querencia-santa-monica';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_21_624912179_18161026774406646_6820220074146780441_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_23_624240253_18108400534737065_7969484438133260881_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_26_622056279_18118127530599641_3183781629052978312_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_29_622675902_18080458775520775_5002121013797342850_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_32_621193007_18101685160895121_263165463464538747_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, targetSpotSlug, index === 0 ? 'cover' : 'gallery', filePath, index + 1));
  }

  const { data: existingSpot, error: existingSpotError } = await supabase
    .from('spots')
    .select('id, slug')
    .in('slug', ['restaurante-la-querencia', targetSpotSlug])
    .limit(2);

  if (existingSpotError) {
    throw new Error(`No se pudo leer el lugar actual: ${existingSpotError.message}`);
  }

  const spotRow = (existingSpot ?? []).find((row) => row.slug === targetSpotSlug)
    ?? (existingSpot ?? []).find((row) => row.slug === 'restaurante-la-querencia');

  if (!spotRow) {
    throw new Error('No se encontró el registro actual de La Querencia');
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      slug: targetSpotSlug,
      name: 'La Querencia',
      short_description:
        'Parrilla argentina en Cali con cocteles, comedor privado y horario de almuerzo y cena en Santa Monica.',
      cover_image_url: uploadedUrls[0],
      gallery_urls: uploadedUrls,
      category: 'Restaurantes',
      city: 'Cali',
      tags: ['parrilla argentina', 'carnes', 'santa monica', 'cocteles', 'almuerzo', 'cena'],
      moods: ['comer rico', 'algo especial', 'con amigos', 'familiar'],
      is_active: true,
      is_featured: false,
    })
    .eq('id', spotRow.id)
    .select('id, slug, name')
    .single();

  if (spotError || !spot) {
    throw new Error(`No se pudo actualizar ${spotRow.slug}: ${spotError?.message ?? 'sin detalle'}`);
  }

  const { data: existingBranches, error: existingBranchesError } = await supabase
    .from('spot_branches')
    .select('id')
    .eq('spot_id', spot.id);

  if (existingBranchesError) {
    throw new Error(`No se pudieron leer sedes existentes: ${existingBranchesError.message}`);
  }

  for (const branch of existingBranches ?? []) {
    await replaceBranchSchedules(supabase, branch.id, []);
  }

  const { error: deleteBranchesError } = await supabase
    .from('spot_branches')
    .delete()
    .eq('spot_id', spot.id);

  if (deleteBranchesError) {
    throw new Error(`No se pudieron borrar sedes previas: ${deleteBranchesError.message}`);
  }

  const { data: savedBranch, error: insertBranchError } = await supabase
    .from('spot_branches')
    .insert({
      spot_id: spot.id,
      slug: targetBranchSlug,
      neighborhood: 'Santa Monica Residencial',
      mall: '',
      hours: 'Dom 12:00-16:00 · Lun-Jue 12:00-16:00 / 18:00-21:30 · Vie-Sab 12:00-16:00 / 18:00-22:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'Av. 8 Nte. #23N-79, Santa Monica Residencial, Cali',
      min_budget: 0,
      max_budget: 0,
      max_people: 6,
      menu_url: '',
      whatsapp: '',
      phone: '6024070609',
      instagram: 'https://www.instagram.com/la_querencia_restaurante/',
      latitude: null,
      longitude: null,
      is_active: true,
      sort_order: 10,
    })
    .select('id, slug')
    .single();

  if (insertBranchError || !savedBranch) {
    throw new Error(`No se pudo crear la sede nueva: ${insertBranchError?.message ?? 'sin detalle'}`);
  }

  await replaceBranchSchedules(supabase, savedBranch.id, [
    {
      day_of_week: 1,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '21:30:00',
      sort_order: 10,
    },
    {
      day_of_week: 2,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '21:30:00',
      sort_order: 20,
    },
    {
      day_of_week: 3,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '21:30:00',
      sort_order: 30,
    },
    {
      day_of_week: 4,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '21:30:00',
      sort_order: 40,
    },
    {
      day_of_week: 5,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '22:00:00',
      sort_order: 50,
    },
    {
      day_of_week: 6,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: '18:00:00',
      split_close_time: '22:00:00',
      sort_order: 60,
    },
    {
      day_of_week: 0,
      is_closed: false,
      open_time: '12:00:00',
      close_time: '16:00:00',
      split_open_time: null,
      split_close_time: null,
      sort_order: 70,
    },
  ]);

  console.log(
    JSON.stringify(
      {
        spot,
        uploadedUrls,
        savedBranch,
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

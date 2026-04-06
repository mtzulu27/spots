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
  const assetPath = `${slugify(spotSlug)}/${kind}/espacio-1060-${kind}-${index}-${Date.now()}.${extension}`;

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

  if (!rows.length) {
    return;
  }

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

  const spotSlug = 'espacio-10-60';
  const branchSlug = 'espacio-10-60-centro';
  const imagePaths = [
    '/Users/mateo/Downloads/(3) Instagram/imgi_33_589128610_17869073610483413_4854136745719347987_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_34_589094659_17868137433483413_1694012809459551685_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_47_587766641_17867417232483413_759733892348827203_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_51_573968842_18313716934220402_7411386825282081308_n.jpg',
    '/Users/mateo/Downloads/(3) Instagram/imgi_59_587014688_17867414313483413_8606435644563305752_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(
      await uploadImage(supabase, spotSlug, index === 0 ? 'cover' : 'gallery', filePath, index + 1),
    );
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      name: 'Espacio 10-60',
      short_description:
        'Discoteca multi-salas en el centro de Cali con programacion de miercoles a domingo y jueves de 2x1 en cocteles.',
      cover_image_url: uploadedUrls[0],
      gallery_urls: uploadedUrls,
      category: 'Vida nocturna',
      city: 'Cali',
      tags: ['discoteca multi-salas', 'centro', 'rooftop', 'cocteles', 'dj', 'vida nocturna'],
      moods: ['noche', 'fiesta', 'con amigos', 'tomar algo', 'algo especial'],
      is_active: true,
      is_featured: false,
    })
    .eq('slug', spotSlug)
    .select('id, slug, name')
    .single();

  if (spotError || !spot) {
    throw new Error(`No se pudo actualizar ${spotSlug}: ${spotError?.message ?? 'sin detalle'}`);
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
      slug: branchSlug,
      neighborhood: 'Centro',
      mall: '',
      hours: 'Lun-Mar Cerrado · Mie-Sab 20:00-23:59 / 00:00-03:00 · Dom 20:00-23:59 / 00:00-03:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'Cra 10 #10-60, Centro, Cali',
      min_budget: 50000,
      max_budget: 60000,
      max_people: 10,
      menu_url: 'https://website.beacons.ai/espacio1060?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnGq5LuG0tJS9MF1wFbISoKLNollMlmWQkY8VkHQ8Z5F5nc8k3k456KUDcpPk_aem_Y1_7X5Gl_HjA6_-dfIeqHw',
      whatsapp: '',
      phone: '3167405607',
      instagram: 'https://www.instagram.com/espacio1060/',
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
    { day_of_week: 1, is_closed: true, open_time: null, close_time: null, sort_order: 10 },
    { day_of_week: 2, is_closed: true, open_time: null, close_time: null, sort_order: 20 },
    {
      day_of_week: 3,
      is_closed: false,
      open_time: '00:00:00',
      close_time: '03:00:00',
      split_open_time: '20:00:00',
      split_close_time: '23:59:00',
      sort_order: 30,
    },
    {
      day_of_week: 4,
      is_closed: false,
      open_time: '00:00:00',
      close_time: '03:00:00',
      split_open_time: '20:00:00',
      split_close_time: '23:59:00',
      sort_order: 40,
    },
    {
      day_of_week: 5,
      is_closed: false,
      open_time: '00:00:00',
      close_time: '03:00:00',
      split_open_time: '20:00:00',
      split_close_time: '23:59:00',
      sort_order: 50,
    },
    {
      day_of_week: 6,
      is_closed: false,
      open_time: '00:00:00',
      close_time: '03:00:00',
      split_open_time: '20:00:00',
      split_close_time: '23:59:00',
      sort_order: 60,
    },
    {
      day_of_week: 0,
      is_closed: false,
      open_time: '00:00:00',
      close_time: '03:00:00',
      split_open_time: '20:00:00',
      split_close_time: '23:59:00',
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

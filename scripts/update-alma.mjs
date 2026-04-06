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
  const assetPath = `${slugify(spotSlug)}/${kind}/alma-${kind}-${index}-${Date.now()}.${extension}`;

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

  const currentSpotSlugs = ['alma-restaurante-cali', 'alma-restaurante'];
  const targetSpotSlug = 'alma';
  const targetBranchSlug = 'alma-cristo-rey';
  const coverPath =
    '/Users/mateo/Downloads/(2) Instagram/imgi_19_655829915_17872329978585899_6480957583414070128_n.jpg';

  const coverUrl = await uploadImage(supabase, targetSpotSlug, 'cover', coverPath, 1);

  const { data: existingSpot, error: existingSpotError } = await supabase
    .from('spots')
    .select('id, slug')
    .in('slug', [...currentSpotSlugs, targetSpotSlug])
    .limit(3);

  if (existingSpotError) {
    throw new Error(`No se pudo leer el lugar actual: ${existingSpotError.message}`);
  }

  const spotRow = (existingSpot ?? []).find((row) => row.slug === targetSpotSlug)
    ?? (existingSpot ?? []).find((row) => currentSpotSlugs.includes(row.slug));

  if (!spotRow) {
    throw new Error('No se encontró el registro actual de ALMA');
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      slug: targetSpotSlug,
      name: 'ALMA',
      short_description:
        'Restaurante en Cali de cocina de llama eterna, pet friendly, con reservas solo por WhatsApp en la via a Cristo Rey.',
      cover_image_url: coverUrl,
      gallery_urls: [coverUrl],
      category: 'Restaurantes',
      city: 'Cali',
      tags: ['cocina de llama eterna', 'cristo rey', 'pet friendly', 'pizza', 'pastas', 'cocteles'],
      moods: ['algo especial', 'comer rico', 'con amigos', 'cita'],
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
      neighborhood: 'Los Cristales Tejares',
      mall: '',
      hours: 'Lun-Mar Cerrado · Mie-Vie 17:00-22:00 · Sab 12:00-22:00 · Dom 12:00-21:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'KM 6 Vía Cristo Rey, Los Cristales Tejares, Cali',
      min_budget: 15000,
      max_budget: 100000,
      max_people: 6,
      menu_url: 'https://menupp.co/almarestaurante/venue/PFu3xJrjDvj0joI39t1q/menu/mDLSquxScA91MzdP5YEx',
      whatsapp: 'https://wa.me/573105570048',
      phone: '3105570048',
      instagram: 'https://www.instagram.com/alma.restaurante_cali/',
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
    { day_of_week: 3, is_closed: false, open_time: '17:00:00', close_time: '22:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '17:00:00', close_time: '22:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '17:00:00', close_time: '22:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '12:00:00', close_time: '22:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '12:00:00', close_time: '21:00:00', sort_order: 70 },
  ]);

  console.log(
    JSON.stringify(
      {
        spot,
        coverUrl,
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

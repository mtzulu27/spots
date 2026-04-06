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
  const assetPath = `${slugify(spotSlug)}/${kind}/tierradentro-${kind}-${index}-${Date.now()}.${extension}`;

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
    split_open_time: null,
    split_close_time: null,
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

  const spotSlug = 'tierradentro-cafe-co';
  const imagePaths = [
    '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/TemporaryItems/NSIRD_screencaptureui_imKYqC/Captura de pantalla 2026-04-03 a la(s) 8.39.29 p.m..png',
    '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/TemporaryItems/NSIRD_screencaptureui_fCY5vh/Captura de pantalla 2026-04-03 a la(s) 8.39.37 p.m..png',
    '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/TemporaryItems/NSIRD_screencaptureui_3TpYNe/Captura de pantalla 2026-04-03 a la(s) 8.39.50 p.m..png',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, index === 0 ? 'cover' : 'gallery', filePath, index + 1));
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      name: 'Tierradentro Café & Co.',
      short_description:
        'Cafeteria en Cali reconocida como Best Coffee Shop 2025, con sedes activas en San Antonio y Las Lomas.',
      cover_image_url: uploadedUrls[0],
      gallery_urls: uploadedUrls,
      category: 'Restaurantes',
      city: 'Cali',
      tags: ['cafe', 'coffee shop', 'san antonio', 'las lomas', 'cristo rey', 'brunch'],
      moods: ['cafe', 'plan de dia', 'algo especial', 'tranqui'],
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

  const branchesPayload = [
    {
      spot_id: spot.id,
      slug: 'tierradentro-cafe-co-san-antonio',
      neighborhood: 'San Antonio',
      mall: '',
      hours: 'Lun 15:00-22:00 · Mar-Jue 10:00-22:00 · Vie-Sab 10:00-23:00 · Dom 10:00-21:00 · Dom festivo 10:00-23:00',
      holiday_mode: 'same_as_sunday',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'Cra. 12 # 2 - 81, San Antonio, Cali',
      min_budget: 7200,
      max_budget: 45000,
      max_people: 6,
      menu_url: 'https://queresto.com/Tierradentrocafeco',
      whatsapp: 'https://wa.me/573054445097',
      phone: '6023820049',
      instagram: 'https://www.instagram.com/tierradentrocafe/',
      latitude: null,
      longitude: null,
      is_active: true,
      sort_order: 10,
    },
    {
      spot_id: spot.id,
      slug: 'tierradentro-cafe-co-las-lomas',
      neighborhood: 'Las Lomas',
      mall: '',
      hours: 'Mie-Jue 16:00-22:00 · Vie 16:00-00:00 · Sab 14:00-00:00 · Dom 12:00-21:00 · Dom festivo 14:00-00:00 · Lun festivo 14:00-21:00 · Lun-Mar Cerrado',
      holiday_mode: 'custom',
      holiday_open_time: '14:00:00',
      holiday_close_time: '00:00:00',
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'Kilómetro 3.5 vía Cristo Rey, Cali',
      min_budget: 7200,
      max_budget: 45000,
      max_people: 6,
      menu_url: 'https://queresto.com/Tierradentrocafeco',
      whatsapp: 'https://wa.me/573054445097',
      phone: '',
      instagram: 'https://www.instagram.com/tierradentrocafe_laslomas/',
      latitude: null,
      longitude: null,
      is_active: true,
      sort_order: 20,
    },
  ];

  const { data: savedBranches, error: insertBranchesError } = await supabase
    .from('spot_branches')
    .insert(branchesPayload)
    .select('id, slug');

  if (insertBranchesError || !savedBranches) {
    throw new Error(`No se pudieron crear las sedes nuevas: ${insertBranchesError?.message ?? 'sin detalle'}`);
  }

  const branchBySlug = new Map(savedBranches.map((branch) => [branch.slug, branch.id]));

  await replaceBranchSchedules(supabase, branchBySlug.get('tierradentro-cafe-co-san-antonio'), [
    { day_of_week: 1, is_closed: false, open_time: '15:00:00', close_time: '22:00:00', sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '10:00:00', close_time: '22:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '10:00:00', close_time: '22:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '10:00:00', close_time: '22:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '10:00:00', close_time: '23:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '10:00:00', close_time: '23:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '10:00:00', close_time: '21:00:00', sort_order: 70 },
  ]);

  await replaceBranchSchedules(supabase, branchBySlug.get('tierradentro-cafe-co-las-lomas'), [
    { day_of_week: 1, is_closed: true, open_time: null, close_time: null, sort_order: 10 },
    { day_of_week: 2, is_closed: true, open_time: null, close_time: null, sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '16:00:00', close_time: '22:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '16:00:00', close_time: '22:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '16:00:00', close_time: '00:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '14:00:00', close_time: '00:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '12:00:00', close_time: '21:00:00', sort_order: 70 },
  ]);

  console.log(
    JSON.stringify(
      {
        spot,
        uploadedUrls,
        savedBranches,
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

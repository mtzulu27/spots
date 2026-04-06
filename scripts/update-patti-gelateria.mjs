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
  const assetPath = `${slugify(spotSlug)}/${kind}/patti-${kind}-${index}-${Date.now()}.${extension}`;

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

  const spotSlug = 'patti-gelateria';
  const imagePaths = [
    '/Users/mateo/Downloads/(2) Instagram/imgi_26_589097582_18397119124120439_2813699868604231389_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_32_471551241_18350809366120439_2787875482204980423_n.jpg',
    '/Users/mateo/Downloads/(2) Instagram/imgi_30_590404288_18397120822120439_6648537405000653818_n.jpg',
  ];

  const uploadedUrls = [];
  for (const [index, filePath] of imagePaths.entries()) {
    uploadedUrls.push(await uploadImage(supabase, spotSlug, index === 0 ? 'cover' : 'gallery', filePath, index + 1));
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      name: 'Patti Gelateria',
      short_description:
        'Gelateria en Cali con sedes activas en barrios y centros comerciales, bowls de helado y açaí.',
      cover_image_url: uploadedUrls[0],
      gallery_urls: uploadedUrls,
      category: 'Restaurantes',
      city: 'Cali',
      tags: ['gelateria', 'gelato', 'helados', 'postres', 'acai', 'dulce'],
      moods: ['dulce', 'antojo', 'tranqui', 'algo especial'],
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
      slug: 'patti-gelateria-el-penon',
      neighborhood: 'El Peñón',
      address: 'Calle 2 # 2-58, El Peñón, Cali',
      hours: 'Lun-Jue 13:30-20:00 · Vie-Dom y festivos 12:30-21:00',
      holiday_mode: 'custom',
      holiday_open_time: '12:30:00',
      holiday_close_time: '21:00:00',
      sort_order: 10,
    },
    {
      slug: 'patti-gelateria-san-antonio',
      neighborhood: 'San Antonio',
      address: 'Calle 2 # 5-11, San Antonio, Cali',
      hours: 'Lun-Jue 13:30-20:00 · Vie-Dom y festivos 12:30-21:00',
      holiday_mode: 'custom',
      holiday_open_time: '12:30:00',
      holiday_close_time: '21:00:00',
      sort_order: 20,
    },
    {
      slug: 'patti-gelateria-ciudad-jardin',
      neighborhood: 'Ciudad Jardín',
      address: 'Carrera 105 # 14-01, Ciudad Jardín, Cali',
      hours: 'Lun-Jue 13:30-20:00 · Vie-Dom y festivos 12:30-21:00',
      holiday_mode: 'custom',
      holiday_open_time: '12:30:00',
      holiday_close_time: '21:00:00',
      sort_order: 30,
    },
    {
      slug: 'patti-gelateria-granada',
      neighborhood: 'Granada',
      address: 'Calle 20N # 8N-34 Local 5, Granada, Cali',
      hours: 'Lun-Jue 14:00-20:00 · Vie-Dom y festivos 13:30-20:30',
      holiday_mode: 'custom',
      holiday_open_time: '13:30:00',
      holiday_close_time: '20:30:00',
      sort_order: 40,
    },
    {
      slug: 'patti-gelateria-pance-122',
      neighborhood: 'Pance',
      address: 'Cra 122 # 16B-16, Pance, Cali',
      hours: 'Lun-Jue 13:30-20:00 · Vie-Dom y festivos 12:30-20:00',
      holiday_mode: 'custom',
      holiday_open_time: '12:30:00',
      holiday_close_time: '20:00:00',
      sort_order: 50,
    },
    {
      slug: 'patti-gelateria-jardin-plaza',
      neighborhood: 'Ciudad Jardín',
      mall: 'Jardín Plaza',
      address: 'Cra. 98 #16-200, Jardín Plaza, Cali',
      hours: 'Lun-Vie 12:30-19:00 · Sab-Dom 12:30-20:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      sort_order: 60,
    },
    {
      slug: 'patti-gelateria-chipichape',
      neighborhood: 'Chipichape',
      mall: 'Chipichape',
      address: 'Cl. 38 Nte. #6N-45, Chipichape, Cali',
      hours: 'Lun-Vie 12:30-19:00 · Sab-Dom 12:30-20:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      sort_order: 70,
    },
  ].map((branch) => ({
    spot_id: spot.id,
    slug: branch.slug,
    neighborhood: branch.neighborhood,
    mall: branch.mall ?? '',
    hours: branch.hours,
    holiday_mode: branch.holiday_mode,
    holiday_open_time: branch.holiday_open_time,
    holiday_close_time: branch.holiday_close_time,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    address: branch.address,
    min_budget: 22000,
    max_budget: 40000,
    max_people: 4,
    menu_url: '',
    whatsapp: '',
    phone: '3174580568',
    instagram: 'https://www.instagram.com/pattigelateria/',
    latitude: null,
    longitude: null,
    is_active: true,
    sort_order: branch.sort_order,
  }));

  const { data: savedBranches, error: insertBranchesError } = await supabase
    .from('spot_branches')
    .insert(branchesPayload)
    .select('id, slug');

  if (insertBranchesError || !savedBranches) {
    throw new Error(`No se pudieron crear las sedes nuevas: ${insertBranchesError?.message ?? 'sin detalle'}`);
  }

  const bySlug = new Map(savedBranches.map((branch) => [branch.slug, branch.id]));

  const mainSchedule = [
    { day_of_week: 1, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '12:30:00', close_time: '21:00:00', sort_order: 70 },
  ];

  const granadaSchedule = [
    { day_of_week: 1, is_closed: false, open_time: '14:00:00', close_time: '20:00:00', sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '14:00:00', close_time: '20:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '14:00:00', close_time: '20:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '14:00:00', close_time: '20:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '13:30:00', close_time: '20:30:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '13:30:00', close_time: '20:30:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '13:30:00', close_time: '20:30:00', sort_order: 70 },
  ];

  const panceSchedule = [
    { day_of_week: 1, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '13:30:00', close_time: '20:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '12:30:00', close_time: '20:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '12:30:00', close_time: '20:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '12:30:00', close_time: '20:00:00', sort_order: 70 },
  ];

  const mallSchedule = [
    { day_of_week: 1, is_closed: false, open_time: '12:30:00', close_time: '19:00:00', sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '12:30:00', close_time: '19:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '12:30:00', close_time: '19:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '12:30:00', close_time: '19:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '12:30:00', close_time: '19:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '12:30:00', close_time: '20:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '12:30:00', close_time: '20:00:00', sort_order: 70 },
  ];

  for (const slug of [
    'patti-gelateria-el-penon',
    'patti-gelateria-san-antonio',
    'patti-gelateria-ciudad-jardin',
  ]) {
    await replaceBranchSchedules(supabase, bySlug.get(slug), mainSchedule);
  }

  await replaceBranchSchedules(supabase, bySlug.get('patti-gelateria-granada'), granadaSchedule);
  await replaceBranchSchedules(supabase, bySlug.get('patti-gelateria-pance-122'), panceSchedule);
  await replaceBranchSchedules(supabase, bySlug.get('patti-gelateria-jardin-plaza'), mallSchedule);
  await replaceBranchSchedules(supabase, bySlug.get('patti-gelateria-chipichape'), mallSchedule);

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

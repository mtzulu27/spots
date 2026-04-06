import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line ? line.slice(key.length + 1).trim() : '';
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

  const spotSlug = 'donde-leon-cocina-dulce';
  const targetBranchSlug = 'donde-leon-miraflores';

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .update({
      name: 'Donde León',
      short_description:
        'Cocina dulce en Cali donde honran las frutas de Colombia, con cafe, desayuno y tardeo caleño.',
      category: 'Restaurantes',
      city: 'Cali',
      tags: ['cocina dulce', 'frutas de colombia', 'cafe', 'desayuno', 'tardeo', 'miraflores'],
      moods: ['dulce', 'cafe', 'desayuno', 'plan de dia', 'tranqui'],
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
    .select('id, slug')
    .eq('spot_id', spot.id)
    .limit(10);

  if (existingBranchesError) {
    throw new Error(`No se pudieron leer las sedes actuales: ${existingBranchesError.message}`);
  }

  const existingBranch = (existingBranches ?? []).find((row) => row.slug === targetBranchSlug)
    ?? (existingBranches ?? [])[0];

  if (!existingBranch) {
    throw new Error('No se encontró una sede existente para Donde León');
  }

  const { data: branch, error: branchError } = await supabase
    .from('spot_branches')
    .update({
      slug: targetBranchSlug,
      neighborhood: 'Miraflores',
      mall: '',
      hours: 'Lun y Vie Cerrado · Mar-Jue 10:00-19:30 · Sab-Dom 13:00-19:00',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      address: 'Cr. 24c # 6 oeste - 04, Santiago de Cali',
      min_budget: 3000,
      max_budget: 43000,
      max_people: 4,
      menu_url: 'https://dondeleon.niceeat.co/carta/menu-a-la-mesa',
      whatsapp:
        'https://api.whatsapp.com/send/?phone=573206396048&text&type=phone_number&app_absent=0',
      phone: '3206396048',
      instagram: 'https://www.instagram.com/donde_leon/',
      latitude: null,
      longitude: null,
      is_active: true,
      sort_order: 10,
    })
    .eq('id', existingBranch.id)
    .select('id, slug, hours, whatsapp, instagram, menu_url')
    .single();

  if (branchError || !branch) {
    throw new Error(`No se pudo actualizar ${existingBranch.slug}: ${branchError?.message ?? 'sin detalle'}`);
  }

  const { error: deleteHoursError } = await supabase
    .from('spot_branch_hours')
    .delete()
    .eq('branch_id', branch.id);

  if (deleteHoursError) {
    throw new Error(`No se pudieron borrar horarios previos: ${deleteHoursError.message}`);
  }

  const weeklyHours = [
    { day_of_week: 1, is_closed: true, open_time: null, close_time: null, sort_order: 10 },
    { day_of_week: 2, is_closed: false, open_time: '10:00:00', close_time: '19:30:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '10:00:00', close_time: '19:30:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '10:00:00', close_time: '19:30:00', sort_order: 40 },
    { day_of_week: 5, is_closed: true, open_time: null, close_time: null, sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '13:00:00', close_time: '19:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '13:00:00', close_time: '19:00:00', sort_order: 70 },
  ].map((row) => ({
    branch_id: branch.id,
    day_of_week: row.day_of_week,
    is_closed: row.is_closed,
    open_time: row.open_time,
    close_time: row.close_time,
    split_open_time: null,
    split_close_time: null,
    sort_order: row.sort_order,
  }));

  const { data: insertedHours, error: insertHoursError } = await supabase
    .from('spot_branch_hours')
    .insert(weeklyHours)
    .select('branch_id, day_of_week, is_closed, open_time, close_time, sort_order');

  if (insertHoursError) {
    throw new Error(`No se pudieron crear horarios nuevos: ${insertHoursError.message}`);
  }

  const { error: deleteExceptionsError } = await supabase
    .from('spot_branch_schedule_exceptions')
    .delete()
    .eq('branch_id', branch.id);

  if (deleteExceptionsError) {
    throw new Error(`No se pudieron borrar excepciones previas: ${deleteExceptionsError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        spot,
        branch,
        insertedHours,
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

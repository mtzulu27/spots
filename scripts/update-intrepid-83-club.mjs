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

  const branchSlug = 'intrepid-83-club-ingenio';

  const { data: branch, error: branchError } = await supabase
    .from('spot_branches')
    .update({
      hours: 'Lun Cerrado · Mar-Dom 18:00-01:00',
      min_budget: 22000,
      max_budget: 104700,
      menu_url: 'https://menupp.co/intrepid',
      whatsapp: 'https://wa.me/message/RCBIXK44PMZOG1',
      phone: '3052380786',
      address: 'Carrera 85C #16-11, Ingenio, Santiago de Cali 760032',
    })
    .eq('slug', branchSlug)
    .select('id, slug, hours, min_budget, max_budget')
    .single();

  if (branchError || !branch) {
    throw new Error(`No se pudo actualizar ${branchSlug}: ${branchError?.message ?? 'sin detalle'}`);
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
    { day_of_week: 2, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 20 },
    { day_of_week: 3, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 30 },
    { day_of_week: 4, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 40 },
    { day_of_week: 5, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 50 },
    { day_of_week: 6, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 60 },
    { day_of_week: 0, is_closed: false, open_time: '18:00:00', close_time: '01:00:00', sort_order: 70 },
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

  console.log(
    JSON.stringify(
      {
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

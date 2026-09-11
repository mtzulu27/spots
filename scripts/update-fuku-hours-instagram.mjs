import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = '/Users/mateo/Documents/Playground';
const catalogPaths = [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`];
const branchId = 4753;
const now = new Date().toISOString();
const weekly = [
  [0, '12:00:00', '21:00:00'], [1, '12:00:00', '21:00:00'], [2, '12:00:00', '21:00:00'],
  [3, '12:00:00', '21:00:00'], [4, '12:00:00', '21:00:00'], [5, '12:00:00', '23:00:00'],
  [6, '12:00:00', '23:00:00'],
].map(([day_of_week, open_time, close_time], index) => ({
  id: 0, branch_id: branchId, day_of_week, is_closed: false, open_time, close_time,
  split_open_time: null, split_close_time: null, sort_order: (index + 1) * 10,
}));

function readEnvValue(content, key) {
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

for (const path of catalogPaths) {
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.id === branchId);
  if (!branch) throw new Error(`No se encontró la sede ${branchId} en ${path}`);
  branch.hours = 'Dom-Jue 12:00-21:00 · Vie-Sab 12:00-23:00';
  branch.updated_at = now;
  const nextId = Math.max(0, ...(catalog.branchHours || []).map((row) => Number(row.id) || 0)) + 1;
  const rows = weekly.map((row, index) => ({ ...row, id: nextId + index }));
  catalog.branchHours = [...(catalog.branchHours || []).filter((row) => row.branch_id !== branchId), ...rows];
  catalog.hours = [...(catalog.hours || []).filter((row) => row.branch_id !== branchId), ...rows];
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}

const env = readFileSync(`${root}/apps/mobile/.env.local`, 'utf8');
const supabase = createClient(
  readEnvValue(env, 'EXPO_PUBLIC_SUPABASE_URL'),
  readEnvValue(env, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { error: branchError } = await supabase.from('spot_branches').update({
  hours: 'Dom-Jue 12:00-21:00 · Vie-Sab 12:00-23:00', updated_at: now,
}).eq('id', branchId);
if (branchError) throw branchError;
const { error: deleteError } = await supabase.from('spot_branch_hours').delete().eq('branch_id', branchId);
if (deleteError) throw deleteError;
const { error: insertError } = await supabase.from('spot_branch_hours').insert(weekly);
if (insertError) throw insertError;
console.log(JSON.stringify({ branchId, hours: 'Dom-Jue 12:00-21:00 · Vie-Sab 12:00-23:00', updatedAt: now }, null, 2));

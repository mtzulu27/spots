import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const publicDir = join(appRoot, 'public');
const outputPath = join(publicDir, 'spots-catalog.json');
const envExamplePath = join(appRoot, '.env.example');
const envLocalPath = join(appRoot, '.env.local');

const spotSelectColumns =
  'id,type,slug,name,short_description,cover_image_url,gallery_urls,category,city,likes,tags,moods,is_active,is_featured,created_at,updated_at';
const branchSelectColumns =
  'id,spot_id,slug,neighborhood,mall,hours,holiday_mode,holiday_open_time,holiday_close_time,holiday_split_open_time,holiday_split_close_time,address,min_budget,max_budget,max_people,menu_url,whatsapp,phone,instagram,latitude,longitude,is_active,sort_order,created_at,updated_at';
const branchHourSelectColumns =
  'id,branch_id,day_of_week,is_closed,open_time,close_time,split_open_time,split_close_time,sort_order';

function parseEnvFile(pathname) {
  if (!existsSync(pathname)) {
    return {};
  }

  const content = readFileSync(pathname, 'utf8');
  const values = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');

    if (key) {
      values[key] = value;
    }
  });

  return values;
}

function readEnvValue(key) {
  const envExample = parseEnvFile(envExamplePath);
  const envLocal = parseEnvFile(envLocalPath);
  return process.env[key] || envLocal[key] || envExample[key] || '';
}

async function main() {
  const supabaseUrl = readEnvValue('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY para generar spots-catalog.json.',
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [
    { data: spots, error: spotsError },
    { data: branches, error: branchesError },
    { data: branchHours, error: branchHoursError },
  ] = await Promise.all([
    supabase.from('spots').select(spotSelectColumns).order('id', { ascending: false }),
    supabase.from('spot_branches').select(branchSelectColumns).order('sort_order', { ascending: true }),
    supabase
      .from('spot_branch_hours')
      .select(branchHourSelectColumns)
      .order('sort_order', { ascending: true }),
  ]);

  if (spotsError) {
    throw new Error(spotsError.message);
  }

  if (branchesError) {
    throw new Error(branchesError.message);
  }

  if (branchHoursError) {
    throw new Error(branchHoursError.message);
  }

  mkdirSync(publicDir, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    spots: spots ?? [],
    branches: branches ?? [],
    branchHours: branchHours ?? [],
  };

  writeFileSync(outputPath, JSON.stringify(payload), 'utf8');

  const spotsCount = Array.isArray(payload.spots) ? payload.spots.length : 0;
  const branchesCount = Array.isArray(payload.branches) ? payload.branches.length : 0;
  const branchHoursCount = Array.isArray(payload.branchHours) ? payload.branchHours.length : 0;

  console.log(
    `Static catalog generated at ${outputPath} (${spotsCount} spots, ${branchesCount} branches, ${branchHoursCount} branch hours).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function parseNullableNumber(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  const [, , placesPathArg, branchesPathArg] = process.argv;
  if (!placesPathArg || !branchesPathArg) {
    throw new Error('Uso: node scripts/import-spots-csv.mjs <places.csv> <branches.csv>');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan credenciales de Supabase en el entorno.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const placesPath = path.resolve(placesPathArg);
  const branchesPath = path.resolve(branchesPathArg);

  const [placesContent, branchesContent] = await Promise.all([
    fs.readFile(placesPath, 'utf8'),
    fs.readFile(branchesPath, 'utf8'),
  ]);

  const places = parseCsv(placesContent);
  const branches = parseCsv(branchesContent);
  const spotIdBySlug = new Map();

  for (const place of places) {
    const payload = {
      type: place.type,
      slug: place.slug,
      name: place.name,
      short_description: place.short_description,
      cover_image_url: place.cover_image_url,
      gallery_urls: splitList(place.gallery_urls),
      category: place.category,
      city: place.city,
      likes: '0',
      tags: splitList(place.tags),
      moods: splitList(place.moods),
      is_active: parseBoolean(place.is_active),
      is_featured: parseBoolean(place.is_featured),
    };

    const { data, error } = await supabase
      .from('spots')
      .upsert(payload, { onConflict: 'slug' })
      .select('id, slug')
      .single();

    if (error || !data) {
      throw new Error(`No se pudo guardar el place ${place.slug}: ${error?.message ?? 'sin detalle'}`);
    }

    spotIdBySlug.set(place.slug, data.id);
  }

  for (const branch of branches) {
    const spotId = spotIdBySlug.get(branch.spot_slug);
    if (!spotId) {
      throw new Error(`Branch ${branch.slug} referencia spot_slug inexistente: ${branch.spot_slug}`);
    }

    const payload = {
      spot_id: spotId,
      slug: branch.slug,
      neighborhood: branch.neighborhood,
      mall: branch.mall,
      hours: branch.hours,
      address: branch.address,
      min_budget: parseNullableNumber(branch.min_budget) ?? 0,
      max_people: parseNullableNumber(branch.max_people) ?? 1,
      menu_url: branch.menu_url,
      whatsapp: branch.whatsapp,
      phone: branch.phone,
      instagram: branch.instagram,
      latitude: parseNullableNumber(branch.latitude),
      longitude: parseNullableNumber(branch.longitude),
      is_active: parseBoolean(branch.is_active),
      sort_order: parseNullableNumber(branch.sort_order) ?? 0,
    };

    const { error } = await supabase
      .from('spot_branches')
      .upsert(payload, { onConflict: 'slug' });

    if (error) {
      throw new Error(`No se pudo guardar el branch ${branch.slug}: ${error.message}`);
    }
  }

  const { count: spotsCount, error: spotsCountError } = await supabase
    .from('spots')
    .select('*', { count: 'exact', head: true })
    .in('slug', places.map((place) => place.slug));

  if (spotsCountError) {
    throw spotsCountError;
  }

  const { count: branchesCount, error: branchesCountError } = await supabase
    .from('spot_branches')
    .select('*', { count: 'exact', head: true })
    .in('slug', branches.map((branch) => branch.slug));

  if (branchesCountError) {
    throw branchesCountError;
  }

  console.log(
    JSON.stringify(
      {
        importedPlaces: places.length,
        importedBranches: branches.length,
        confirmedPlaces: spotsCount ?? 0,
        confirmedBranches: branchesCount ?? 0,
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

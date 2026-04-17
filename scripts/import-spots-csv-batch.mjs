import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_PLACE_CHUNK_SIZE = 100;
const DEFAULT_BRANCH_CHUNK_SIZE = 250;
const DEFAULT_CONCURRENCY = 4;

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
  return String(value ?? '')
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

function chunk(array, size) {
  const batches = [];
  for (let index = 0; index < array.length; index += size) {
    batches.push(array.slice(index, index + size));
  }
  return batches;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

function readCliConfig() {
  const args = process.argv.slice(2);
  const positional = [];
  const options = {
    placeChunkSize: DEFAULT_PLACE_CHUNK_SIZE,
    branchChunkSize: DEFAULT_BRANCH_CHUNK_SIZE,
    concurrency: DEFAULT_CONCURRENCY,
    skipConfirmCounts: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--place-chunk-size') {
      options.placeChunkSize = Number(args[index + 1] || DEFAULT_PLACE_CHUNK_SIZE);
      index += 1;
      continue;
    }

    if (arg === '--branch-chunk-size') {
      options.branchChunkSize = Number(args[index + 1] || DEFAULT_BRANCH_CHUNK_SIZE);
      index += 1;
      continue;
    }

    if (arg === '--concurrency') {
      options.concurrency = Number(args[index + 1] || DEFAULT_CONCURRENCY);
      index += 1;
      continue;
    }

    if (arg === '--skip-confirm-counts') {
      options.skipConfirmCounts = true;
      continue;
    }

    positional.push(arg);
  }

  const [placesPathArg, branchesPathArg] = positional;
  if (!placesPathArg || !branchesPathArg) {
    throw new Error(
      'Uso: node scripts/import-spots-csv-batch.mjs <places.csv> <branches.csv> [--place-chunk-size 100] [--branch-chunk-size 250] [--concurrency 4] [--skip-confirm-counts]',
    );
  }

  return {
    placesPathArg,
    branchesPathArg,
    ...options,
  };
}

function buildPlacePayload(place) {
  return {
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
}

function buildBranchPayload(branch, spotId) {
  return {
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
}

async function upsertPlaceChunk(supabase, placeChunk) {
  const payload = placeChunk.map(buildPlacePayload);
  const { error } = await supabase.from('spots').upsert(payload, { onConflict: 'slug' });
  if (error) {
    throw new Error(`No se pudo guardar un batch de places: ${error.message}`);
  }
}

async function fetchSpotIdsBySlug(supabase, slugs, chunkSize, concurrency) {
  const slugChunks = chunk(slugs, chunkSize);
  const records = await mapWithConcurrency(slugChunks, concurrency, async (slugChunk) => {
    const { data, error } = await supabase
      .from('spots')
      .select('id, slug')
      .in('slug', slugChunk);

    if (error) {
      throw new Error(`No se pudieron consultar IDs de spots: ${error.message}`);
    }

    return data ?? [];
  });

  const map = new Map();
  for (const batch of records.flat()) {
    map.set(batch.slug, batch.id);
  }
  return map;
}

async function upsertBranchChunk(supabase, branchChunk, spotIdBySlug) {
  const payload = branchChunk.map((branch) => {
    const spotId = spotIdBySlug.get(branch.spot_slug);
    if (!spotId) {
      throw new Error(`Branch ${branch.slug} referencia spot_slug inexistente: ${branch.spot_slug}`);
    }
    return buildBranchPayload(branch, spotId);
  });

  const { error } = await supabase
    .from('spot_branches')
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    throw new Error(`No se pudo guardar un batch de branches: ${error.message}`);
  }
}

async function confirmCounts(supabase, places, branches, chunkSize, concurrency) {
  const placeSlugChunks = chunk(
    places.map((place) => place.slug),
    chunkSize,
  );
  const branchSlugChunks = chunk(
    branches.map((branch) => branch.slug),
    chunkSize,
  );

  const placeCounts = await mapWithConcurrency(placeSlugChunks, concurrency, async (slugChunk) => {
    const { count, error } = await supabase
      .from('spots')
      .select('*', { count: 'exact', head: true })
      .in('slug', slugChunk);

    if (error) throw error;
    return count ?? 0;
  });

  const branchCounts = await mapWithConcurrency(branchSlugChunks, concurrency, async (slugChunk) => {
    const { count, error } = await supabase
      .from('spot_branches')
      .select('*', { count: 'exact', head: true })
      .in('slug', slugChunk);

    if (error) throw error;
    return count ?? 0;
  });

  return {
    confirmedPlaces: placeCounts.reduce((sum, value) => sum + value, 0),
    confirmedBranches: branchCounts.reduce((sum, value) => sum + value, 0),
  };
}

async function main() {
  const {
    placesPathArg,
    branchesPathArg,
    placeChunkSize,
    branchChunkSize,
    concurrency,
    skipConfirmCounts,
  } = readCliConfig();

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan credenciales de Supabase en el entorno.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const placesPath = path.resolve(placesPathArg);
  const branchesPath = path.resolve(branchesPathArg);

  const readStartedAt = performance.now();
  const [placesContent, branchesContent] = await Promise.all([
    fs.readFile(placesPath, 'utf8'),
    fs.readFile(branchesPath, 'utf8'),
  ]);
  const readMs = performance.now() - readStartedAt;

  const parseStartedAt = performance.now();
  const places = parseCsv(placesContent);
  const branches = parseCsv(branchesContent);
  const parseMs = performance.now() - parseStartedAt;

  const placeChunks = chunk(places, placeChunkSize);
  const branchChunks = chunk(branches, branchChunkSize);

  const placeUpsertStartedAt = performance.now();
  await mapWithConcurrency(placeChunks, concurrency, async (placeChunk) => {
    await upsertPlaceChunk(supabase, placeChunk);
  });
  const placeUpsertMs = performance.now() - placeUpsertStartedAt;

  const idLookupStartedAt = performance.now();
  const spotIdBySlug = await fetchSpotIdsBySlug(
    supabase,
    places.map((place) => place.slug),
    placeChunkSize,
    concurrency,
  );
  const idLookupMs = performance.now() - idLookupStartedAt;

  const branchUpsertStartedAt = performance.now();
  await mapWithConcurrency(branchChunks, concurrency, async (branchChunk) => {
    await upsertBranchChunk(supabase, branchChunk, spotIdBySlug);
  });
  const branchUpsertMs = performance.now() - branchUpsertStartedAt;

  let confirmedPlaces = null;
  let confirmedBranches = null;
  let confirmMs = 0;

  if (!skipConfirmCounts) {
    const confirmStartedAt = performance.now();
    const counts = await confirmCounts(
      supabase,
      places,
      branches,
      Math.max(placeChunkSize, branchChunkSize),
      concurrency,
    );
    confirmMs = performance.now() - confirmStartedAt;
    confirmedPlaces = counts.confirmedPlaces;
    confirmedBranches = counts.confirmedBranches;
  }

  const totalMs = readMs + parseMs + placeUpsertMs + idLookupMs + branchUpsertMs + confirmMs;

  console.log(
    JSON.stringify(
      {
        importedPlaces: places.length,
        importedBranches: branches.length,
        confirmedPlaces,
        confirmedBranches,
        config: {
          placeChunkSize,
          branchChunkSize,
          concurrency,
          skipConfirmCounts,
        },
        timingsMs: {
          read: Math.round(readMs),
          parse: Math.round(parseMs),
          placeUpserts: Math.round(placeUpsertMs),
          placeIdLookup: Math.round(idLookupMs),
          branchUpserts: Math.round(branchUpsertMs),
          confirmCounts: Math.round(confirmMs),
          total: Math.round(totalMs),
        },
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

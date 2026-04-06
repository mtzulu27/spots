import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan credenciales de Supabase en el entorno.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const themeImages = {
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1600&q=80',
  ],
  burgers: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1600&q=80',
  ],
  wings: [
    'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=1600&q=80',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80',
  ],
  desserts: [
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1600&q=80',
  ],
  icecream: [
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=1600&q=80',
  ],
  ramen: [
    'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1600&q=80',
  ],
  sushi: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1600&q=80',
  ],
  steak: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1600&q=80',
  ],
  mexican: [
    'https://images.unsplash.com/photo-1565299585323-38174c4a6471?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=1600&q=80',
  ],
  italian: [
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=80',
  ],
  brunch: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1600&q=80',
  ],
  nightlife: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80',
  ],
  rooftop: [
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=80',
  ],
  family: [
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
  ],
  bowling: [
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1543096222-72de739f7917?auto=format&fit=crop&w=1600&q=80',
  ],
  kids: [
    'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1600&q=80',
  ],
  zoo: [
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1516934024742-b461fba47600?auto=format&fit=crop&w=1600&q=80',
  ],
  nature: [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
  ],
  glamping: [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1523987355523-c7b5b84cff90?auto=format&fit=crop&w=1600&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=80',
  ],
  airsoft: [
    'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1600&q=80',
  ],
  paintball: [
    'https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1600&q=80',
  ],
  generic_restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80',
  ],
  generic: [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
  ],
};

const supplementalThemeImages = {
  pizza: [
    'https://images.unsplash.com/photo-1520201163981-8cc95007dd2e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1600&q=80',
  ],
  burgers: [
    'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=1600&q=80',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80',
  ],
  desserts: [
    'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=1600&q=80',
  ],
  icecream: [
    'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1523294587484-bae6cc870010?auto=format&fit=crop&w=1600&q=80',
  ],
  nightlife: [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1496024840928-4c417adf211d?auto=format&fit=crop&w=1600&q=80',
  ],
  rooftop: [
    'https://images.unsplash.com/photo-1538485399081-7c897e52f4c0?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1468824357306-a439d58ccb1c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1600&q=80',
  ],
  family: [
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1600&q=80',
  ],
  nature: [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=80',
  ],
  generic_restaurant: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1600&q=80',
  ],
  generic: [
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=1600&q=80',
  ],
};

for (const [key, images] of Object.entries(supplementalThemeImages)) {
  themeImages[key] = [...(themeImages[key] ?? []), ...images];
}

const themeQueries = {
  pizza: ['pizza', 'wood fired pizza'],
  burgers: ['burger', 'smash burger'],
  wings: ['chicken wings', 'hot wings'],
  coffee: ['coffee shop', 'specialty coffee'],
  desserts: ['dessert', 'pastry'],
  icecream: ['gelato', 'ice cream'],
  ramen: ['ramen', 'japanese noodles'],
  sushi: ['sushi', 'japanese food'],
  steak: ['steak', 'grill restaurant'],
  mexican: ['mexican food', 'tacos'],
  italian: ['italian pasta', 'italian restaurant'],
  brunch: ['brunch', 'breakfast restaurant'],
  nightlife: ['cocktail bar', 'nightlife bar'],
  rooftop: ['rooftop bar', 'rooftop restaurant'],
  family: ['family restaurant', 'family outing'],
  bowling: ['bowling alley', 'bowling'],
  kids: ['kids playground', 'indoor playground'],
  zoo: ['zoo animals', 'wildlife park'],
  nature: ['nature retreat', 'outdoor landscape'],
  glamping: ['glamping', 'luxury camping'],
  sports: ['sports venue', 'fitness'],
  airsoft: ['airsoft', 'tactical game'],
  paintball: ['paintball', 'paintball field'],
  generic_restaurant: ['restaurant interior', 'restaurant food'],
  generic: ['lifestyle place', 'city venue'],
};

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sanitizeImageUrl(value) {
  return String(value ?? '')
    .trim()
    .split(',')[0]
    .replace(/^['"`]+/, '')
    .replace(/['"`),]+$/, '');
}

function isStableImageUrl(url) {
  return Boolean(url) && (url.includes('images.unsplash.com/') || url.includes('images.pexels.com/'));
}

function resolveThemeKey(spot) {
  const haystack = normalizeText(
    [spot.name, spot.category, ...(spot.tags ?? []), ...(spot.moods ?? [])].join(' '),
  );

  const checks = [
    ['paintball', ['paintball']],
    ['airsoft', ['airsoft']],
    ['bowling', ['bolos', 'bowling']],
    ['zoo', ['zoologico', 'biodiversidad', 'ecoparque', 'zoo']],
    ['glamping', ['glamping']],
    ['nature', ['naturaleza', 'dapa', 'rio', 'sendero', 'mirador', 'parque']],
    ['kids', ['kids', 'ninos', 'inflables', 'jump', 'parque tematico']],
    ['family', ['familiar', 'familia']],
    ['rooftop', ['rooftop', 'sky lounge', 'terraza']],
    ['nightlife', ['cocteles', 'cocktail', 'bar', 'nightclub', 'discoteca', 'cantina', 'rumba', 'vida nocturna']],
    ['coffee', ['cafe', 'coffee', 'quindio']],
    ['icecream', ['gelato', 'gelateria', 'helado', 'heladeria']],
    ['desserts', ['postres', 'waffle', 'waffles', 'dulce', 'pasteleria', 'bakery', 'chocolatada']],
    ['brunch', ['brunch', 'desayuno']],
    ['pizza', ['pizza', 'pizzeria']],
    ['burgers', ['hamburguesa', 'burger']],
    ['wings', ['wings', 'alitas']],
    ['ramen', ['ramen']],
    ['sushi', ['sushi']],
    ['steak', ['parrilla', 'carnes', 'steak', 'malbec']],
    ['mexican', ['mex', 'taco', 'taqueria', 'mexicana']],
    ['italian', ['italiano', 'pasta', 'napolitana']],
    ['sports', ['deporte', 'wellness', 'bienestar']],
  ];

  for (const [theme, keywords] of checks) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return theme;
    }
  }

  if (haystack.includes('vida nocturna')) {
    return 'nightlife';
  }

  if (haystack.includes('restaurante')) {
    return 'generic_restaurant';
  }

  if (normalizeText(spot.category) === 'restaurantes') {
    return 'generic_restaurant';
  }

  if (normalizeText(spot.category) === 'vida nocturna') {
    return 'nightlife';
  }

  if (normalizeText(spot.category) === 'familiar') {
    return 'family';
  }

  if (normalizeText(spot.category) === 'naturaleza y aire libre') {
    return 'nature';
  }

  if (normalizeText(spot.category) === 'deporte y bienestar') {
    return 'sports';
  }

  return 'generic';
}

function collectRepoStaticUrls() {
  const repoRoot = '/Users/mateo/Documents/Playground';
  const urls = new Set();
  const stack = [repoRoot];

  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.expo') {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!/\.(csv|ts|tsx|md|json|js|mjs)$/i.test(entry.name)) {
        continue;
      }

      const text = fs.readFileSync(fullPath, 'utf8');
      const matches = text.match(/https:\/\/images\.(?:unsplash|pexels)\.com\/[^\s,"'`\)]+/g) ?? [];
      matches
        .map((match) => sanitizeImageUrl(match))
        .filter((match) => isStableImageUrl(match))
        .forEach((match) => urls.add(match));
    }
  }

  return [...urls];
}

function buildCandidateUrls(spot, repoStaticUrls) {
  const themeKey = resolveThemeKey(spot);
  const themed = (themeImages[themeKey] ?? themeImages.generic)
    .map((url) => sanitizeImageUrl(url))
    .filter((url) => isStableImageUrl(url));
  const rotatedThemed = themed
    .map((url, index) => [url, hashString(`${spot.slug}:${themeKey}:${index}`)])
    .sort((left, right) => left[1] - right[1])
    .map(([url]) => url);

  const rotatedRepo = repoStaticUrls
    .map((url) => sanitizeImageUrl(url))
    .filter((url) => isStableImageUrl(url))
    .map((url, index) => [url, hashString(`${spot.slug}:repo:${index}`)])
    .sort((left, right) => left[1] - right[1])
    .map(([url]) => url);

  return [...new Set([...rotatedThemed, ...rotatedRepo])];
}

function pickUniqueStaticUrl(spot, repoStaticUrls, usedUrls) {
  const candidates = buildCandidateUrls(spot, repoStaticUrls);
  const next = candidates.find((url) => !usedUrls.has(url));
  if (!next) {
    throw new Error(`No encontre cover estatico unico para ${spot.slug}`);
  }
  return next;
}

async function checkUrl(url) {
  const cleanUrl = sanitizeImageUrl(url);
  if (!cleanUrl) {
    return false;
  }

  try {
    let response = await fetch(cleanUrl, { method: 'HEAD', redirect: 'follow' });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(cleanUrl, { method: 'GET', redirect: 'follow' });
    }

    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const { data: spots, error } = await supabase
    .from('spots')
    .select('id, slug, name, category, tags, moods, cover_image_url')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = spots ?? [];
  const repoStaticUrls = collectRepoStaticUrls();
  const results = [];
  const usedUrls = new Set(
    rows
      .map((spot) => sanitizeImageUrl(spot.cover_image_url))
      .filter((url) => isStableImageUrl(url)),
  );

  for (const spot of rows) {
    const rawUrl = String(spot.cover_image_url ?? '').trim();
    const currentUrl = sanitizeImageUrl(rawUrl);
    const isManagedDynamic = currentUrl.includes('source.unsplash.com');
    const needsBackfill =
      rawUrl !== currentUrl ||
      !currentUrl ||
      !isStableImageUrl(currentUrl) ||
      isManagedDynamic ||
      !(await checkUrl(currentUrl));

    if (!needsBackfill) {
      continue;
    }

    if (isStableImageUrl(currentUrl)) {
      usedUrls.delete(currentUrl);
    }

    const targetUrl = pickUniqueStaticUrl(spot, repoStaticUrls, usedUrls);
    usedUrls.add(targetUrl);

    const { error: updateError } = await supabase
      .from('spots')
      .update({ cover_image_url: targetUrl })
      .eq('id', spot.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar ${spot.slug}: ${updateError.message}`);
    }

    results.push({
      id: spot.id,
      slug: spot.slug,
      name: spot.name,
      category: spot.category,
      previousCover: currentUrl,
      nextCover: targetUrl,
      theme: resolveThemeKey(spot),
    });
  }

  const duplicateGroups = new Map();
  for (const spot of rows) {
    const coverUrl = sanitizeImageUrl(spot.cover_image_url);
    if (!coverUrl) {
      continue;
    }
    const current = duplicateGroups.get(coverUrl);
    if (current) {
      current.push(spot);
    } else {
      duplicateGroups.set(coverUrl, [spot]);
    }
  }

  for (const [, spotsWithSameCover] of duplicateGroups) {
    if (spotsWithSameCover.length < 2) {
      continue;
    }

    for (const spot of spotsWithSameCover.slice(1)) {
      const currentUrl = sanitizeImageUrl(spot.cover_image_url);
      const targetUrl = pickUniqueStaticUrl(spot, repoStaticUrls, usedUrls);
      if (currentUrl === targetUrl) {
        usedUrls.add(targetUrl);
        continue;
      }

      const { error: updateError } = await supabase
        .from('spots')
        .update({ cover_image_url: targetUrl })
        .eq('id', spot.id);

      if (updateError) {
        throw new Error(`No se pudo deduplicar ${spot.slug}: ${updateError.message}`);
      }

      results.push({
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        category: spot.category,
        previousCover: currentUrl,
        nextCover: targetUrl,
        theme: resolveThemeKey(spot),
        deduplicated: true,
      });

      spot.cover_image_url = targetUrl;
      usedUrls.add(targetUrl);
    }
  }

  console.log(
    JSON.stringify(
      {
        totalSpots: rows.length,
        updatedCovers: results.length,
        spots: results,
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

import { readFileSync, writeFileSync } from 'node:fs';
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

async function uploadImage(supabase, spotSlug, prefix, kind, filePath, index) {
  const imageBuffer = readFileSync(filePath);
  const extension = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const assetPath = `${slugify(spotSlug)}/${kind}/${prefix}-${kind}-${index}-${Date.now()}.${extension}`;

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

function branchHoursRowsFor(branchId, rows, startingId) {
  return rows.map((row, index) => ({
    id: startingId + index,
    branch_id: branchId,
    ...row,
  }));
}

function upsertBranchHours(rows, branchId, weeklyRows) {
  const rest = Array.isArray(rows) ? rows.filter((row) => row.branch_id !== branchId) : [];
  return [...rest, ...weeklyRows];
}

function nextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

const PARISINA_HOURS = [
  { day_of_week: 1, is_closed: false, open_time: '13:00:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 10 },
  { day_of_week: 2, is_closed: false, open_time: '13:00:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 20 },
  { day_of_week: 3, is_closed: false, open_time: '13:00:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 30 },
  { day_of_week: 4, is_closed: false, open_time: '13:00:00', close_time: '21:00:00', split_open_time: null, split_close_time: null, sort_order: 40 },
  { day_of_week: 5, is_closed: false, open_time: '13:30:00', close_time: '22:00:00', split_open_time: null, split_close_time: null, sort_order: 50 },
  { day_of_week: 6, is_closed: false, open_time: '13:30:00', close_time: '22:00:00', split_open_time: null, split_close_time: null, sort_order: 60 },
  { day_of_week: 0, is_closed: false, open_time: '13:30:00', close_time: '22:00:00', split_open_time: null, split_close_time: null, sort_order: 70 },
];

const SPOTS = [
  {
    slug: 'parisina',
    name: 'Parisina',
    instagram: 'https://www.instagram.com/parisina____________/',
    shortDescription:
      'Parisina en Mall La Leyenda se siente íntima, cálida y un poco francesa, de esas mesas para caer sin afán entre crepes, baguettes, canapés y algo rico de tomar. Funciona muy bien para una cita tranquila, una comida ligera bonita o una tarde suave en Ciudad Jardín.',
    tags: ['bistro', 'crepes', 'baguettes', 'canapes', 'ciudad jardin', 'mall la leyenda'],
    moods: ['algo especial', 'pareja', 'plan tranqui', 'comer rico'],
    internalTag: 'followup-menu-contact-pricing',
    missingFields: ['menu_url', 'phone', 'whatsapp', 'min_budget', 'max_budget'],
    notes: [
      'Se cargó la sede de Mall La Leyenda a partir de la bio del perfil.',
      'Horario general cargado desde la bio del Instagram.',
      'Se subieron fotos limpias del feed curadas manualmente.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041244118/photos/photo-17.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041244118/photos/photo-01.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041244118/photos/photo-06.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041244118/photos/photo-13.jpg',
    ],
    genericBranchSlug: 'parisina-cali',
    branches: [
      {
        slug: 'parisina-mall-la-leyenda-cali',
        address: 'Calle 13A #103-335, Mall La Leyenda, Cali',
        neighborhood: 'Ciudad Jardín',
        mall: 'Mall La Leyenda',
        max_people: 4,
        phone: '',
        whatsapp: '',
        menu_url: '',
        hours: 'Lun-Jue 1:00 PM-9:00 PM; Vie-Dom 1:30 PM-10:00 PM',
        min_budget: 0,
        max_budget: 0,
        sort_order: 10,
        weeklyHours: PARISINA_HOURS,
      },
    ],
  },
  {
    slug: 'fusion-wok',
    name: 'Fusion Wok',
    instagram: 'https://www.instagram.com/fusionwok/',
    shortDescription:
      'Fusion Wok va más por antojo asiático casual y rendidor que por ceremonia. Entre sushi, salteados al wok y platos para compartir, funciona bien para almorzar, resolver una cena fácil o caer con amigos a una comida rápida pero rica en varias sedes de Cali.',
    tags: ['sushi', 'wok', 'asiatico', 'rolls', 'cena casual', 'almuerzo'],
    moods: ['comer rico', 'casual', 'con amigos'],
    internalTag: 'followup-hours-pricing',
    missingFields: ['hours_by_branch', 'min_budget', 'max_budget'],
    notes: [
      'Se reemplazó la sede genérica por cinco sedes reales detectadas en bio y en el menú compartido.',
      'Se cargó menú compartido de Aldea Asiática y teléfono/whatsapp general.',
      'No se cargaron horarios por sede porque el scrape aún se desvió con Maps/legales y no dejó un bloque confiable.',
      'Se subieron solo fotos limpias del feed de Fusion Wok.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041756326/photos/photo-01.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041756326/photos/photo-02.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776041756326/photos/photo-18.jpg',
    ],
    genericBranchSlug: 'fusion-wok-cali',
    branches: [
      {
        slug: 'fusion-wok-puerto-125-cali',
        address: 'Cra 125 con Calle 16A, Local 4-5, Cali',
        neighborhood: 'Pance',
        mall: 'Puerto 125',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 10,
      },
      {
        slug: 'fusion-wok-granada-cali',
        address: 'Avenida 9AN #15A-30, Cali',
        neighborhood: 'Granada',
        mall: '',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 20,
      },
      {
        slug: 'fusion-wok-las-velas-cali',
        address: 'Carrera 105 #15B-45, Cali',
        neighborhood: 'Ciudad Jardín',
        mall: 'Las Velas',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 30,
      },
      {
        slug: 'fusion-wok-parque-del-perro-cali',
        address: 'Calle 3A #34-09, Cali',
        neighborhood: 'San Fernando',
        mall: '',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 40,
      },
      {
        slug: 'fusion-wok-pacific-mall-cali',
        address: 'Calle 36N #6A-65, Local 502 Piso 5, Cali',
        neighborhood: '',
        mall: 'Pacific Mall',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 50,
      },
    ],
  },
  {
    slug: 'baoku',
    name: 'Baoku',
    instagram: 'https://www.instagram.com/baoku.co/',
    shortDescription:
      'Baoku se siente más de antojo asiático con personalidad marcada, centrado en baos y carnes a la parrilla. Funciona muy bien para una comida casual con hambre real, pedir algo contundente y resolver almuerzo o cena en varias sedes de Cali.',
    tags: ['baos', 'parrilla asiatica', 'asiatico', 'carnes', 'cena casual', 'almuerzo'],
    moods: ['comer rico', 'casual', 'con amigos'],
    internalTag: 'followup-hours-pricing-photos',
    missingFields: ['hours_by_branch', 'min_budget', 'max_budget', 'photos'],
    notes: [
      'Se reemplazó la sede genérica por cinco sedes reales detectadas en la bio y en el menú compartido.',
      'El link propio baoku.co no respondió, así que se tomó como fuente secundaria el menú/locations compartido de Aldea Asiática.',
      'Se cargó teléfono/whatsapp general y menú compartido.',
      'La corrida se cayó antes del feed, así que se dejó sin fotos por ahora para no inventar assets.',
    ],
    imagePaths: [],
    genericBranchSlug: 'baoku-cali',
    branches: [
      {
        slug: 'baoku-puerto-125-cali',
        address: 'Cra 125 con Calle 16A, Local 4-5, Cali',
        neighborhood: 'Pance',
        mall: 'Puerto 125',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 10,
      },
      {
        slug: 'baoku-granada-cali',
        address: 'Avenida 9AN #15A-30, Cali',
        neighborhood: 'Granada',
        mall: '',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 20,
      },
      {
        slug: 'baoku-las-velas-cali',
        address: 'Carrera 105 #15B-45, Cali',
        neighborhood: 'Ciudad Jardín',
        mall: 'Las Velas',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 30,
      },
      {
        slug: 'baoku-parque-del-perro-cali',
        address: 'Calle 3A #34-09, Cali',
        neighborhood: 'San Fernando',
        mall: '',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 40,
      },
      {
        slug: 'baoku-pacific-mall-cali',
        address: 'Calle 36N #6A-65, Local 502 Piso 5, Cali',
        neighborhood: '',
        mall: 'Pacific Mall',
        max_people: 4,
        phone: '+573126598939',
        whatsapp: '+573126598939',
        menu_url: 'https://menupp.co/aldeaasiatica',
        hours: '',
        min_budget: 0,
        max_budget: 0,
        sort_order: 50,
      },
    ],
  },
];

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

  const now = new Date().toISOString();
  const publicCatalogPath = '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json';
  const distCatalogPath = '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json';
  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

  const publicCatalog = JSON.parse(readFileSync(publicCatalogPath, 'utf8'));
  const branchIdBySlug = new Map(publicCatalog.branches.map((branch) => [branch.slug, branch.id]));
  let nextBranchIdValue = nextId(publicCatalog.branches);
  let nextHoursIdValue = Math.max(nextId(publicCatalog.branchHours), nextId(publicCatalog.hours));

  const uploadedBySlug = new Map();
  for (const spot of SPOTS) {
    const prefix = slugify(spot.slug);
    const urls = [];
    for (const [index, filePath] of spot.imagePaths.entries()) {
      urls.push(
        await uploadImage(
          supabase,
          spot.slug,
          prefix,
          index === 0 ? 'cover' : 'gallery',
          filePath,
          index + 1,
        ),
      );
    }
    uploadedBySlug.set(spot.slug, urls);
    for (const branch of spot.branches) {
      if (!branchIdBySlug.has(branch.slug)) {
        branchIdBySlug.set(branch.slug, nextBranchIdValue++);
      }
      if (branch.weeklyHours) {
        branch.hoursRowIdStart = nextHoursIdValue;
        nextHoursIdValue += branch.weeklyHours.length;
      }
    }
  }

  for (const catalogPath of [publicCatalogPath, distCatalogPath]) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

    for (const spot of SPOTS) {
      const place = catalog.spots.find((entry) => entry.slug === spot.slug);
      if (!place) {
        throw new Error(`No se encontró el spot ${spot.slug} en ${catalogPath}`);
      }

      place.name = spot.name;
      place.short_description = spot.shortDescription;
      place.cover_image_url = uploadedBySlug.get(spot.slug)?.[0] ?? '';
      place.gallery_urls = uploadedBySlug.get(spot.slug) ?? [];
      place.tags = spot.tags;
      place.moods = spot.moods;
      place.updated_at = now;

      const genericBranch = catalog.branches.find((entry) => entry.slug === spot.genericBranchSlug);
      if (genericBranch) {
        genericBranch.is_active = false;
        genericBranch.updated_at = now;
      }

      for (const branchConfig of spot.branches) {
        const branchId = branchIdBySlug.get(branchConfig.slug);
        let branch = catalog.branches.find((entry) => entry.slug === branchConfig.slug);

        if (!branch) {
          branch = {
            id: branchId,
            spot_id: place.id,
            slug: branchConfig.slug,
            address: branchConfig.address,
            neighborhood: branchConfig.neighborhood,
            mall: branchConfig.mall,
            max_people: branchConfig.max_people,
            phone: branchConfig.phone,
            whatsapp: branchConfig.whatsapp,
            menu_url: branchConfig.menu_url,
            latitude: null,
            longitude: null,
            created_at: now,
            updated_at: now,
            hours: branchConfig.hours,
            holiday_mode: 'inherit',
            holiday_open_time: null,
            holiday_close_time: null,
            holiday_split_open_time: null,
            holiday_split_close_time: null,
            min_budget: branchConfig.min_budget,
            max_budget: branchConfig.max_budget,
            instagram: spot.instagram,
            is_active: true,
            sort_order: branchConfig.sort_order,
          };
          catalog.branches.push(branch);
        } else {
          branch.spot_id = place.id;
          branch.address = branchConfig.address;
          branch.neighborhood = branchConfig.neighborhood;
          branch.mall = branchConfig.mall;
          branch.max_people = branchConfig.max_people;
          branch.phone = branchConfig.phone;
          branch.whatsapp = branchConfig.whatsapp;
          branch.menu_url = branchConfig.menu_url;
          branch.hours = branchConfig.hours;
          branch.min_budget = branchConfig.min_budget;
          branch.max_budget = branchConfig.max_budget;
          branch.instagram = spot.instagram;
          branch.is_active = true;
          branch.sort_order = branchConfig.sort_order;
          branch.updated_at = now;
        }

        if (branchConfig.weeklyHours) {
          const hourRows = branchHoursRowsFor(branch.id, branchConfig.weeklyHours, branchConfig.hoursRowIdStart);
          catalog.branchHours = upsertBranchHours(catalog.branchHours, branch.id, hourRows);
          catalog.hours = upsertBranchHours(catalog.hours, branch.id, hourRows);
        }
      }
    }

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  for (const spot of SPOTS) {
    let entry = tracker.entries.find((item) => item.slug === spot.slug);
    if (!entry) {
      entry = {
        slug: spot.slug,
        name: spot.name,
        instagram: spot.instagram,
        status: 'incomplete',
        internalTag: spot.internalTag,
        missingFields: [...spot.missingFields],
        notes: [...spot.notes],
        lastReviewedAt: now,
      };
      tracker.entries.push(entry);
      continue;
    }

    entry.name = spot.name;
    entry.instagram = spot.instagram;
    entry.status = 'incomplete';
    entry.internalTag = spot.internalTag;
    entry.missingFields = [...spot.missingFields];
    entry.notes = [...spot.notes];
    entry.lastReviewedAt = now;
  }

  tracker.updatedAt = now;
  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');

  console.log(
    JSON.stringify(
      {
        uploaded: Object.fromEntries(uploadedBySlug.entries()),
        branches: Object.fromEntries([...branchIdBySlug.entries()].filter(([slug]) => slug.startsWith('parisina-') || slug.startsWith('fusion-wok-') || slug.startsWith('baoku-'))),
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

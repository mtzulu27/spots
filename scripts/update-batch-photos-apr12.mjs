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

const SPOTS = [
  {
    slug: 'memorial',
    name: 'Memorial Cervecería',
    instagram: 'https://www.instagram.com/memorial_cerveceria/',
    internalTag: 'followup-contact-menu',
    missingFields: ['menu_url', 'phone', 'whatsapp'],
    notes: [
      'Se cargaron dos fotos limpias del grid al catálogo.',
      'Horario vigente cargado desde highlights.',
      'Dirección principal confirmada.',
      'Presupuesto base cargado desde menú leído por screenshots.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776030154788/photos/photo-06.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776030154788/photos/photo-10.jpg',
    ],
  },
  {
    slug: 'el-gran-langostino',
    name: 'El Gran Langostino',
    instagram: 'https://www.instagram.com/elgranlangostino/',
    internalTag: 'followup-pricing-whatsapp',
    missingFields: ['min_budget', 'max_budget', 'whatsapp'],
    notes: [
      'Se cargaron dos fotos limpias del grid al catálogo.',
      'Se corrigió el scraper para leer el modal nativo de links de Instagram y ya toma bien sucursales.granlangostino.com.',
      'El lugar quedó expandido a multi-sede Cali: Alameda, Pance, Ciudad Jardín, Sirena y Delicias.',
      'Se cargaron horarios por sede desde el popup de sedes del sitio oficial.',
      'Se añadió teléfono general y PDF de catálogo como menu_url base.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776031178580/photos/photo-02.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776031178580/photos/photo-01.jpg',
    ],
  },
  {
    slug: 'montolivo',
    name: 'Montolivo',
    instagram: 'https://www.instagram.com/montolivorestaurante/',
    internalTag: 'followup-branches-hours-pricing-contact',
    missingFields: ['branches', 'hours_by_branch', 'min_budget', 'max_budget', 'phone', 'whatsapp'],
    notes: [
      'Se cargaron tres fotos limpias del grid al catálogo.',
      'El scrape más reciente confirmó mejor cobertura visual del lugar.',
      'Sigue pendiente consolidar sedes, horarios y presupuesto por sede.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776028401627/photos/photo-01.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776028401627/photos/photo-04.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776028401627/photos/photo-06.jpg',
    ],
  },
  {
    slug: 'brunch-house',
    name: 'Brunch House',
    instagram: 'https://www.instagram.com/brunchshouse/',
    internalTag: 'followup-hours-pricing-contact',
    missingFields: ['hours_by_branch', 'min_budget', 'max_budget', 'phone', 'whatsapp'],
    notes: [
      'Se cargaron dos fotos limpias del grid al catálogo.',
      'El QR de menú ya entra bien al pipeline y muestra dos menús por sede.',
      'Sigue pendiente bajar precios útiles y horarios exactos por sede.',
    ],
    imagePaths: [
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776028565337/photos/photo-02.jpg',
      '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/ig-scrape-1776028565337/photos/photo-06.jpg',
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

  const catalogPaths = [
    '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
    '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
  ];

  const trackerPath = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
  const tracker = JSON.parse(readFileSync(trackerPath, 'utf8'));
  const now = new Date().toISOString();

  const uploadedBySlug = new Map();
  for (const spotConfig of SPOTS) {
    const uploadedUrls = [];
    const prefix = slugify(spotConfig.slug);
    for (const [index, filePath] of spotConfig.imagePaths.entries()) {
      uploadedUrls.push(
        await uploadImage(
          supabase,
          spotConfig.slug,
          prefix,
          index === 0 ? 'cover' : 'gallery',
          filePath,
          index + 1,
        ),
      );
    }
    uploadedBySlug.set(spotConfig.slug, uploadedUrls);
  }

  for (const catalogPath of catalogPaths) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    for (const spotConfig of SPOTS) {
      const spot = catalog.spots.find((entry) => entry.slug === spotConfig.slug);
      if (!spot) {
        throw new Error(`No se encontró ${spotConfig.slug} en ${catalogPath}`);
      }
      const uploadedUrls = uploadedBySlug.get(spotConfig.slug) ?? [];
      spot.cover_image_url = uploadedUrls[0] ?? '';
      spot.gallery_urls = uploadedUrls;
      spot.updated_at = now;
    }
    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }

  for (const spotConfig of SPOTS) {
    let entry = tracker.entries.find((item) => item.slug === spotConfig.slug);
    if (!entry) {
      entry = {
        slug: spotConfig.slug,
        name: spotConfig.name,
        instagram: spotConfig.instagram,
        status: 'incomplete',
        internalTag: spotConfig.internalTag,
        missingFields: [...spotConfig.missingFields],
        notes: [...spotConfig.notes],
        lastReviewedAt: now,
      };
      tracker.entries.push(entry);
      continue;
    }

    entry.instagram = entry.instagram || spotConfig.instagram;
    entry.status = 'incomplete';
    entry.internalTag = spotConfig.internalTag;
    entry.missingFields = spotConfig.missingFields;
    entry.notes = spotConfig.notes;
    entry.lastReviewedAt = now;
  }

  tracker.updatedAt = now;
  writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');

  console.log(
    JSON.stringify(
      Object.fromEntries(
        [...uploadedBySlug.entries()].map(([slug, urls]) => [slug, urls]),
      ),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

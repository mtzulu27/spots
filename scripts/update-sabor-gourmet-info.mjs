import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const SPOT_SLUG = 'sabor-gourmet';
const BRANCH_SLUG = 'sabor-gourmet-cali';
const REVIEWED_AT = new Date().toISOString();

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function upsertHours(rows, branchId, startId, specs) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const created = specs.map((spec, index) => ({
    id: startId + index,
    branch_id: branchId,
    day_of_week: spec.day,
    is_closed: spec.closed ?? false,
    open_time: spec.closed ? null : spec.open,
    close_time: spec.closed ? null : spec.close,
    split_open_time: null,
    split_close_time: null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

const HOURS_LABEL = 'Lun-Sáb 8:30 AM-9:00 PM · Dom 8:30 AM-2:00 PM';
const MENU_URL = 'https://menupp.co/saborgourmet';
const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=573167274367&text&type=phone_number&app_absent=0';
const PHONE = '3167274367';
const ADDRESS = 'Av. 9A Nte. #10N-34, Granada, Cali';
const DESCRIPTION =
  'Hecho con amor: un spot en Granada para comida, postres y café con plan de día a noche.';

const HOUR_SPECS = [
  { day: 1, open: '08:30:00', close: '21:00:00', sortOrder: 10 },
  { day: 2, open: '08:30:00', close: '21:00:00', sortOrder: 20 },
  { day: 3, open: '08:30:00', close: '21:00:00', sortOrder: 30 },
  { day: 4, open: '08:30:00', close: '21:00:00', sortOrder: 40 },
  { day: 5, open: '08:30:00', close: '21:00:00', sortOrder: 50 },
  { day: 6, open: '08:30:00', close: '21:00:00', sortOrder: 60 },
  { day: 0, open: '08:30:00', close: '14:00:00', sortOrder: 70 },
];

for (const catalogPath of CATALOG_PATHS) {
  const catalog = readJson(catalogPath);
  const spot = catalog.spots.find((entry) => entry.slug === SPOT_SLUG);
  const branch = catalog.branches.find((entry) => entry.slug === BRANCH_SLUG);

  if (!spot || !branch) {
    throw new Error(`No se encontró ${SPOT_SLUG} en ${catalogPath}`);
  }

  const nextHoursId =
    Math.max(
      0,
      ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
      ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
    ) + 1;

  // Preserve feed order by keeping timestamps intact.
  spot.name = 'Sabor Gourmet';
  spot.short_description = DESCRIPTION;
  spot.tags = ['comida', 'postres', 'cafe', 'granada'];
  spot.moods = ['casual', 'comer rico', 'cafe'];

  branch.address = ADDRESS;
  branch.neighborhood = 'Granada';
  branch.phone = PHONE;
  branch.whatsapp = WHATSAPP_URL;
  branch.menu_url = MENU_URL;
  branch.hours = HOURS_LABEL;

  catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId, HOUR_SPECS);
  catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId, HOUR_SPECS);

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
const entry = tracker.entries?.find((item) => item.slug === SPOT_SLUG);

if (entry) {
  entry.name = 'Sabor Gourmet';
  entry.instagram = 'https://www.instagram.com/saborgourmet16/';
  entry.status = 'incomplete';
  entry.internalTag = 'followup-menupp-shell-order-preserved';
  entry.missingFields = ['min_budget', 'max_budget', 'photos', 'coordinates'];
  entry.notes = [
    'Se corrigió el nombre visible a Sabor Gourmet y se mantuvo el slug existente.',
    'Se cargaron dirección, horario, teléfono, WhatsApp y menú desde la bio compartida por el usuario.',
    'El link de Menüpp quedó enlazado, pero desde este entorno solo devuelve el shell de la app y no permitió leer precios confiables.',
    'Se preservó el orden del feed manteniendo intactos created_at y updated_at del spot y su sede.',
  ];
  entry.lastReviewedAt = REVIEWED_AT;
}

tracker.updatedAt = REVIEWED_AT;
writeJson(TRACKER_PATH, tracker);

console.log(
  JSON.stringify(
    {
      slug: SPOT_SLUG,
      name: 'Sabor Gourmet',
      address: ADDRESS,
      hours: HOURS_LABEL,
      whatsapp: WHATSAPP_URL,
      menu_url: MENU_URL,
      preservedFeedOrder: true,
    },
    null,
    2,
  ),
);

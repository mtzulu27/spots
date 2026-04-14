import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const NOW = new Date().toISOString();
const MENU_URL =
  'https://menupp.co/aldeaasiatica/venue/cJmrnBbRFjYpXqOrbmvh/menu/4a3ed064-fbed-4a8c-877c-b61b585c25f3?category=rBxRY8gz6AOFDDfg4PJV';
const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=573126598939&text&type=phone_number&app_absent=0';
const PHONE = '+573126598939';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function upsertHours(rows, branchId, nextId, specs) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const created = specs.map((spec, index) => ({
    id: nextId + index,
    branch_id: branchId,
    day_of_week: spec.day,
    is_closed: false,
    open_time: spec.open,
    close_time: spec.close,
    split_open_time: null,
    split_close_time: null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

const BRANCH_CONFIG = {
  'baoku-parque-del-perro-cali': {
    address: 'Calle 3A #34-09, Parque del Perro, San Fernando, Cali',
    neighborhood: 'San Fernando',
    mall: 'Parque del Perro',
    hoursLabel:
      'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sáb 11:00 AM-11:00 PM',
    specs: [
      { day: 1, open: '11:00:00', close: '22:00:00', sortOrder: 10 },
      { day: 2, open: '11:00:00', close: '22:00:00', sortOrder: 20 },
      { day: 3, open: '11:00:00', close: '22:00:00', sortOrder: 30 },
      { day: 4, open: '11:00:00', close: '22:00:00', sortOrder: 40 },
      { day: 5, open: '11:00:00', close: '23:00:00', sortOrder: 50 },
      { day: 6, open: '11:00:00', close: '23:00:00', sortOrder: 60 },
      { day: 0, open: '11:00:00', close: '22:00:00', sortOrder: 70 },
    ],
  },
  'baoku-puerto-125-cali': {
    address: 'Cra 125 con Calle 16A, Pance, Local 5, Cali',
    neighborhood: 'Pance',
    mall: 'Puerto 125',
    hoursLabel:
      'Dom-Jue/Fest 11:00 AM-9:00 PM · Vie-Sáb 11:00 AM-10:00 PM',
    specs: [
      { day: 1, open: '11:00:00', close: '21:00:00', sortOrder: 10 },
      { day: 2, open: '11:00:00', close: '21:00:00', sortOrder: 20 },
      { day: 3, open: '11:00:00', close: '21:00:00', sortOrder: 30 },
      { day: 4, open: '11:00:00', close: '21:00:00', sortOrder: 40 },
      { day: 5, open: '11:00:00', close: '22:00:00', sortOrder: 50 },
      { day: 6, open: '11:00:00', close: '22:00:00', sortOrder: 60 },
      { day: 0, open: '11:00:00', close: '21:00:00', sortOrder: 70 },
    ],
  },
  'baoku-pacific-mall-cali': {
    address: 'Calle 36N #6A-65, 5to Piso, Local 505, Cali',
    neighborhood: '',
    mall: 'Pacific Center',
    hoursLabel:
      'Dom-Jue/Fest 11:00 AM-9:00 PM · Vie-Sáb 11:00 AM-10:00 PM',
    specs: [
      { day: 1, open: '11:00:00', close: '21:00:00', sortOrder: 10 },
      { day: 2, open: '11:00:00', close: '21:00:00', sortOrder: 20 },
      { day: 3, open: '11:00:00', close: '21:00:00', sortOrder: 30 },
      { day: 4, open: '11:00:00', close: '21:00:00', sortOrder: 40 },
      { day: 5, open: '11:00:00', close: '22:00:00', sortOrder: 50 },
      { day: 6, open: '11:00:00', close: '22:00:00', sortOrder: 60 },
      { day: 0, open: '11:00:00', close: '21:00:00', sortOrder: 70 },
    ],
  },
  'baoku-las-velas-cali': {
    address: 'Carrera 105 #15B-45, Local 1-4, Cali',
    neighborhood: 'Ciudad Jardín',
    mall: 'Las Velas',
    hoursLabel:
      'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sáb 11:00 AM-11:00 PM',
    specs: [
      { day: 1, open: '11:00:00', close: '22:00:00', sortOrder: 10 },
      { day: 2, open: '11:00:00', close: '22:00:00', sortOrder: 20 },
      { day: 3, open: '11:00:00', close: '22:00:00', sortOrder: 30 },
      { day: 4, open: '11:00:00', close: '22:00:00', sortOrder: 40 },
      { day: 5, open: '11:00:00', close: '23:00:00', sortOrder: 50 },
      { day: 6, open: '11:00:00', close: '23:00:00', sortOrder: 60 },
      { day: 0, open: '11:00:00', close: '22:00:00', sortOrder: 70 },
    ],
  },
  'baoku-granada-cali': {
    address: 'Avenida 9AN #15A-30, Granada, Cali',
    neighborhood: 'Granada',
    mall: '',
    hoursLabel:
      'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sáb 11:00 AM-11:00 PM',
    specs: [
      { day: 1, open: '11:00:00', close: '22:00:00', sortOrder: 10 },
      { day: 2, open: '11:00:00', close: '22:00:00', sortOrder: 20 },
      { day: 3, open: '11:00:00', close: '22:00:00', sortOrder: 30 },
      { day: 4, open: '11:00:00', close: '22:00:00', sortOrder: 40 },
      { day: 5, open: '11:00:00', close: '23:00:00', sortOrder: 50 },
      { day: 6, open: '11:00:00', close: '23:00:00', sortOrder: 60 },
      { day: 0, open: '11:00:00', close: '22:00:00', sortOrder: 70 },
    ],
  },
};

for (const catalogPath of CATALOG_PATHS) {
  const catalog = readJson(catalogPath);
  let nextHoursId =
    Math.max(
      0,
      ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
      ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
    ) + 1;

  const spot = catalog.spots.find((entry) => entry.slug === 'baoku');
  if (spot) {
    spot.updated_at = NOW;
  }

  for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot?.id && entry.is_active)) {
    const config = BRANCH_CONFIG[branch.slug];
    if (!config) continue;
    branch.address = config.address;
    branch.neighborhood = config.neighborhood;
    branch.mall = config.mall;
    branch.phone = PHONE;
    branch.whatsapp = WHATSAPP_URL;
    branch.menu_url = MENU_URL;
    branch.hours = config.hoursLabel;
    branch.instagram = 'https://www.instagram.com/baoku.co/';
    branch.updated_at = NOW;

    catalog.branchHours = upsertHours(catalog.branchHours, branch.id, nextHoursId, config.specs);
    catalog.hours = upsertHours(catalog.hours, branch.id, nextHoursId, config.specs);
    nextHoursId += config.specs.length;
  }

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
const entry = tracker.entries.find((item) => item.slug === 'baoku');
if (entry) {
  entry.internalTag = 'followup-hours-menu-whatsapp';
  entry.missingFields = (entry.missingFields ?? []).filter((field) => field !== 'hours_by_branch');
  entry.notes = [
    'Se cargaron horarios por sede usando las historias con direcciones de Aldea Asiática compartidas por el usuario.',
    'Se actualizó el menú a la URL específica de Baoku dentro de Menüpp.',
    'Se normalizó el WhatsApp al mismo número sin arrastrar el texto precargado de Fusion Wok.',
    ...((entry.notes ?? []).filter((note) => !note.toLowerCase().includes('horario') && !note.toLowerCase().includes('menú') && !note.toLowerCase().includes('whatsapp'))),
  ];
  entry.lastReviewedAt = NOW;
}
tracker.updatedAt = NOW;
writeJson(TRACKER_PATH, tracker);

console.log(
  JSON.stringify(
    {
      slug: 'baoku',
      menu_url: MENU_URL,
      whatsapp: WHATSAPP_URL,
      updatedAt: NOW,
    },
    null,
    2,
  ),
);

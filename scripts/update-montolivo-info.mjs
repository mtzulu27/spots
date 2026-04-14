import fs from 'node:fs';

const catalogPaths = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];
const trackerPath =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const now = new Date().toISOString();

const branchSeeds = [
  {
    id: 5194,
    slug: 'montolivo-jardin-plaza-cali',
    address: 'Carrera 98 #16-200, Centro Comercial Jardín Plaza, Local R13, Cali',
    neighborhood: 'Ciudad Jardín',
    mall: 'Jardín Plaza',
    sort_order: 10,
    latitude: 3.36702,
    longitude: -76.527525,
    phone: '3118290406 / 3135681956',
    hoursLabel: 'Lun-Dom 11:45:00-21:30:00',
    weeklyHours: [
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
      ['11:45:00', '21:30:00'],
    ],
  },
  {
    id: 5195,
    slug: 'montolivo-palmetto-cali',
    address: 'Calle 9 No. 48-81 / Carrera 49 No. 9-50, Centro Comercial Palmetto Plaza, Cali',
    neighborhood: 'San Fernando Nuevo',
    mall: 'Palmetto Plaza',
    sort_order: 20,
    latitude: 3.39872,
    longitude: -76.513289,
    phone: '3118290406 / 3135681956',
    hoursLabel: 'Lun-Mie 11:45:00-21:00:00 · Jue-Sab 11:45:00-22:00:00 · Dom 11:45:00-21:00:00',
    weeklyHours: [
      ['11:45:00', '21:00:00'],
      ['11:45:00', '21:00:00'],
      ['11:45:00', '21:00:00'],
      ['11:45:00', '22:00:00'],
      ['11:45:00', '22:00:00'],
      ['11:45:00', '22:00:00'],
      ['11:45:00', '21:00:00'],
    ],
  },
  {
    id: 5196,
    slug: 'montolivo-unico-outlet-cali',
    address: 'Calle 52 #3-29, Centro Comercial Unico Outlet, Cali',
    neighborhood: '',
    mall: 'Único Outlet',
    sort_order: 30,
    latitude: null,
    longitude: null,
    phone: '',
    hoursLabel: '',
    weeklyHours: [],
  },
  {
    id: 5197,
    slug: 'montolivo-mallplaza-cali',
    address: 'Carrera 100 #5-169, Mallplaza Cali, Cali',
    neighborhood: 'Ciudad Jardín',
    mall: 'Mallplaza Cali',
    sort_order: 40,
    latitude: null,
    longitude: null,
    phone: '',
    hoursLabel: '',
    weeklyHours: [],
  },
];

function buildHours(branchId, weeklyHours) {
  const rows = [];
  let nextId = buildHours.nextId;
  for (let day = 1; day <= weeklyHours.length; day += 1) {
    const [openTime, closeTime] = weeklyHours[day - 1];
    rows.push({
      id: nextId,
      branch_id: branchId,
      day_of_week: day,
      is_closed: false,
      open_time: openTime,
      close_time: closeTime,
      split_open_time: null,
      split_close_time: null,
      sort_order: day * 10,
    });
    nextId += 1;
  }
  buildHours.nextId = nextId;
  return rows;
}

function updateCatalog(path) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((item) => item.slug === 'montolivo');
  if (!spot) throw new Error(`No se encontró spot montolivo en ${path}`);

  const oldBranchIds = catalog.branches
    .filter((branch) => branch.spot_id === spot.id)
    .map((branch) => branch.id);

  catalog.branches = catalog.branches.filter((branch) => branch.spot_id !== spot.id);
  catalog.branchHours = catalog.branchHours.filter(
    (row) => !oldBranchIds.includes(row.branch_id)
  );

  buildHours.nextId =
    Math.max(0, ...catalog.branchHours.map((row) => row.id)) + 1;

  const branches = branchSeeds.map((seed) => ({
    id: seed.id,
    spot_id: spot.id,
    slug: seed.slug,
    address: seed.address,
    neighborhood: seed.neighborhood,
    mall: seed.mall,
    max_people: 4,
    phone: seed.phone,
    whatsapp: '',
    menu_url: 'https://montolivorestaurante.com/carta-menu/',
    latitude: seed.latitude,
    longitude: seed.longitude,
    created_at: spot.created_at,
    updated_at: now,
    hours: seed.hoursLabel,
    holiday_mode: 'inherit',
    holiday_open_time: null,
    holiday_close_time: null,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    min_budget: 32000,
    max_budget: 55000,
    instagram: 'https://www.instagram.com/montolivorestaurante/',
    is_active: true,
    sort_order: seed.sort_order,
  }));

  const branchHours = branches.flatMap((branch, index) => {
    const weeklyHours = branchSeeds[index].weeklyHours;
    return weeklyHours.length > 0 ? buildHours(branch.id, weeklyHours) : [];
  });

  catalog.branches.push(...branches);
  catalog.branchHours.push(...branchHours);

  spot.short_description =
    'Una opción casual de pasta y bowls con varios puntos en Cali, útil para un plan de comida rápida pero bien resuelta dentro de centros comerciales.';
  spot.updated_at = now;

  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}

function updateTracker() {
  const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  const entry = tracker.entries.find((item) => item.slug === 'montolivo');
  if (!entry) throw new Error('No se encontró entrada de tracker para montolivo');

  entry.status = 'incomplete';
  entry.internalTag = 'followup-unconfirmed-branches-whatsapp';
  entry.missingFields = ['whatsapp', 'hours_by_branch_unconfirmed', 'coordinates_unconfirmed'];
  entry.notes = [
    'El menú general quedó corregido al link oficial de carta: https://montolivorestaurante.com/carta-menu/',
    'El endpoint oficial de puntos físicos confirmó con horario, teléfono y coordenadas las sedes de Jardín Plaza y Palmetto Plaza.',
    'Único Outlet y Mallplaza Cali siguen visibles en el highlight de IG, pero no aparecieron en el localizador oficial del sitio; por ahora quedan publicadas con dirección base, sin horarios ni coordenadas confirmadas.',
  ];
  entry.lastReviewedAt = now;

  fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
}

for (const path of catalogPaths) updateCatalog(path);
updateTracker();

console.log('Montolivo actualizado en catálogo y tracker.');
